import { loadPrintSettings, DEFAULT_PRINT_SETTINGS, type PaperSizeOption } from './print-settings';
import QRCode from 'qrcode';

const RECEIPT_CUT_MARKER = '<<CUT_RECEIPT>>';
const PRINT_MARKER_REGEX = /<<(?:ESC_POS_BINARY:([A-Za-z0-9+/=]+)|NFC_E_QR:([^>\n]+))>>/g;

/**
 * Serviço de impressão universal que funciona tanto no desktop (Electron) quanto na web
 * Versão para desktop (montshop-desktop)
 */

export interface PrintJobOptions {
  printerName?: string | null;
  port?: string | null;
  paperSize?: PaperSizeOption;
  customPaperWidth?: number | null;
  autoCut?: boolean;
}

/**
 * Detecta se está rodando no Electron (desktop)
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

function getWebPaperStyle(paperSize: PaperSizeOption = '80mm', customPaperWidth?: number | null) {
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

/**
 * Formata conteúdo de texto para impressão HTML (web)
 */
function splitReceiptCopies(content: string): string[] {
  return content
    .split(RECEIPT_CUT_MARKER)
    .map((section) => section.replace(/^\n+/, '').trimEnd())
    .filter((section) => section.trim().length > 0);
}

async function enrichCopyHtmlWithQr(copy: string): Promise<string> {
  const markerRegex = new RegExp(PRINT_MARKER_REGEX.source, 'g');
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(copy)) !== null) {
    if (match.index > lastIndex) {
      const text = copy.substring(lastIndex, match.index);
      parts.push(
        text
          .split('\n')
          .map((line) => `<div class="line">${line.replace(/ /g, '&nbsp;')}</div>`)
          .join(''),
      );
    }

    const qrUrl = match[2]?.trim();
    if (qrUrl) {
      try {
        const dataUrl = await QRCode.toDataURL(qrUrl, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 140,
          type: 'image/png',
        });
        parts.push(
          `<div class="qr-wrap"><img src="${dataUrl}" alt="QR Code NFC-e" width="140" height="140" /></div>`,
        );
      } catch (error) {
        console.warn('Falha ao gerar QR Code na impressão web:', error);
        parts.push(`<div class="line">${qrUrl}</div>`);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < copy.length) {
    const text = copy.substring(lastIndex);
    parts.push(
      text
        .split('\n')
        .map((line) => `<div class="line">${line.replace(/ /g, '&nbsp;')}</div>`)
        .join(''),
    );
  }

  return parts.join('');
}

async function formatContentForWeb(
  content: string,
  paperSize: PaperSizeOption = '80mm',
  customPaperWidth?: number | null
): Promise<string> {
  const copiesList = splitReceiptCopies(content);
  const copies = copiesList.length > 0 ? copiesList : [content];

  const htmlCopiesParts: string[] = [];
  for (const copy of copies) {
    htmlCopiesParts.push(`<div class="copy">${await enrichCopyHtmlWithQr(copy)}</div>`);
  }
  const htmlCopies = htmlCopiesParts.join('');

  const paperStyle = getWebPaperStyle(paperSize, customPaperWidth);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Impressão de Cupom</title>
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
            font-size: 9px;
            line-height: 1.15;
            width: ${paperStyle.width};
          }
        }
        body {
          margin: 0;
          padding: ${paperStyle.padding};
          font-family: 'Courier New', monospace;
          font-size: 9px;
          line-height: 1.15;
          width: ${paperStyle.width};
          background: white;
        }
        .content {
          display: flex;
          flex-direction: column;
          gap: 12mm;
        }
        .copy {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .copy:not(:last-child) {
          page-break-after: always;
        }
        .line {
          font-family: 'Courier New', monospace;
          font-size: 9px;
          line-height: 1.15;
        }
        .qr-wrap {
          text-align: center;
          margin: 6px 0;
        }
        .qr-wrap img {
          width: 140px;
          height: 140px;
          image-rendering: pixelated;
        }
      </style>
    </head>
    <body>
      <div class="content">${htmlCopies}</div>
    </body>
    </html>
  `;
}

/**
 * Imprime conteúdo no navegador usando window.print
 */
async function printInBrowser(
  content: string,
  options?: PrintJobOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    // Criar janela de impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return { success: false, error: 'Não foi possível abrir janela de impressão. Verifique se os pop-ups estão bloqueados.' };
    }

    // Formatar conteúdo para HTML (inclui QR Code da NFC-e)
    const htmlContent = await formatContentForWeb(
      content,
      options?.paperSize,
      options?.customPaperWidth
    );

    // Escrever conteúdo na janela
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Aguardar carregamento e imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Fechar janela após impressão
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 250);
    };

    // Se já carregou, imprimir imediatamente
    if (printWindow.document.readyState === 'complete') {
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 250);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao imprimir no navegador:', error);
    return { success: false, error: error.message || 'Erro ao imprimir' };
  }
}

/**
 * Imprime conteúdo usando Electron (desktop)
 */
async function printInElectron(
  content: string,
  options?: PrintJobOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!window.electronAPI?.printers) {
      return { success: false, error: 'API de impressão não disponível' };
    }

    const result = await window.electronAPI.printers.print({
      content,
      options,
    });
    return result;
  } catch (error: any) {
    console.error('Erro ao imprimir no Electron:', error);
    return { success: false, error: error.message || 'Erro ao imprimir' };
  }
}

/**
 * Função principal de impressão
 * Funciona tanto no desktop quanto na web
 */
export async function printContent(
  content: string,
  printerOrOptions?: string | null | PrintJobOptions
): Promise<{ success: boolean; error?: string }> {
  const options = normalizePrintOptions(printerOrOptions);
  const finalOptions = mergeWithStoredSettings(options);

  try {
    if (isElectron()) {
      // Desktop: usar Electron
      return await printInElectron(content, finalOptions);
    } else {
      // Web: usar window.print
      return await printInBrowser(content, finalOptions);
    }
  } catch (error: any) {
    console.error('Erro na impressão:', error);
    return { success: false, error: error.message || 'Erro desconhecido na impressão' };
  }
}

/**
 * Lista impressoras disponíveis (apenas desktop)
 */
export async function listPrinters(): Promise<{ success: boolean; printers?: any[]; error?: string }> {
  if (!isElectron() || !window.electronAPI?.printers) {
    return { success: false, printers: [], error: 'Não disponível na web' };
  }

  try {
    const result = await window.electronAPI.printers.list();
    // O resultado pode ser um array ou um objeto com success/printers
    if (Array.isArray(result)) {
      return { success: true, printers: result };
    }
    return result as { success: boolean; printers?: any[]; error?: string };
  } catch (error: any) {
    return { success: false, printers: [], error: error.message };
  }
}

/**
 * Obtém impressora padrão (apenas desktop)
 */
export async function getDefaultPrinter(): Promise<{
  success: boolean;
  printerName?: string | null;
  port?: string | null;
  error?: string;
}> {
  if (!isElectron() || !window.electronAPI?.printers) {
    return { success: false, printerName: null, port: null, error: 'Não disponível na web' };
  }

  try {
    return await window.electronAPI.printers.getDefault();
  } catch (error: any) {
    return { success: false, printerName: null, port: null, error: error.message };
  }
}

/**
 * Testa impressora (apenas desktop)
 */
export async function testPrinter(printerName?: string | null): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.electronAPI?.printers) {
    return { success: false, error: 'Não disponível na web' };
  }

  try {
    return await window.electronAPI.printers.test(printerName || null);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function normalizePrintOptions(
  printerOrOptions?: string | null | PrintJobOptions
): PrintJobOptions | undefined {
  if (printerOrOptions === undefined) {
    return undefined;
  }

  if (typeof printerOrOptions === 'string' || printerOrOptions === null) {
    return {
      printerName: printerOrOptions ?? null,
      paperSize: '80mm',
      customPaperWidth: null,
      autoCut: true,
    };
  }

  const paperSize: PaperSizeOption =
    printerOrOptions.paperSize && ['80mm', '58mm', 'a4', 'custom'].includes(printerOrOptions.paperSize)
      ? printerOrOptions.paperSize
      : '80mm';

  const rawCustomWidth = printerOrOptions.customPaperWidth;
  let customPaperWidth: number | null = null;
  if (paperSize === 'custom') {
    if (typeof rawCustomWidth === 'number' && Number.isFinite(rawCustomWidth)) {
      customPaperWidth = Math.max(16, Math.min(128, Math.round(rawCustomWidth)));
    } else if (rawCustomWidth !== null && rawCustomWidth !== undefined) {
      const parsed = Number(rawCustomWidth);
      customPaperWidth = Number.isFinite(parsed)
        ? Math.max(16, Math.min(128, Math.round(parsed)))
        : 48;
    } else {
      customPaperWidth = 48;
    }
  }

  return {
    printerName: printerOrOptions.printerName ?? null,
    port: printerOrOptions.port ?? null,
    paperSize,
    customPaperWidth,
    autoCut: printerOrOptions.autoCut !== false,
  };
}

function mergeWithStoredSettings(options?: PrintJobOptions): PrintJobOptions | undefined {
  if (!isElectron()) {
    return options;
  }

  const settings = loadPrintSettings();
  const merged: PrintJobOptions = {
    printerName: options?.printerName ?? settings.printerName ?? null,
    port: options?.port ?? settings.printerPort ?? null,
    paperSize: options?.paperSize ?? settings.paperSize ?? DEFAULT_PRINT_SETTINGS.paperSize,
    customPaperWidth:
      options?.customPaperWidth ?? settings.customPaperWidth ?? DEFAULT_PRINT_SETTINGS.customPaperWidth ?? 48,
    autoCut: options?.autoCut ?? true,
  };

  return merged;
}

