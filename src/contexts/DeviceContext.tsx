import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { scaleApi } from '../lib/api-endpoints';

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
  refreshPrinters: () => Promise<void>;
  refreshScales: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [scales, setScales] = useState<Scale[]>([]);
  const [computerId, setComputerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { api, isAuthenticated } = useAuth();

  const refreshPrinters = async () => {
    // SEMPRE usar impressoras locais como fonte principal
    let systemPrinters: any[] = [];
    
    // Configuração de impressoras removida - não buscar mais do sistema local
    // systemPrinters permanece vazio

    // Configuração de impressoras removida - não processar mais
    const formattedPrinters: Printer[] = [];
    
    // Não sincronizar mais com backend - configuração removida
    setPrinters(formattedPrinters);
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

