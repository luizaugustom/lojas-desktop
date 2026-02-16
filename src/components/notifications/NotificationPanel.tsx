import { useEffect, useState } from 'react';
import { NotificationItem } from './NotificationItem';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CheckCheck, RefreshCw, Bell, Trash2 } from 'lucide-react';
import { notificationApi } from '../../lib/api-endpoints';
import { toast } from 'react-hot-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  category?: string;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationApi.list();
      const data = Array.isArray(response.data) ? response.data : response.data?.notifications || [];
      setNotifications(data);
    } catch (error: any) {
      console.error('Erro ao carregar notificações:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error: any) {
      console.error('Erro ao marcar como lida:', error);
      toast.error('Erro ao marcar como lida');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error: any) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast.error('Erro ao marcar todas como lidas');
    }
  };

  const handleDeleteRead = async () => {
    if (!window.confirm('Remover todas as notificações lidas?')) return;
    try {
      await notificationApi.deleteRead();
      setNotifications(prev => prev.filter(n => !n.isRead));
      toast.success('Notificações lidas removidas');
    } catch (error: any) {
      console.error('Erro ao remover notificações lidas:', error);
      toast.error('Erro ao remover notificações lidas');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notificação removida');
    } catch (error: any) {
      console.error('Erro ao remover notificação:', error);
      toast.error('Erro ao remover notificação');
    }
  };

  const handleAction = (url: string) => {
    // No desktop, podemos usar window.open ou navegar via router
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      // Navegação interna pode ser implementada se necessário
      console.log('Navegar para:', url);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = notifications.length - unreadCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Notificações</h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadNotifications}
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              title="Marcar todas como lidas"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas
            </Button>
          )}
          {readCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteRead}
              title="Remover notificações lidas"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover lidas
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            Todas {notifications.length > 0 && `(${notifications.length})`}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Não lidas {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
          <TabsTrigger value="read">
            Lidas {notifications.length - unreadCount > 0 && `(${notifications.length - unreadCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {activeTab === 'unread'
                  ? 'Nenhuma notificação não lida'
                  : activeTab === 'read'
                  ? 'Nenhuma notificação lida'
                  : 'Nenhuma notificação'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={handleMarkAsRead}
                    onDelete={handleDelete}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

