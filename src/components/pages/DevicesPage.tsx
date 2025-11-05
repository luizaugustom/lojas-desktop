import { useDevices } from '../../contexts/DeviceContext';
import { Button } from '../ui/button';
import { Printer, Scale, Settings, RefreshCw, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
// PrinterDriverSetup removido - configuração de impressoras removida
// printerApi removido - configuração de impressoras removida
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { handleApiError } from '../../lib/handleApiError';
import { Badge } from '../ui/badge';

// Função para obter computerId
async function getComputerId(): Promise<string> {
  if (window.electronAPI) {
    return await window.electronAPI.devices.getComputerId();
  }
  // Fallback: usar ID do localStorage
  let id = localStorage.getItem('montshop_computer_id');
  if (!id) {
    id = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('montshop_computer_id', id);
  }
  return id;
}

export default function DevicesPage() {
  const { printers, scales, refreshPrinters, refreshScales, computerId } = useDevices();
  const { api } = useAuth();
  // Configuração de impressoras removida - estados removidos
  const [discovering, setDiscovering] = useState(false);

  const handleDiscover = async () => {
    try {
      setDiscovering(true);
      toast.loading('Descobrindo impressoras no computador...', { id: 'discover-printers' });
      
      // Configuração de impressoras removida - não descobrir mais
      let discovered: any[] = [];
      toast.error('Configuração de impressoras foi removida do sistema', { id: 'discover-printers' });
      return;
      
      // Se há impressoras descobertas, tenta registrá-las no banco (sincronização)
      if (discovered.length > 0) {
        try {
          const id = computerId || await getComputerId();
          // Configuração de impressoras removida - não registrar mais
          // const registerResponse = await printerApi.registerDevices({
          //   computerId: id,
          //   printers: discovered,
          // });
          
          // Configuração removida - não processar mais
        } catch (registerError) {
          // Configuração removida - não processar mais
        }
      }
    } catch (error) {
      console.error('[DevicesPage] Erro ao descobrir impressoras:', error);
      handleApiError(error);
      toast.error('Erro ao descobrir impressoras', { id: 'discover-printers' });
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dispositivos</h1>
        <p className="text-muted-foreground">Gerencie impressoras e balanças</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-6 border border-border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Impressoras ({printers.length})
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscover}
                disabled={discovering}
              >
                <Search className={`mr-2 h-4 w-4 ${discovering ? 'animate-spin' : ''}`} />
                {discovering ? 'Descobrindo...' : 'Descobrir'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPrinter(undefined);
                  setShowDriverSetup(true);
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Instalar Driver
              </Button>
              <Button variant="outline" size="sm" onClick={refreshPrinters} disabled={discovering}>
                <RefreshCw className={`mr-2 h-4 w-4 ${discovering ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {printers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma impressora encontrada</p>
            ) : (
              printers.map((printer, index) => {
                const isConnected = printer.isConnected ?? (printer.status === 'online');
                const paperStatus = printer.paperStatus || 'UNKNOWN';
                const statusIcon = isConnected ? (
                  paperStatus === 'OK' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : paperStatus === 'ERROR' || paperStatus === 'EMPTY' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                );
                
                const statusText = isConnected 
                  ? (paperStatus === 'OK' ? 'Conectada' : paperStatus === 'ERROR' ? 'Erro' : paperStatus === 'EMPTY' ? 'Sem papel' : paperStatus === 'LOW' ? 'Papel baixo' : 'Online')
                  : 'Desconectada';
                
                return (
                  <div key={index} className="p-3 bg-muted rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {statusIcon}
                        <p className="font-medium">{printer.name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPrinter(printer.name);
                          setShowDriverSetup(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={isConnected ? 'default' : 'secondary'}>
                        {statusText}
                      </Badge>
                      {printer.paperStatus && (
                        <Badge variant={
                          paperStatus === 'OK' ? 'default' : 
                          paperStatus === 'ERROR' || paperStatus === 'EMPTY' ? 'destructive' : 
                          'secondary'
                        }>
                          Papel: {paperStatus === 'OK' ? 'OK' : paperStatus === 'ERROR' ? 'Erro' : paperStatus === 'EMPTY' ? 'Vazio' : paperStatus === 'LOW' ? 'Baixo' : paperStatus}
                        </Badge>
                      )}
                      {printer.connection && (
                        <Badge variant="outline">
                          {printer.connection === 'usb' ? 'USB' : printer.connection === 'network' ? 'Rede' : printer.connection === 'bluetooth' ? 'Bluetooth' : printer.connection}
                        </Badge>
                      )}
                    </div>
                    {printer.lastStatusCheck && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Última verificação: {new Date(printer.lastStatusCheck).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 border border-border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Balanças ({scales.length})
            </h2>
            <Button variant="outline" size="sm" onClick={refreshScales}>
              Atualizar
            </Button>
          </div>
          <div className="space-y-2">
            {scales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma balança encontrada</p>
            ) : (
              scales.map((scale, index) => (
                <div key={index} className="p-3 bg-muted rounded">
                  <p className="font-medium">{scale.Name}</p>
                  <p className="text-sm text-muted-foreground">{scale.Description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PrinterDriverSetup removido - configuração de impressoras removida */}
    </div>
  );
}

