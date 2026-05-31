import { useDeviceStore } from '../store/device-store';
import { loadPrintSettings, savePrintSettings } from './print-settings';
import { isElectron } from './print-service';

function normalizePrinterName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractPrinters(result: any): Array<{ name?: string | null }> {
  if (!result) return [];
  if (Array.isArray(result)) {
    return result;
  }
  if (Array.isArray(result.printers)) {
    return result.printers;
  }
  return [];
}

/**
 * Verifica a impressora configurada localmente e atualiza o store global.
 * Retorna um objeto com sucesso/mensagem para feedback visual.
 */
export async function checkPrinterStatus(): Promise<{ success: boolean; message: string }> {
  const { setPrinterStatus, setPrinterName } = useDeviceStore.getState();
  const settings = loadPrintSettings();
  const configuredPrinter = normalizePrinterName(settings.printerName);

  const setState = (status: 'connected' | 'disconnected' | 'checking' | 'error', name: string | null) => {
    setPrinterStatus(status);
    setPrinterName(name);
  };

  try {
    setPrinterStatus('checking');

    if (!isElectron() || !window.electronAPI?.printers) {
      if (configuredPrinter) {
        setState('connected', configuredPrinter);
        return {
          success: true,
          message: `Impressora configurada: ${configuredPrinter}`,
        };
      }

      setState('disconnected', null);
      return {
        success: false,
        message: 'Nenhuma impressora configurada. Configure uma impressora nas preferências locais.',
      };
    }

    const printersResult = await window.electronAPI.printers.list();
    const printers = extractPrinters(printersResult);

    if (configuredPrinter) {
      const match = printers.find((printer) =>
        normalizePrinterName(printer?.name)?.toLowerCase() === configuredPrinter.toLowerCase()
      );

      if (match?.name) {
        setState('connected', match.name);
        const matchPort = (match as { port?: string | null }).port ?? null;
        if (match.name !== settings.printerName || (matchPort && matchPort !== settings.printerPort)) {
          savePrintSettings({
            printerName: match.name,
            printerPort: matchPort ?? settings.printerPort ?? null,
          });
        }
        return {
          success: true,
          message: `Impressora "${match.name}" configurada e pronta para uso.`,
        };
      }
    }

    const defaultResult = await window.electronAPI.printers.getDefault();
    const defaultPrinterName = normalizePrinterName(defaultResult?.printerName);

    if (!configuredPrinter && defaultPrinterName) {
      const updated = savePrintSettings({
        printerName: defaultPrinterName,
        printerPort: defaultResult?.port ?? null,
      });
      setState('connected', updated.printerName);
      return {
        success: true,
        message: `Impressora padrão "${defaultPrinterName}" configurada automaticamente.`,
      };
    }

    if (configuredPrinter && defaultPrinterName && defaultPrinterName.toLowerCase() === configuredPrinter.toLowerCase()) {
      setState('connected', defaultPrinterName);
      if (defaultPrinterName !== settings.printerName) {
        savePrintSettings({
          printerName: defaultPrinterName,
          printerPort: defaultResult?.port ?? null,
        });
      }
      return {
        success: true,
        message: `Impressora "${defaultPrinterName}" configurada e pronta para uso.`,
      };
    }

    if (configuredPrinter) {
      setState('error', configuredPrinter);
      return {
        success: false,
        message: `Impressora configurada "${configuredPrinter}" não encontrada. Verifique a conexão.`,
      };
    }

    if (defaultPrinterName) {
      setState('connected', defaultPrinterName);
      return {
        success: true,
        message: `Impressora padrão "${defaultPrinterName}" disponível.`,
      };
    }

    setState('disconnected', null);
    return {
      success: false,
      message: 'Nenhuma impressora disponível no sistema.',
    };
  } catch (error) {
    console.error('[PrinterCheck] Erro ao verificar impressora:', error);
    setState(configuredPrinter ? 'error' : 'disconnected', configuredPrinter);
    return {
      success: false,
      message: configuredPrinter
        ? `Erro ao verificar a impressora "${configuredPrinter}".`
        : 'Erro ao verificar impressoras.',
    };
  }
}
