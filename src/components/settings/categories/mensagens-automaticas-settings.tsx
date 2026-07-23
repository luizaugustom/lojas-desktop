import { useEffect, useState } from 'react';
import { AlertCircle, Lock, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { handleApiError } from '@/lib/handleApiError';
import { toast } from 'react-hot-toast';

export interface MensagensAutomaticasSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

export function MensagensAutomaticasSettings({
  locked,
  lockReason,
}: MensagensAutomaticasSettingsProps) {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  if (locked) {
    return (
      <Alert className="border-destructive/40 bg-destructive/5">
        <Lock className="h-4 w-4 text-destructive" aria-hidden />
        <AlertDescription>
          {lockReason ?? 'Esta categoria está bloqueada para a sua empresa.'}
        </AlertDescription>
      </Alert>
    );
  }

  const load = async () => {
    try {
      setLoading(true);
      const response = await api.get('/company/my-company/auto-message/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Erro ao carregar status de mensagens automáticas:', error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async () => {
    try {
      const response = await api.get('/company/my-company');
      setCompanyData(response.data);
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    }
  };

  useEffect(() => {
    load();
    loadCompanyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (enable: boolean) => {
    try {
      if (enable && !whatsappConnected) {
        toast.error(
          'Conecte o WhatsApp da empresa nas configurações antes de ativar as mensagens automáticas de cobrança.',
        );
        return;
      }
      if (enable && companyData?.plan) {
        const plan = companyData.plan.toUpperCase();
        if (plan !== 'PRO' && plan !== 'TRIAL_7_DAYS') {
          toast.error(
            'O envio automático de mensagens de cobrança está disponível apenas para planos Pro ou teste grátis.',
          );
          return;
        }
      }
      setToggling(true);
      const endpoint = enable
        ? '/company/my-company/auto-message/enable'
        : '/company/my-company/auto-message/disable';
      const response = await api.patch(endpoint);
      toast.success(
        response.data.message ||
          `Mensagens automáticas ${enable ? 'ativadas' : 'desativadas'} com sucesso!`,
      );
      await load();
    } catch (error: any) {
      console.error('Erro ao alterar status de mensagens automáticas:', error);
      if (error.response?.data?.message?.includes('plano')) {
        toast.error('Esta funcionalidade está disponível apenas para planos Pro ou teste grátis.');
      } else {
        handleApiError(error);
      }
    } finally {
      setToggling(false);
    }
  };

  const plan = companyData?.plan?.toUpperCase();
  const planAllowed = plan === 'PRO' || plan === 'TRIAL_7_DAYS';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Mensagens Automáticas de Cobrança
        </CardTitle>
        <CardDescription>
          Configure o envio automático de mensagens para clientes com parcelas a vencer ou vencidas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          <>
            {!whatsappConnected && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-100 text-sm">
                  O WhatsApp do sistema não está conectado. Entre em contato com o administrador
                  para ativá-lo.
                </AlertDescription>
              </Alert>
            )}

            {companyData?.plan && !planAllowed && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      Funcionalidade disponível apenas para planos Pro ou teste grátis
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Seu plano atual: <strong>{companyData.plan}</strong>. Entre em contato com o
                      administrador para ajustar seu plano.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      status?.autoMessageEnabled ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <p className="font-medium">
                    Status: {status?.autoMessageEnabled ? 'Ativado' : 'Desativado'}
                  </p>
                </div>
                {status && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Parcelas não pagas: {status.totalUnpaidInstallments || 0}</p>
                    <p>• Total de mensagens enviadas: {status.totalMessagesSent || 0}</p>
                  </div>
                )}
              </div>
              <Button
                onClick={() => handleToggle(!status?.autoMessageEnabled)}
                disabled={
                  toggling ||
                  (!status?.autoMessageEnabled && (!whatsappConnected || !planAllowed))
                }
                variant={status?.autoMessageEnabled ? 'destructive' : 'default'}
              >
                {toggling ? 'Processando...' : status?.autoMessageEnabled ? 'Desativar' : 'Ativar'}
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                📱 Como funciona o envio automático:
              </p>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
                <li>
                  • <strong>No dia do vencimento:</strong> O sistema envia uma mensagem lembrando o
                  cliente sobre o pagamento
                </li>
                <li>
                  • <strong>Parcelas atrasadas:</strong> Mensagens são enviadas a cada 3 dias após
                  o vencimento
                </li>
                <li>
                  • <strong>Horário:</strong> As mensagens são enviadas automaticamente às 9h da
                  manhã
                </li>
                <li>
                  • <strong>Requisito:</strong> O cliente deve ter um telefone válido cadastrado
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                💬 Exemplo de mensagem enviada:
              </p>
              <div className="bg-white dark:bg-gray-950 rounded-lg p-3 text-xs border">
                <p className="font-medium mb-2">🔔 LEMBRETE DE PAGAMENTO</p>
                <p className="mb-1">Olá, [Nome do Cliente]!</p>
                <p className="mb-1">
                  📅 <strong>HOJE É O VENCIMENTO</strong> da sua parcela 1/3 na loja{' '}
                  <strong>[Nome da Empresa]</strong>.
                </p>
                <p className="mb-1">
                  💰 <strong>Valor:</strong> R$ 150,00
                </p>
                <p>
                  Por favor, dirija-se à loja para efetuar o pagamento e manter seu crédito em dia.
                </p>
                <p className="mt-2 opacity-75">Agradecemos a sua preferência! 🙏</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default MensagensAutomaticasSettings;
