import { BrowserWindow, ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import iconv from 'iconv-lite';
import QRCode from 'qrcode';

const execAsync = promisify(exec);

const RECEIPT_CUT_MARKER = '<<CUT_RECEIPT>>';

// Cache de impressoras conectadas
let cachedPrinters: any[] = [];

type PaperSizeOption = '80mm' | '58mm' | 'a4' | 'custom';

type PrinterStatusText = 'online' | 'offline' | 'error' | 'warning' | 'unknown';

interface PrintJobOptions {
  printerName?: string | null;
  port?: string | null;
  paperSize?: PaperSizeOption;
  customPaperWidth?: number | null;
  autoCut?: boolean;
}

interface PrintContentPayload {
  content: string;
  options?: PrintJobOptions;
}

interface NormalizedContent {
  text: string;
  compatText: string;
  hasExtendedCharacters: boolean;
}

const ESC = 0x1b;
const GS = 0x1d;
const DEFAULT_CODE_PAGE = 19; // ESC/POS: Code page 19 = CP858 (Português)
const DEFAULT_SERIAL_BAUD = 9600;
const NEW_LINE = Buffer.from('\n', 'ascii');
const PRINT_MARKER_REGEX = /<<(?:ESC_POS_BINARY:([A-Za-z0-9+/=]+)|NFC_E_QR:([^>\n]+))>>/g;

type ThermalPrinterModule = typeof import('node-thermal-printer');

let thermalPrinterModule: ThermalPrinterModule | null = null;
let thermalPrinterLoadError: Error | null = null;

async function loadThermalPrinterModule(): Promise<ThermalPrinterModule> {
  if (thermalPrinterLoadError) {
    throw thermalPrinterLoadError;
  }

  if (!thermalPrinterModule) {
    try {
      thermalPrinterModule = await import('node-thermal-printer');
    } catch (error) {
      thermalPrinterLoadError = error instanceof Error ? error : new Error(String(error));
      console.error('Módulo node-thermal-printer indisponível:', thermalPrinterLoadError.message);
      throw thermalPrinterLoadError;
    }
  }

  return thermalPrinterModule;
}

type EscPosSegmentPart =
  | { kind: 'text'; value: string }
  | { kind: 'binary'; value: Buffer };

function buildNativeQrEscPos(url: string, moduleSize = 2): Buffer {
  const data = Buffer.from(url, 'ascii');
  // Módulo 2 — QR compacto alinhado à fonte menor do cupom
  const size = Math.min(8, Math.max(2, moduleSize));
  const commands: Buffer[] = [
    Buffer.from([0x1b, 0x61, 0x01]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]),
  ];

  const storeLen = data.length + 3;
  const storeCmd = Buffer.alloc(8 + data.length);
  storeCmd[0] = 0x1d;
  storeCmd[1] = 0x28;
  storeCmd[2] = 0x6b;
  storeCmd[3] = storeLen & 0xff;
  storeCmd[4] = (storeLen >> 8) & 0xff;
  storeCmd[5] = 0x31;
  storeCmd[6] = 0x50;
  storeCmd[7] = 0x30;
  data.copy(storeCmd, 8);
  commands.push(storeCmd);
  commands.push(Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));
  commands.push(Buffer.from([0x1b, 0x61, 0x00]));
  commands.push(Buffer.from('\n', 'utf8'));

  return Buffer.concat(commands);
}

function stripPrintMarkersForDisplay(content: string): string {
  return content
    .replace(/<<ESC_POS_BINARY:[A-Za-z0-9+/=]+>>/g, '')
    .replace(/<<NFC_E_QR:[^>\n]+>>/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

function decodePrintMarkerMatch(match: RegExpExecArray): Buffer | null {
  if (match[1]) {
    try {
      return Buffer.from(match[1], 'base64');
    } catch (error) {
      console.warn('Falha ao decodificar ESC_POS_BINARY:', error);
      return null;
    }
  }

  if (match[2]) {
    return buildNativeQrEscPos(match[2]);
  }

  return null;
}

function parseEscPosSegment(segment: string): EscPosSegmentPart[] {
  const markerRegex = new RegExp(PRINT_MARKER_REGEX.source, 'g');
  if (!markerRegex.test(segment)) {
    return [{ kind: 'text', value: segment }];
  }

  markerRegex.lastIndex = 0;
  const parts: EscPosSegmentPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(segment)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'text', value: segment.substring(lastIndex, match.index) });
    }

    const binary = decodePrintMarkerMatch(match);
    if (binary) {
      parts.push({ kind: 'binary', value: binary });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < segment.length) {
    parts.push({ kind: 'text', value: segment.substring(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ kind: 'text', value: segment }];
}

function appendEscPosSegmentBuffers(buffers: Buffer[], segment: string, columns: number): void {
  const parts = parseEscPosSegment(segment);

  for (const part of parts) {
    if (part.kind === 'binary') {
      buffers.push(part.value);
      continue;
    }

    const lines = formatContentForThermal(part.value, columns);
    for (const line of lines) {
      const encodedLine = encodeForEscPos(line);
      if (encodedLine.length > 0) {
        buffers.push(encodedLine);
      }
      buffers.push(NEW_LINE);
    }
  }
}

function normalizePrintableContent(content: string | null | undefined): NormalizedContent {
  const normalized = (content ?? '')
    .replace(/\r\n?/g, '\n')
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');

  const compatText = normalized.replace(/[^\u0000-\u00FF]/g, '?');
  const hasExtendedCharacters = normalized !== compatText;

  return {
    text: normalized,
    compatText,
    hasExtendedCharacters,
  };
}

function ensureTrailingNewlines(value: string, minNewlines = 3): string {
  const match = value.match(/\n*$/);
  const existingNewlines = match ? match[0].length : 0;
  if (existingNewlines >= minNewlines) {
    return value;
  }
  return value + '\n'.repeat(minNewlines - existingNewlines);
}

function splitReceiptCopies(content: string): string[] {
  return content
    .split(RECEIPT_CUT_MARKER)
    .map((segment) => segment.replace(/^\n+/, '').trimEnd())
    .filter((segment) => segment.trim().length > 0)
    .map((segment) => ensureTrailingNewlines(segment));
}

function encodeForEscPos(text: string): Buffer {
  const encodings = ['cp858', 'cp850', 'windows1252', 'latin1'];

  for (const encoding of encodings) {
    try {
      if (encoding === 'latin1') {
        return Buffer.from(text, 'latin1');
      }

      if (iconv.encodingExists(encoding)) {
        return iconv.encode(text, encoding);
      }
    } catch (error) {
      console.warn(`Falha ao codificar texto usando ${encoding}:`, error);
    }
  }

  return Buffer.from(text, 'utf8');
}

function buildInitializationBuffer(): Buffer {
  // ESC @ (reset) + ESC t 19 (CP858) + ESC M 1 (Fonte B — menor) + GS ! 0 (sem magnificação)
  return Buffer.from([
    ESC, 0x40,
    ESC, 0x74, DEFAULT_CODE_PAGE,
    ESC, 0x4d, 0x01,
    GS, 0x21, 0x00,
  ]);
}

function isSerialPort(port: string | null | undefined): boolean {
  if (!port?.trim()) {
    return false;
  }
  const normalized = port.trim().toLowerCase().replace(/:$/, '');
  // Windows USB001/USB002 são portas do spooler, NÃO serial — SerialPort.Open falha.
  // Serial real: COMx (Windows), /dev/tty* (Linux/mac), LPT (paralela).
  return (
    /^com\d+$/i.test(normalized) ||
    normalized.startsWith('/dev/tty') ||
    normalized.startsWith('lpt')
  );
}

async function resolvePrinterPort(printerName: string, options?: PrintJobOptions): Promise<string | null> {
  const configured = options?.port?.trim();
  if (configured) {
    return configured;
  }

  const cached = cachedPrinters.find((printer) => printer?.name === printerName)?.port;
  if (typeof cached === 'string' && cached.trim()) {
    return cached.trim();
  }

  const printers = await listPrinters();
  cachedPrinters = printers;
  const found = printers.find((printer) => printer?.name === printerName);
  return typeof found?.port === 'string' && found.port.trim() ? found.port.trim() : null;
}

function buildSegmentEscPosBuffer(
  segment: string,
  columns: number,
  isLast: boolean,
  options?: PrintJobOptions,
): Buffer {
  const buffers: Buffer[] = [buildInitializationBuffer()];
  appendEscPosSegmentBuffers(buffers, segment, columns);
  buffers.push(NEW_LINE, NEW_LINE, NEW_LINE);

  if (options?.autoCut !== false || !isLast) {
    buffers.push(Buffer.from([GS, 0x56, 0x00]));
  }

  return Buffer.concat(buffers);
}

async function writeRawToSerialPort(
  port: string,
  data: Buffer,
  baudRate = DEFAULT_SERIAL_BAUD,
): Promise<void> {
  if (process.platform === 'win32') {
    await writeRawToSerialPortWindows(port, data, baudRate);
    return;
  }

  const tempFile = path.join(os.tmpdir(), `montshop-escpos-${Date.now()}.bin`);
  fs.writeFileSync(tempFile, data);
  try {
    await execAsync(`lp -o raw '${tempFile.replace(/'/g, "'\\''")}'`);
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // ignore
    }
  }
}

async function writeRawToSerialPortWindows(
  port: string,
  data: Buffer,
  baudRate: number,
): Promise<void> {
  const comPort = port.trim().replace(/:$/, '');
  const tempFile = path.join(os.tmpdir(), `montshop-escpos-${Date.now()}.bin`);
  fs.writeFileSync(tempFile, data);

  const filePathPs = tempFile.replace(/\\/g, '/').replace(/'/g, "''");
  const portPs = comPort.replace(/'/g, "''");
  const ps = [
    `$portName='${portPs}'`,
    `$filePath='${filePathPs}'`,
    '$bytes=[System.IO.File]::ReadAllBytes($filePath)',
    '$sp=New-Object System.IO.Ports.SerialPort $portName,' + baudRate + ',([System.IO.Ports.Parity]::None),8,([System.IO.Ports.StopBits]::One)',
    '$sp.WriteTimeout=10000',
    'try { $sp.Open(); $sp.Write($bytes,0,$bytes.Length); Start-Sleep -Milliseconds 300 } finally { if ($sp.IsOpen) { $sp.Close() }; $sp.Dispose() }',
  ].join('; ');

  try {
    await execAsync(`powershell.exe -NoProfile -NonInteractive -Command "${ps}"`);
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // ignore
    }
  }
}

/**
 * Imprime via porta serial (COM/USB) — evita corrupção do spooler Windows.
 * Necessário para QR Code ESC/POS em impressoras como Bematech MP-4200.
 */
async function printWithSerialPort(
  printerName: string,
  content: string,
  options?: PrintJobOptions,
): Promise<{ success: boolean; error?: string }> {
  try {
    const port = await resolvePrinterPort(printerName, options);
    if (!port || !isSerialPort(port)) {
      return { success: false, error: 'Porta serial não identificada para a impressora' };
    }

    const columns = normalizePaperWidth(options);
    const segments = splitReceiptCopies(content);
    const parts = segments.length > 0 ? segments : [ensureTrailingNewlines(content)];

    if (parts.length > 2) {
      console.warn(`Número de partes excedeu 2 (${parts.length}), usando apenas as 2 primeiras`);
      parts.splice(2);
    }

    for (let index = 0; index < parts.length; index++) {
      const segment = parts[index];
      const isLast = index === parts.length - 1;
      const buffer = buildSegmentEscPosBuffer(segment, columns, isLast, options);
      await writeRawToSerialPort(port, buffer);

      if (!isLast && parts.length === 2) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao imprimir via porta serial:', error);
    return { success: false, error: error?.message || 'Erro na impressão serial' };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getHtmlPaperStyle(paperSize: PaperSizeOption = '80mm', customPaperWidth?: number | null) {
  switch (paperSize) {
    case '58mm':
      return {
        pageSize: '58mm auto',
        padding: '4mm',
        width: '50mm',
      };
    case 'a4':
      return {
        pageSize: '210mm 297mm',
        padding: '12mm',
        width: '180mm',
      };
    case 'custom': {
      const columns = customPaperWidth ?? 48;
      const widthMm = Math.max(45, Math.min(120, Math.round(columns * 1.7)));
      return {
        pageSize: `${widthMm}mm auto`,
        padding: '4mm',
        width: `${Math.max(widthMm - 8, 40)}mm`,
      };
    }
    case '80mm':
    default:
      return {
        pageSize: '80mm auto',
        padding: '4mm',
        width: '72mm',
      };
  }
}

async function buildHtmlDocument(content: string, options?: PrintJobOptions): Promise<string> {
  const paperStyle = getHtmlPaperStyle(options?.paperSize, options?.customPaperWidth);
  const copies = splitReceiptCopies(content);
  const parts = copies.length > 0 ? copies : [content];

  const htmlCopies: string[] = [];
  for (const copy of parts) {
    htmlCopies.push(`<div class="copy">${await enrichHtmlWithQrMarkers(copy)}</div>`);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Impressão Montshop</title>
        <style>
          @media print {
            @page {
              size: ${paperStyle.pageSize};
              margin: 0;
            }
            body {
              margin: 0;
              padding: ${paperStyle.padding};
              font-family: 'Courier New', monospace;
            font-size: 7px;
            line-height: 1.0;
            width: ${paperStyle.width};
            }
          }
          body {
            margin: 0;
            padding: ${paperStyle.padding};
            font-family: 'Courier New', monospace;
            font-size: 7px;
            line-height: 1.0;
            width: ${paperStyle.width};
            background: white;
          }
          .container {
            display: flex;
            flex-direction: column;
            gap: 12mm;
          }
          .copy {
            white-space: pre-wrap;
            word-break: break-word;
            margin: 0;
            font-family: 'Courier New', monospace;
            font-size: 7px;
            line-height: 1.0;
          }
          .copy:not(:last-child) {
            page-break-after: always;
          }
          .qr-wrap {
            text-align: center;
            margin: 8px 0;
            width: 100%;
          }
          .qr-wrap img {
            display: block;
            margin: 0 auto;
            width: 80px;
            height: 80px;
            image-rendering: pixelated;
          }
        </style>
      </head>
      <body>
        <div class="container">${htmlCopies.join('')}</div>
      </body>
    </html>
  `;
}

/**
 * Converte <<NFC_E_QR:url>> em <img> PNG para fallback HTML no Windows
 * (quando o driver USB/GDI não aceita ESC/POS raw).
 */
async function enrichHtmlWithQrMarkers(content: string): Promise<string> {
  const markerRegex = new RegExp(PRINT_MARKER_REGEX.source, 'g');
  const chunks: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const escapeText = (text: string) =>
    escapeHtml(text).replace(/ /g, '&nbsp;').replace(/\n/g, '<br/>');

  while ((match = markerRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      chunks.push(escapeText(content.substring(lastIndex, match.index)));
    }

    const qrUrl = match[2]?.trim();
    if (qrUrl) {
      try {
        const dataUrl = await QRCode.toDataURL(qrUrl, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 80,
          type: 'image/png',
        });
        chunks.push(
          `<div class="qr-wrap"><img src="${dataUrl}" alt="QR Code NFC-e" width="80" height="80" /></div>`,
        );
      } catch (error) {
        console.warn('Falha ao gerar QR Code HTML:', error);
        chunks.push(escapeText(qrUrl));
      }
    }
    // ESC_POS_BINARY: omitir no HTML (sem decodificador visual)

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    chunks.push(escapeText(content.substring(lastIndex)));
  }

  return chunks.join('');
}

async function printWithHtmlRenderer(content: string, options?: PrintJobOptions): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    let window: BrowserWindow | null = null;
    let resolved = false;

    const finish = (result: { success: boolean; error?: string }) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
      if (window && !window.isDestroyed()) {
        window.close();
      }
    };

    void (async () => {
      try {
        const html = await buildHtmlDocument(content, options);
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

        window = new BrowserWindow({
          width: 480,
          height: 720,
          show: false,
          webPreferences: {
            sandbox: true,
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        const printerName = options?.printerName || undefined;

        window.webContents.on('did-finish-load', () => {
          setTimeout(() => {
            if (!window || window.isDestroyed()) {
              finish({ success: false, error: 'Janela de impressão fechada prematuramente' });
              return;
            }

            window.webContents
              .print(
                {
                  silent: true,
                  printBackground: true,
                  deviceName: printerName,
                },
                (success, failureReason) => {
                  if (success) {
                    finish({ success: true });
                  } else {
                    finish({
                      success: false,
                      error: failureReason || 'Falha na impressão HTML',
                    });
                  }
                },
              );
          }, 400);
        });

        window.webContents.on('did-fail-load', (_e, _code, desc) => {
          finish({ success: false, error: desc || 'Falha ao carregar HTML de impressão' });
        });

        await window.loadURL(dataUrl);
      } catch (error: any) {
        finish({ success: false, error: error?.message || 'Erro no renderer HTML' });
      }
    })();
  });
}

/**
 * Lista impressoras disponíveis no sistema
 */
async function listPrinters(): Promise<any[]> {
  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows: usar PowerShell para listar impressoras
      const command = `powershell.exe -Command "Get-Printer | Select-Object Name, PrinterStatus, DriverName, PortName, Default | ConvertTo-Json"`;
      const { stdout } = await execAsync(command);
      if (!stdout) {
        return [];
      }

      const printers = JSON.parse(stdout);
      const printerArray = Array.isArray(printers) ? printers : [printers];
      
      return printerArray
        .filter(Boolean)
        .map((p: any) => {
          const statusCode = typeof p?.PrinterStatus === 'number' ? p.PrinterStatus : undefined;
          const status = mapPrinterStatus(statusCode);
          return {
            name: p?.Name,
            status,
            driver: p?.DriverName,
            port: p?.PortName,
            isDefault: Boolean(p?.Default),
            isConnected: status === 'online',
          };
        })
        .filter((printer: any) => printer.name);
    } else if (platform === 'darwin') {
      // macOS: usar lpstat
      const { stdout } = await execAsync('lpstat -p');
      const lines = stdout.split('\n').filter((l: string) => l.trim());
      return lines
        .map((line: string) => {
          const match = line.match(/printer (\S+)/);
          return match
            ? {
                name: match[1],
                status: 'online',
                driver: 'Unknown',
                port: 'Unknown',
                isDefault: false,
                isConnected: true,
              }
            : null;
        })
        .filter(Boolean) as any[];
    } else {
      // Linux: usar lpstat
      const { stdout } = await execAsync('lpstat -p');
      const lines = stdout.split('\n').filter((l: string) => l.trim());
      return lines
        .map((line: string) => {
          const match = line.match(/printer (\S+)/);
          return match
            ? {
                name: match[1],
                status: 'online',
                driver: 'Unknown',
                port: 'Unknown',
                isDefault: false,
                isConnected: true,
              }
            : null;
        })
        .filter(Boolean) as any[];
    }
  } catch (error) {
    console.error('Erro ao listar impressoras:', error);
    return [];
  }
}

/**
 * Encontra impressora padrão do sistema
 */
async function getDefaultPrinter(): Promise<string | null> {
  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      const command = `powershell.exe -Command "(Get-Printer | Where-Object {$_.Default -eq $true}).Name"`;
      const { stdout } = await execAsync(command);
      const printerName = stdout?.trim();
      return printerName || null;
    } else {
      const { stdout } = await execAsync('lpstat -d');
      const match = stdout.match(/system default destination: (.+)/);
      return match ? match[1] : null;
    }
  } catch (error) {
    console.error('Erro ao obter impressora padrão:', error);
    return null;
  }
}

/**
 * Determina largura em colunas para impressão térmica
 */
function normalizePaperWidth(options?: PrintJobOptions): number {
  const paperSize = options?.paperSize ?? '80mm';

  switch (paperSize) {
    case '58mm':
      return 32;
    case 'a4':
      return 80;
    case 'custom': {
      const width = options?.customPaperWidth ?? 48;
      return Math.max(16, Math.min(128, Math.round(width)));
    }
    case '80mm':
    default:
      return 48;
  }
}

/**
 * Quebra linhas longas respeitando a largura da impressora
 */
function formatContentForThermal(content: string, columns: number): string[] {
  const sanitizedColumns = Math.max(16, Math.min(128, columns || 48));
  const lines: string[] = [];

  content.split('\n').forEach((rawLine) => {
    let line = rawLine ?? '';
    if (line.length <= sanitizedColumns) {
      lines.push(line);
      return;
    }

    while (line.length > sanitizedColumns) {
      lines.push(line.slice(0, sanitizedColumns));
      line = line.slice(sanitizedColumns);
    }

    if (line.length > 0) {
      lines.push(line);
    }
  });

  return lines;
}

/**
 * Resolve interface utilizada para impressão térmica
 */
function resolveThermalInterface(printerName: string, options?: PrintJobOptions): string {
  const port = options?.port?.trim();
  if (!port) {
    return `printer:${printerName}`;
  }

  const portLower = port.toLowerCase();
  if (
    portLower.startsWith('tcp://') ||
    portLower.startsWith('http://') ||
    portLower.startsWith('https://') ||
    portLower.startsWith('socket://')
  ) {
    return port;
  }

  // COM/tty/LPT: interface direta. USB001 no Windows é spooler — usar nome da impressora.
  if (
    /^com\d+$/i.test(portLower.replace(/:$/, '')) ||
    portLower.startsWith('/dev/tty') ||
    portLower.startsWith('lpt')
  ) {
    return port;
  }

  return `printer:${printerName}`;
}

/**
 * Converte código de status em texto amigável
 */
function mapPrinterStatus(status?: number): PrinterStatusText {
  if (status === undefined || status === null) {
    return 'unknown';
  }

  switch (status) {
    case 0:
    case 9:
    case 10:
    case 11:
    case 14:
    case 15:
    case 16:
      return 'online';
    case 1:
    case 4:
    case 5:
    case 6:
    case 7:
    case 17:
    case 18:
      return 'warning';
    case 2:
    case 20:
    case 21:
      return 'error';
    case 8:
      return 'offline';
    default:
      return 'unknown';
  }
}

/**
 * Imprime conteúdo usando node-thermal-printer (suporta ESC/POS)
 */
async function printWithThermalPrinter(
  printerName: string,
  content: string,
  options?: PrintJobOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const { default: ThermalPrinter, PrinterTypes } = await loadThermalPrinterModule();
    const interfaceTarget = resolveThermalInterface(printerName, options);
    const columns = normalizePaperWidth(options);
    const segments = splitReceiptCopies(content);
    const parts = segments.length > 0 ? segments : [ensureTrailingNewlines(content)];

    // Para vendas a prazo, garantir que temos exatamente 2 partes (loja e cliente)
    if (parts.length > 2) {
      console.warn(`Número de partes excedeu 2 (${parts.length}), usando apenas as 2 primeiras`);
      parts.splice(2);
    }

    // Função auxiliar para imprimir um segmento
    const printSegment = async (segment: string, isLast: boolean) => {
      const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: interfaceTarget,
        removeSpecialCharacters: false,
        options: {
          timeout: 5000,
        },
      });

      const initBuffer = buildInitializationBuffer();

      printer.raw(initBuffer); // Reset e define code page CP858
      printer.alignLeft();

      const parts = parseEscPosSegment(segment);
      for (const part of parts) {
        if (part.kind === 'binary') {
          printer.raw(part.value);
          continue;
        }

        const lines = formatContentForThermal(part.value, columns);
        for (const line of lines) {
          const encodedLine = encodeForEscPos(line);
          if (encodedLine.length > 0) {
            printer.raw(encodedLine);
          }
          printer.raw(NEW_LINE);
        }
      }

      printer.raw(NEW_LINE);
      printer.raw(NEW_LINE);
      printer.raw(NEW_LINE);

      if (options?.autoCut !== false || !isLast) {
        printer.cut();
      }

      const executed = await printer.execute();
      if (!executed) {
        throw new Error('Falha ao enviar dados para a impressora térmica');
      }
    };

    // Imprimir cada parte com intervalo de 3 segundos entre elas (apenas para vendas a prazo com 2 partes)
    for (let index = 0; index < parts.length; index++) {
      const segment = parts[index];
      const isLast = index === parts.length - 1;
      
      await printSegment(segment, isLast);

      // Adicionar intervalo de 3 segundos entre impressões (apenas se não for a última e houver 2 partes)
      if (!isLast && parts.length === 2) {
        console.log(`Aguardando 3 segundos antes de imprimir a próxima via...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao imprimir com thermal printer:', error);
    return { success: false, error: error?.message || 'Erro desconhecido ao imprimir' };
  }
}

/**
 * Envia arquivo RAW para impressora Windows via cópia binária no share local.
 * Preserva comandos ESC/POS (QR Code) melhor que Out-Printer/GDI.
 */
async function printRawFileWindows(tempFile: string, printerName: string): Promise<boolean> {
  const filePathPs = tempFile.replace(/'/g, "''");
  const printerPs = printerName.replace(/'/g, "''");
  const ps = [
    `$ErrorActionPreference='Stop'`,
    `$src='${filePathPs}'`,
    `$printer='${printerPs}'`,
    // Tenta share UNC localhost; se a impressora não estiver compartilhada, falha e retorna false
    `$dest=('\\\\localhost\\' + $printer)`,
    'cmd /c copy /b `"$src`" `"$dest`"',
  ].join('; ');

  try {
    await execAsync(`powershell.exe -NoProfile -NonInteractive -Command "${ps}"`);
    return true;
  } catch (error: any) {
    console.warn(
      `RAW copy Windows falhou (${printerName}): ${error?.message || error}. Tentando fallback.`,
    );
    return false;
  }
}

/**
 * Imprime usando comandos do sistema operacional (fallback universal)
 */
async function printWithSystemPrinter(
  printerName: string,
  content: string,
  options?: PrintJobOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const platform = process.platform;
    const shouldAutoCut =
      options?.autoCut !== false && (options?.paperSize ?? '80mm') !== 'a4';

    const segments = splitReceiptCopies(content);
    const parts = segments.length > 0 ? segments : [ensureTrailingNewlines(content)];

    // Para vendas a prazo, garantir que temos exatamente 2 partes (loja e cliente)
    if (parts.length > 2) {
      console.warn(`Número de partes excedeu 2 (${parts.length}), usando apenas as 2 primeiras`);
      parts.splice(2);
    }

    const initBuffer = buildInitializationBuffer();
    const newlineBuffer = encodeForEscPos('\n\n\n');
    const cutFull = Buffer.from([GS, 0x56, 0x00]); // GS V 0 -> corte total

    // Função auxiliar para imprimir um segmento
    const printSegment = async (segment: string, isLast: boolean) => {
      const tempFile = path.join(os.tmpdir(), `print-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`);
      
      const buffers: Buffer[] = [];
      buffers.push(initBuffer);
      appendEscPosSegmentBuffers(buffers, segment, normalizePaperWidth(options));
      buffers.push(newlineBuffer);

      if (shouldAutoCut || !isLast) {
        buffers.push(cutFull);
      }

      const combinedBuffer = Buffer.concat(buffers);
      fs.writeFileSync(tempFile, combinedBuffer);

      // Sempre o nome da impressora no spooler Windows — USB001/COM não funciona com Out-Printer.
      const target = printerName;

      try {
        if (platform === 'win32') {
          // Preferência: RAW via share (preserva ESC/POS/QR). Se falhar, propaga erro
          // para o performPrintJob cair no fallback HTML (que renderiza o QR em PNG).
          const shareOk = await printRawFileWindows(tempFile, printerName);
          if (!shareOk) {
            throw new Error(
              'Não foi possível enviar RAW à impressora no Windows. ' +
                'Compartilhe a impressora ou use driver ESC/POS / porta COM.',
            );
          }
        } else if (platform === 'darwin') {
          const command = `lp -d "${target}" -o raw "${tempFile}"`;
          await execAsync(command);
        } else {
          const command = `lp -d "${target}" -o raw "${tempFile}"`;
          await execAsync(command);
        }
      } finally {
        // Remover arquivo temporário após um delay
        setTimeout(() => {
          try {
            fs.unlinkSync(tempFile);
          } catch (unlinkError) {
            console.warn('Não foi possível remover arquivo temporário de impressão:', unlinkError);
          }
        }, 5000);
      }
    };

    // Imprimir cada parte com intervalo de 3 segundos entre elas (apenas para vendas a prazo com 2 partes)
    for (let index = 0; index < parts.length; index++) {
      const segment = parts[index];
      const isLast = index === parts.length - 1;
      
      await printSegment(segment, isLast);

      // Adicionar intervalo de 3 segundos entre impressões (apenas se não for a última e houver 2 partes)
      if (!isLast && parts.length === 2) {
        console.log(`Aguardando 3 segundos antes de imprimir a próxima via...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao imprimir com sistema:', error);
    return { success: false, error: error?.message || 'Erro ao imprimir' };
  }
}

/**
 * Função principal de impressão que tenta múltiplos métodos
 */
async function performPrintJob(content: string, options?: PrintJobOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const normalized = normalizePrintableContent(content);
    let printerName = options?.printerName ?? null;

    if (!printerName) {
      printerName = await getDefaultPrinter();
    }

    if (!printerName) {
      return { success: false, error: 'Nenhuma impressora encontrada ou configurada' };
    }

    const resolvedPort = await resolvePrinterPort(printerName, options);
    const jobOptions: PrintJobOptions = {
      ...options,
      printerName,
      port: resolvedPort ?? options?.port ?? null,
    };

    const hasThermalMarkers = PRINT_MARKER_REGEX.test(content);
    PRINT_MARKER_REGEX.lastIndex = 0;
    const preferEscPos = isSerialPort(jobOptions.port) || hasThermalMarkers;

    if (preferEscPos) {
      if (isSerialPort(jobOptions.port)) {
        const serialResult = await printWithSerialPort(printerName, content, jobOptions);
        if (serialResult.success) {
          return serialResult;
        }
        console.warn('Impressão serial falhou, tentando métodos alternativos.', serialResult.error);
      }

      const thermalResult = await printWithThermalPrinter(printerName, content, jobOptions);
      if (thermalResult.success) {
        return thermalResult;
      }

      const systemResult = await printWithSystemPrinter(printerName, content, jobOptions);
      if (systemResult.success) {
        return systemResult;
      }
    } else if (!normalized.hasExtendedCharacters) {
      const thermalResult = await printWithThermalPrinter(printerName, content, jobOptions);
      if (thermalResult.success) {
        return thermalResult;
      }

      const systemResult = await printWithSystemPrinter(printerName, content, jobOptions);
      if (systemResult.success) {
        return systemResult;
      }
    }

    console.warn('Impressão ESC/POS indisponível, utilizando fallback HTML com QR Code.');
    const htmlResult = await printWithHtmlRenderer(normalized.text, jobOptions);
    if (htmlResult.success) {
      return htmlResult;
    }

    console.warn('Impressão HTML falhou, utilizando versão reduzida em Latin-1.', htmlResult.error);
    return await printWithSystemPrinter(printerName, content, jobOptions);
  } catch (error: any) {
    console.error('Erro na impressão:', error);
    return { success: false, error: error?.message || 'Erro desconhecido na impressão' };
  }
}

export function registerPrinterHandlers() {
  // Listar impressoras disponíveis
  ipcMain.handle('printers-list', async () => {
    try {
      const printers = await listPrinters();
      cachedPrinters = printers;
      return { success: true, printers };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Erro ao listar impressoras', printers: [] };
    }
  });

  // Obter impressora padrão
  ipcMain.handle('printers-get-default', async () => {
    try {
      const printerName = await getDefaultPrinter();
      const printerInfo = printerName
        ? cachedPrinters.find((printer) => printer?.name === printerName)
        : undefined;

      return {
        success: true,
        printerName,
        port: printerInfo?.port ?? null,
      };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Erro ao obter impressora padrão', printerName: null };
    }
  });

  // Limite de tamanho para evitar abuso (DoS) – ~512 KB
  const MAX_PRINT_CONTENT_LENGTH = 512 * 1024;

  // Imprimir conteúdo
  ipcMain.handle('print-content', async (_event, payload: PrintContentPayload) => {
    try {
      if (!payload || typeof payload.content !== 'string') {
        return { success: false, error: 'Conteúdo de impressão inválido' };
      }
      if (payload.content.length > MAX_PRINT_CONTENT_LENGTH) {
        return { success: false, error: 'Conteúdo de impressão muito grande' };
      }

      const result = await performPrintJob(payload.content, payload.options);
      return result;
    } catch (error: any) {
      return { success: false, error: 'Erro ao imprimir. Tente novamente.' };
    }
  });

  // Testar impressora
  ipcMain.handle('printers-test', async (_event, payload: string | PrintJobOptions | null) => {
    try {
      let options: PrintJobOptions = {};

      if (typeof payload === 'string' || payload === null) {
        options.printerName = payload ?? null;
      } else if (typeof payload === 'object' && payload !== null) {
        options = { ...payload };
      }

      const testContent = `
================================
  TESTE DE IMPRESSÃO
================================
Esta é uma impressão de teste.
Se você está lendo isso, a
impressora está funcionando
corretamente.
================================
TESTE CONCLUÍDO
================================
      `.trim();
      
      const result = await performPrintJob(testContent, options);
      return result;
    } catch (error: any) {
      return { success: false, error: error?.message || 'Erro ao testar impressora' };
    }
  });
}

