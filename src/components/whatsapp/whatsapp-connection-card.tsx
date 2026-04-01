import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Loader2,
  RefreshCw,
  LogOut,
  Trash2,
  QrCode,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { whatsappApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { toast } from 'react-hot-toast';

export type WhatsappInstanceStatusPayload = {
  hasInstance: boolean;
  connected: boolean;
  status: string;
  instanceName?: string;
  connectedPhone?: string | null;
};

type Props = {
  onConnectionChange?: (connected: boolean, payload: WhatsappInstanceStatusPayload | null) => void;
};

function formatPhoneDisplay(digits: string) {
  const d = digits.replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) {
    const rest = d.slice(2);
    return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7)}`;
  }
  return digits;
}

export function WhatsAppConnectionCard({ onConnectionChange }: Props) {
  const [status, setStatus] = useState<WhatsappInstanceStatusPayload | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const onConnectionChangeRef = useRef(onConnectionChange);
  onConnectionChangeRef.current = onConnectionChange;
  const prevConnectedRef = useRef<boolean | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await whatsappApi.getInstanceStatus();
      const data = res.data;
      setStatus(data);
      onConnectionChangeRef.current?.(data.connected, data);
      return data;
    } catch (e) {
      const { message } = handleApiError(e, { showToast: false });
      toast.error(message);
      setStatus(null);
      onConnectionChangeRef.current?.(false, null);
      return null;
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!status || loadingStatus) return;
    if (prevConnectedRef.current === null) {
      prevConnectedRef.current = status.connected;
      return;
    }
    if (!prevConnectedRef.current && status.connected) {
      toast.success('WhatsApp conectado!');
    }
    prevConnectedRef.current = status.connected;
  }, [status, loadingStatus]);

  const shouldPoll =
    status &&
    !status.connected &&
    (status.status === 'connecting' ||
      status.status === 'qrcode' ||
      status.status === 'pairing' ||
      !!qr);

  useEffect(() => {
    if (!shouldPoll) return;
    const t = setInterval(() => {
      fetchStatus();
    }, 5000);
    return () => clearInterval(t);
  }, [shouldPoll, fetchStatus]);

  const handleConnectFlow = async () => {
    setBusy(true);
    setQr(null);
    setPairingCode(null);
    try {
      await whatsappApi.createInstance();
      const connectRes = await whatsappApi.connect();
      setQr(connectRes.data?.qr ?? null);
      setPairingCode(connectRes.data?.pairingCode ?? null);
      await fetchStatus();
      if (!connectRes.data?.qr && !connectRes.data?.pairingCode) {
        toast.error('Não foi possível obter o QR code. Verifique a Evolution e tente novamente.');
      }
    } catch (e) {
      toast.error(handleApiError(e, { showToast: false }).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await whatsappApi.disconnectInstance();
      toast.success('WhatsApp desconectado.');
      setQr(null);
      setPairingCode(null);
      await fetchStatus();
    } catch (e) {
      toast.error(handleApiError(e, { showToast: false }).message);
    } finally {
      setBusy(false);
      setDisconnectOpen(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await whatsappApi.deleteInstance();
      toast.success('Instância removida. Você pode criar uma nova ao conectar de novo.');
      setQr(null);
      setPairingCode(null);
      await fetchStatus();
    } catch (e) {
      toast.error(handleApiError(e, { showToast: false }).message);
    } finally {
      setBusy(false);
      setDeleteOpen(false);
    }
  };

  const badge = (() => {
    if (loadingStatus) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Verificando…
        </Badge>
      );
    }
    if (!status) return <Badge variant="destructive">Erro</Badge>;
    if (status.status === 'evolution_not_configured') {
      return <Badge variant="destructive">Indisponível</Badge>;
    }
    if (!status.hasInstance) {
      return <Badge variant="outline">Não configurado</Badge>;
    }
    if (status.connected) {
      return (
        <Badge className="bg-green-600 hover:bg-green-600/90 text-white border-0">Conectado</Badge>
      );
    }
    if (status.status === 'connecting' || status.status === 'qrcode' || status.status === 'pairing' || qr) {
      return <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white border-0">Aguardando pareamento</Badge>;
    }
    return <Badge variant="secondary">Desconectado</Badge>;
  })();

  return (
    <>
      <Card id="whatsapp-evolution" className="scroll-mt-24">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp (Evolution)
            </CardTitle>
            <CardDescription>
              Conecte o número do WhatsApp do sistema para enviar cobranças e mensagens para todas as empresas.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {badge}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                setLoadingStatus(true);
                fetchStatus();
              }}
              disabled={loadingStatus || busy}
              aria-label="Atualizar status"
            >
              <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.status === 'evolution_not_configured' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                O servidor não está com a Evolution API configurada. Entre em contato com o suporte.
              </AlertDescription>
            </Alert>
          )}

          {status?.connected && status.connectedPhone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>
                Número conectado:{' '}
                <strong className="text-foreground">{formatPhoneDisplay(status.connectedPhone)}</strong>
              </span>
            </div>
          )}

          {status?.hasInstance && status.instanceName && (
            <p className="text-xs text-muted-foreground font-mono">Instância: {status.instanceName}</p>
          )}

          {!status?.connected && status?.status !== 'evolution_not_configured' && (
            <div className="rounded-lg border border-dashed p-4 space-y-3 bg-muted/30">
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleConnectFlow} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                  Conectar WhatsApp
                </Button>
                {status?.hasInstance && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDisconnectOpen(true)}
                      disabled={busy}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover instância
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Na primeira vez, criamos a instância na Evolution e exibimos o QR. Escaneie em WhatsApp → Dispositivos
                conectados → Conectar aparelho.
              </p>
            </div>
          )}

          {status?.connected && status.hasInstance && (
            <Button type="button" variant="outline" onClick={() => setDisconnectOpen(true)} disabled={busy}>
              <LogOut className="h-4 w-4 mr-2" />
              Desconectar este aparelho
            </Button>
          )}

          {qr && !status?.connected && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Escaneie o QR code
              </p>
              <div className="p-3 bg-white rounded-lg shadow-inner">
                <img src={qr} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
              </div>
              {pairingCode && (
                <p className="text-xs text-center text-muted-foreground">
                  Código de pareamento: <code className="font-mono bg-muted px-1 rounded">{pairingCode}</code>
                </p>
              )}
              <p className="text-xs text-muted-foreground text-center max-w-md">
                O status é atualizado automaticamente a cada poucos segundos após escanear.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desconectar WhatsApp?</DialogTitle>
            <DialogDescription>
              O aparelho será desvinculado. As cobranças automáticas deixarão de ser enviadas até você conectar de novo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDisconnectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Desconectar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover instância?</DialogTitle>
            <DialogDescription>
              A instância será apagada na Evolution e no sistema. Na próxima conexão, uma nova instância será criada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
