import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { scaleApi } from '../lib/api-endpoints';
import { loadPrintSettings } from '../lib/print-settings';

// Função para obter computerId
async function getComputerId(): Promise<string> {
  if (window.electronAPI) {
    return await window.electronAPI.devices.getComputerId();
  }
  // Fallback: gerar um ID único se não houver Electron API
  let id = localStorage.getItem('montshop_computer_id');
  if (!id) {
    id = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('montshop_computer_id', id);
  }
  return id;
}

interface Printer {
  name: string;
  status: string;
  DriverName?: string;
  id?: string;
  isDefault?: boolean;
  isConnected?: boolean;
  connection?: string;
  port?: string;
  driver?: string;
  paperStatus?: string;
  lastStatusCheck?: string | Date;
  isConfigured?: boolean;
}

interface Scale {
  DeviceID: string;
  Description: string;
  Name: string;
}

interface DeviceContextValue {
  printers: Printer[];
  scales: Scale[];
  computerId: string | null;
  loading: boolean;
  configuredPrinterName: string | null;
  refreshPrinters: () => Promise<Printer[]>;
  refreshScales: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [scales, setScales] = useState<Scale[]>([]);
  const [computerId, setComputerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [configuredPrinterName, setConfiguredPrinterName] = useState<string | null>(null);
  const { api, isAuthenticated } = useAuth();

  const normalizePrinterName = (name: string | null | undefined) =>
    typeof name === 'string' && name.trim().length > 0 ? name.trim().toLowerCase() : null;

  const refreshPrinters = async (): Promise<Printer[]> => {
    try {
      const settings = loadPrintSettings();
      const configuredName = normalizePrinterName(settings.printerName);
      let discovered: any[] = [];

      if (window.electronAPI?.printers?.list) {
        const result = await window.electronAPI.printers.list();
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.printers)
          ? result.printers
          : [];

        discovered = list
          .filter(Boolean)
          .map((printer: any) => ({
            name: printer?.name ?? printer?.Name ?? 'Impressora desconhecida',
            status: printer?.status ?? printer?.PrinterStatus ?? 'unknown',
            driver: printer?.driver ?? printer?.DriverName ?? undefined,
            port: printer?.port ?? printer?.PortName ?? undefined,
            isDefault: Boolean(printer?.isDefault ?? printer?.Default),
            isConnected: printer?.isConnected ?? (printer?.status === 'online'),
            connection: printer?.connection,
            paperStatus: printer?.paperStatus,
            lastStatusCheck: printer?.lastStatusCheck,
          }));
      } else {
        console.warn('[DeviceContext] API de impressoras não disponível');
      }

      const formattedPrinters: Printer[] = discovered.map((printer: any) => ({
        ...printer,
        isConfigured:
          configuredName !== null
            ? normalizePrinterName(printer?.name) === configuredName
            : false,
      }));

      if (
        configuredName &&
        settings.printerName &&
        !formattedPrinters.some((printer) => normalizePrinterName(printer.name) === configuredName)
      ) {
        formattedPrinters.unshift({
          name: settings.printerName,
          status: 'unknown',
          port: settings.printerPort ?? undefined,
          driver: undefined,
          isDefault: false,
          isConnected: false,
          connection: undefined,
          paperStatus: undefined,
          lastStatusCheck: undefined,
          isConfigured: true,
        });
      }

      setConfiguredPrinterName(settings.printerName ?? null);
      setPrinters(formattedPrinters);
      return formattedPrinters;
    } catch (error) {
      console.error('[DeviceContext] Erro ao atualizar impressoras:', error);
      const settings = loadPrintSettings();
      setConfiguredPrinterName(settings.printerName ?? null);
      setPrinters([]);
      return [];
    }
  };

  const refreshScales = async () => {
    if (!isAuthenticated || !api) {
      setScales([]);
      return;
    }

    try {
      const response = await scaleApi.available();
      const scalesList = response.data || [];
      setScales(scalesList);
    } catch (error) {
      console.error('Erro ao atualizar balanças:', error);
      setScales([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // Obter computerId
        const id = await getComputerId();
        setComputerId(id);
      } catch (error) {
        console.error('Erro ao obter computerId:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Recarregar dispositivos quando o usuário fizer login
  useEffect(() => {
    if (isAuthenticated) {
      refreshPrinters();
      refreshScales();
    } else {
      setPrinters([]);
      setScales([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <DeviceContext.Provider
      value={{
        printers,
        scales,
        computerId,
        loading,
        configuredPrinterName,
        refreshPrinters,
        refreshScales,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevices() {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevices must be used within a DeviceProvider');
  }
  return context;
}

