import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { NotificationPanel } from './NotificationPanel';
import { notificationApi } from '../../lib/api-endpoints';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [lastNotifiedAt, setLastNotifiedAt] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('lastNotificationAt') : null;
    const initial = stored || new Date().toISOString();
    setLastNotifiedAt(initial);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    loadUnreadCount();
    checkNewNotifications(initial);

    const interval = setInterval(() => {
      loadUnreadCount();
      checkNewNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      setUnreadCount(response.data?.count || 0);
    } catch (error) {
      console.error('Erro ao carregar contador de notificações:', error);
    }
  };

  const checkNewNotifications = async (initialAt?: string) => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('lastNotificationAt') : null;
      const since = initialAt || stored || lastNotifiedAt || new Date().toISOString();
      const response = await notificationApi.list({ onlyUnread: true });
      const data = Array.isArray(response.data) ? response.data : response.data?.notifications || [];

      const newOnes = data
        .filter((notification: any) => new Date(notification.createdAt) > new Date(since))
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (newOnes.length > 0) {
        if ('Notification' in window && Notification.permission === 'granted') {
          newOnes.forEach((notification: any) => {
            new Notification(notification.title, { body: notification.message });
          });
        }
        const latest = newOnes[newOnes.length - 1].createdAt;
        setLastNotifiedAt(latest);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastNotificationAt', latest);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar novas notificações:', error);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTimeout(loadUnreadCount, 1000);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title={`${unreadCount} notificação${unreadCount !== 1 ? 'ões' : ''} não lida${unreadCount !== 1 ? 's' : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-1 right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </span>
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[500px] p-0"
        sideOffset={8}
      >
        <div className="p-4">
          <NotificationPanel />
        </div>
      </PopoverContent>
    </Popover>
  );
}

