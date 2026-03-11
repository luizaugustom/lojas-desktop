import { cn } from '../../lib/utils';
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle, X, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationItemProps {
  notification: {
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
  };
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAction?: (url: string) => void;
  onClick?: (notification: NotificationItemProps['notification']) => void;
}

const priorityConfig = {
  low: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  normal: {
    icon: Bell,
    color: 'text-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-200 dark:border-gray-800',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
  },
  urgent: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
};

const typeConfig: Record<string, { icon: any; color: string }> = {
  stock_alert: { icon: AlertTriangle, color: 'text-orange-500' },
  bill_reminder: { icon: AlertCircle, color: 'text-blue-500' },
  sale_alert: { icon: CheckCircle, color: 'text-green-500' },
  system_update: { icon: Info, color: 'text-purple-500' },
  payment_reminder: { icon: AlertCircle, color: 'text-yellow-500' },
  low_stock: { icon: AlertTriangle, color: 'text-orange-500' },
  general: { icon: Bell, color: 'text-gray-500' },
};

export function NotificationItem({
  notification,
  onRead,
  onDelete,
  onAction,
  onClick,
}: NotificationItemProps) {
  const config = priorityConfig[notification.priority as keyof typeof priorityConfig] || priorityConfig.normal;
  const typeInfo = typeConfig[notification.type] || typeConfig.general;
  const Icon = typeInfo.icon;

  const handleClick = () => {
    onClick?.(notification);
    if (!notification.isRead && onRead) {
      onRead(notification.id);
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.actionUrl && onAction) {
      onAction(notification.actionUrl);
      if (onRead) {
        onRead(notification.id);
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative p-4 rounded-lg border transition-all duration-200 cursor-pointer group',
        config.border,
        notification.isRead ? 'bg-background' : config.bg,
        'hover:shadow-md'
      )}
    >
      {!notification.isRead && (
        <div className="absolute top-4 left-4 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}

      <div className="flex gap-3 pl-4">
        <div className={cn('flex-shrink-0 mt-1', typeInfo.color)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn(
                'text-sm font-semibold',
                !notification.isRead && 'text-foreground'
              )}>
                {notification.title}
              </h4>
              {notification.category && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {notification.category}
                </span>
              )}
            </div>

            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
              title="Remover notificação"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>

          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>

            {notification.actionUrl && notification.actionLabel && (
              <button
                onClick={handleAction}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {notification.actionLabel}
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

