import { BrowserWindow, ipcMain } from 'electron';
import ThermalPrinter from 'node-thermal-printer';
import { PrinterTypes } from 'node-thermal-printer';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import iconv from 'iconv-lite';

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
const NEW_LINE = Buffer.from('\n', 'ascii');

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
  return Buffer.from([ESC, 0x40, ESC, 0x74, DEFAULT_CODE_PAGE]);
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
        width: '52mm',
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
        width: `${Math.max(widthMm - 6, 40)}mm`,
      };
    }
    case '80mm':
    default:
      return {
        pageSize: '80mm auto',
        padding: '5mm',
        width: '70mm',
      };
  }
}

function buildHtmlDocument(content: string, options?: PrintJobOptions): string {
  const paperStyle = getHtmlPaperStyle(options?.paperSize, options?.customPaperWidth);
  const copies = splitReceiptCopies(content);

  const htmlCopies = copies
    .map((copy) => `<pre class="copy">${escapeHtml(copy)}</pre>`)
    .join('');

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
              font-size: 12px;
              line-height: 1.2;
              width: ${paperStyle.width};
            }
          }
          body {
            margin: 0;
            padding: ${paperStyle.padding};
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
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
          }
          .copy:not(:last-child) {
            page-break-after: always;
          }
        </style>
      </head>
      <body>
        <div class="container">${htmlCopies}</div>
      </body>
    </html>
  `;
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

    try {
      const html = buildHtmlDocument(content, options);
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

      window = new BrowserWindow({
        width: 480,
        height: 720,
        show: false,
        webPreferences: {
          sandbox: false,
          nodeIntegration: false,
          contextIsolation: true,
        },
        backgroundColor: '#ffffff',
      });

      window.setMenu(null);
      window.once('closed', () => {
        window = null;
      });

      window.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
        finish({
          success: false,
          error: `Falha ao carregar conteúdo (${errorCode}): ${errorDescription}`,
        });
      });

      window.webContents.once('did-finish-load', () => {
        const printOptions: Electron.WebContentsPrintOptions = {
          silent: true,
          printBackground: true,
        };

        if (options?.printerName) {
          printOptions.deviceName = options.printerName;
        }

        window?.webContents.print(printOptions, (printed, failureReason) => {
          if (!printed) {
            finish({
              success: false,
              error: failureReason || 'Falha ao imprimir conteúdo HTML',
            });
            return;
          }

          finish({ success: true });
        });
      });

      window
        .loadURL(dataUrl)
        .catch((error: any) => {
          finish({
            success: false,
            error: error?.message || 'Erro ao carregar conteúdo para impressão',
          });
        });
    } catch (error: any) {
      finish({
        success: false,
        error: error?.message || 'Erro ao preparar impressão HTML',
      });
    }
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

  if (
    portLower.startsWith('usb') ||
    portLower.startsWith('com') ||
    portLower.startsWith('/dev/') ||
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

      const lines = formatContentForThermal(segment, columns);
      for (const line of lines) {
        const encodedLine = encodeForEscPos(line);
        if (encodedLine.length > 0) {
          printer.raw(encodedLine);
        }
        printer.raw(NEW_LINE);
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
      buffers.push(encodeForEscPos(segment));
      buffers.push(newlineBuffer);

      if (shouldAutoCut || !isLast) {
        buffers.push(cutFull);
      }

      const combinedBuffer = Buffer.concat(buffers);
      fs.writeFileSync(tempFile, combinedBuffer);

      const target = options?.port?.trim() || printerName;

      try {
        if (platform === 'win32') {
          const command = `print /D:"${target}" "${tempFile}"`;
          await execAsync(command);
        } else if (platform === 'darwin') {
          const command = `lp -d "${target}" "${tempFile}"`;
          await execAsync(command);
        } else {
          const command = `lp -d "${target}" "${tempFile}"`;
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

    const jobOptions: PrintJobOptions = {
      ...options,
      printerName,
    };

    if (!normalized.hasExtendedCharacters) {
      const thermalResult = await printWithThermalPrinter(printerName, normalized.compatText, jobOptions);
      if (thermalResult.success) {
        return thermalResult;
      }

      const systemResult = await printWithSystemPrinter(printerName, normalized.compatText, jobOptions);
      if (systemResult.success) {
        return systemResult;
      }

      console.warn('Impressão padrão falhou, utilizando fallback HTML.', {
        thermalError: thermalResult.error,
        systemError: systemResult.error,
      });

      return await printWithHtmlRenderer(normalized.text, jobOptions);
    }

    const htmlResult = await printWithHtmlRenderer(normalized.text, jobOptions);
    if (htmlResult.success) {
      return htmlResult;
    }

    console.warn('Impressão HTML falhou, utilizando versão reduzida em Latin-1.', htmlResult.error);
    return await printWithSystemPrinter(printerName, normalized.compatText, jobOptions);
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

  // Imprimir conteúdo
  ipcMain.handle('print-content', async (_event, payload: PrintContentPayload) => {
    try {
      if (!payload || typeof payload.content !== 'string') {
        return { success: false, error: 'Conteúdo de impressão inválido' };
      }

      const result = await performPrintJob(payload.content, payload.options);
      return result;
    } catch (error: any) {
      return { success: false, error: error?.message || 'Erro desconhecido' };
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

