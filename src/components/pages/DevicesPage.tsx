import { useDevices } from '../../contexts/DeviceContext';
import { Button } from '../ui/button';
import { Printer, Scale, RefreshCw, Search, CheckCircle2, XCircle, AlertCircle, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { handleApiError } from '../../lib/handleApiError';
import { Badge } from '../ui/badge';
import { savePrintSettings } from '@/lib/print-settings';
import { checkPrinterStatus } from '@/lib/printer-check';

export default function DevicesPage() {
  const { printers, scales, refreshPrinters, refreshScales, configuredPrinterName } = useDevices();
  const [discovering, setDiscovering] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  const handleDiscover = async () => {
    try {
      setDiscovering(true);
      toast.loading('Buscando impressoras conectadas...', { id: 'discover-printers' });
      const result = await refreshPrinters();
      toast.success(`${result.length} impressora(s) atualizada(s).`, { id: 'discover-printers' });
    } catch (error) {
      console.error('[DevicesPage] Erro ao descobrir impressoras:', error);
      handleApiError(error);
      toast.error('Erro ao descobrir impressoras', { id: 'discover-printers' });
    } finally {
      setDiscovering(false);
    }
  };

  const handleSetDefaultPrinter = async (printerName?: string | null, printerPort?: string | null) => {
    if (!printerName) return;
    try {
      setSettingDefault(printerName);
      savePrintSettings({
        printerName,
        printerPort: printerPort ?? null,
      });
      toast.success(`Impressora "${printerName}" definida como padrão local.`);
      await refreshPrinters();
      await checkPrinterStatus();
    } catch (error) {
      console.error('[DevicesPage] Erro ao definir impressora padrão:', error);
      toast.error('Não foi possível definir a impressora como padrão.');
    } finally {
      setSettingDefault(null);
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
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Impressoras ({printers.length})
              </h2>
              {configuredPrinterName && (
                <span className="text-xs text-muted-foreground">
                  Padrão atual do desktop: <strong>{configuredPrinterName}</strong>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscover}
                disabled={discovering}
              >
                <Search className={`mr-2 h-4 w-4 ${discovering ? 'animate-spin' : ''}`} />
                {discovering ? 'Buscando...' : 'Descobrir'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refreshPrinters()} disabled={discovering}>
                <RefreshCw className={`mr-2 h-4 w-4 ${discovering ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {printers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma impressora encontrada. Clique em "Descobrir".</p>
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
                  ? (paperStatus === 'OK'
                      ? 'Conectada'
                      : paperStatus === 'ERROR'
                      ? 'Erro'
                      : paperStatus === 'EMPTY'
                      ? 'Sem papel'
                      : paperStatus === 'LOW'
                      ? 'Papel baixo'
                      : 'Online')
                  : 'Desconectada';

                const isConfigured = printer.isConfigured;
                const isSystemDefault = printer.isDefault;

                return (
                  <div key={index} className="p-3 bg-muted rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {statusIcon}
                        <p className="font-medium">{printer.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={isConnected ? 'default' : 'secondary'}>
                        {statusText}
                      </Badge>
                      {isConfigured && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Padrão do desktop
                        </Badge>
                      )}
                      {isSystemDefault && (
                        <Badge variant="outline">Padrão do sistema</Badge>
                      )}
                      {printer.paperStatus && (
                        <Badge
                          variant={
                            paperStatus === 'OK'
                              ? 'default'
                              : paperStatus === 'ERROR' || paperStatus === 'EMPTY'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          Papel: {paperStatus === 'OK' ? 'OK' : paperStatus === 'ERROR' ? 'Erro' : paperStatus === 'EMPTY' ? 'Vazio' : paperStatus === 'LOW' ? 'Baixo' : paperStatus}
                        </Badge>
                      )}
                      {printer.connection && (
                        <Badge variant="outline">
                          {printer.connection === 'usb'
                            ? 'USB'
                            : printer.connection === 'network'
                            ? 'Rede'
                            : printer.connection === 'bluetooth'
                            ? 'Bluetooth'
                            : printer.connection}
                        </Badge>
                      )}
                      {printer.port && <Badge variant="outline">Porta: {printer.port}</Badge>}
                      {printer.driver && <Badge variant="outline">Driver: {printer.driver}</Badge>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isConfigured || settingDefault === printer.name}
                        onClick={() => handleSetDefaultPrinter(printer.name, printer.port)}
                      >
                        {isConfigured
                          ? 'Em uso'
                          : settingDefault === printer.name
                          ? 'Aplicando...'
                          : 'Definir como padrão'}
                      </Button>
                    </div>
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
    </div>
  );
}

