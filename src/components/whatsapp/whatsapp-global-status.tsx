import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Loader2, RefreshCw, Phone, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { whatsappApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { toast } from 'react-hot-toast';

type StatusPayload = {
  hasInstance: boolean;
  connected: boolean;
  status: string;
  instanceName?: string;
  connectedPhone?: string | null;
};

type Props = {
  onConnectionChange?: (connected: boolean) => void;
};

function formatPhoneDisplay(digits: string) {
  const d = digits.replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) {
    const rest = d.slice(2);
    return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7)}`;
  }
  return digits;
}

export function WhatsAppGlobalStatus({ onConnectionChange }: Props) {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const onChangeRef = useRef(onConnectionChange);
  onChangeRef.current = onConnectionChange;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await whatsappApi.getInstanceStatus();
      const data = res.data;
      setStatus(data);
      onChangeRef.current?.(data.connected);
    } catch (e) {
      const { message } = handleApiError(e, { showToast: false });
      toast.error(message);
      setStatus(null);
      onChangeRef.current?.(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const badge = (() => {
    if (loading) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Verificando…
        </Badge>
      );
    }
    if (!status || !status.hasInstance) {
      return <Badge variant="outline">Não configurado</Badge>;
    }
    if (status.connected) {
      return <Badge className="bg-green-600 hover:bg-green-600/90 text-white border-0">Conectado</Badge>;
    }
    return <Badge variant="secondary">Desconectado</Badge>;
  })();

  return (
    <Card id="whatsapp-evolution" className="scroll-mt-24">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp
          </CardTitle>
          <CardDescription>
            Status do WhatsApp do sistema. A conexão é gerenciada pelo administrador.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => { setLoading(true); fetchStatus(); }}
            disabled={loading}
            aria-label="Atualizar status"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected && status.connectedPhone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span>
              Número conectado:{' '}
              <strong className="text-foreground">{formatPhoneDisplay(status.connectedPhone)}</strong>
            </span>
          </div>
        )}

        {!status?.connected && !loading && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900 dark:text-amber-100 text-sm">
              O WhatsApp do sistema não está conectado. Entre em contato com o administrador.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
