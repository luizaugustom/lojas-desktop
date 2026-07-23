import { useEffect, useState } from 'react';
import { Bell, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { notificationApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { logger } from '@/lib/logger';
import { toast } from 'react-hot-toast';

export interface NotificacoesSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

type NotificationPreferences = {
  stockAlerts?: boolean;
  billReminders?: boolean;
  weeklyReports?: boolean;
  salesAlerts?: boolean;
  systemUpdates?: boolean;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  desktopNotificationsEnabled?: boolean;
};

export function NotificacoesSettings({ locked, lockReason }: NotificacoesSettingsProps) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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
      const response = await notificationApi.getPreferences();
      const data = response.data;
      logger.log('Preferências carregadas:', data);
      setPreferences(data);
    } catch (error: any) {
      console.error('Erro ao carregar preferências:', error);
      if (error.response?.status === 401) {
        logger.log('Usuário não autenticado, ignorando erro de preferências');
        return;
      }
      if (error.response?.status === 404) {
        logger.log('Preferências não encontradas, criando padrões localmente');
        setPreferences({
          stockAlerts: false,
          billReminders: false,
          weeklyReports: false,
          salesAlerts: false,
          systemUpdates: false,
          emailEnabled: false,
          inAppEnabled: false,
          desktopNotificationsEnabled: false,
        });
        return;
      }
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleToggle = async (field: keyof NotificationPreferences, value: boolean) => {
    try {
      setUpdating(true);
      if (field === 'desktopNotificationsEnabled' && value && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      const updates = { [field]: value };
      logger.log('Atualizando preferência:', { field, value, updates });
      const response = await notificationApi.updatePreferences(updates);
      logger.log('Preferência atualizada:', response.data);
      setPreferences((prev) => (prev ? { ...prev, [field]: value } : prev));
      toast.success('Preferência atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar preferência:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Erro ao atualizar preferência';
      toast.error(errorMessage);
      await load();
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Erro ao carregar preferências
      </p>
    );
  }

  const items: { field: keyof NotificationPreferences; title: string; description: string }[] = [
    { field: 'stockAlerts', title: 'Alertas de Estoque', description: 'Receba notificações quando o estoque estiver baixo' },
    { field: 'billReminders', title: 'Contas a Vencer', description: 'Receba lembretes de contas próximas do vencimento' },
    { field: 'weeklyReports', title: 'Relatórios Semanais', description: 'Receba resumo semanal das vendas por email' },
    { field: 'salesAlerts', title: 'Alertas de Vendas', description: 'Receba notificações de novas vendas realizadas' },
    { field: 'systemUpdates', title: 'Atualizações do Sistema', description: 'Receba notificações sobre atualizações e novidades' },
    { field: 'emailEnabled', title: 'Notificações por Email', description: 'Receber notificações no email cadastrado' },
    { field: 'inAppEnabled', title: 'Notificações In-App', description: 'Receber notificações dentro do sistema' },
    { field: 'desktopNotificationsEnabled', title: 'Notificações na área de trabalho', description: 'Exibir notificações do sistema na área de trabalho, mesmo com o app em segundo plano' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferências de Notificação
        </CardTitle>
        <CardDescription>Configure suas preferências de notificação</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const isEnabled = Boolean(preferences[item.field]);
          return (
            <div key={item.field} className="flex items-center justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Button
                variant={isEnabled ? 'default' : 'outline'}
                onClick={() => handleToggle(item.field, !isEnabled)}
                disabled={updating}
              >
                {isEnabled ? 'Ativado' : 'Desativado'}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default NotificacoesSettings;
