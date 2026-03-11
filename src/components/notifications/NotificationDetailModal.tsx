'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface NotificationDetail {
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

const priorityConfig = {
  low: {
    icon: Info,
    label: 'Baixa',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  normal: {
    icon: Bell,
    label: 'Normal',
    color: 'text-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-200 dark:border-gray-800',
  },
  high: {
    icon: AlertTriangle,
    label: 'Alta',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
  },
  urgent: {
    icon: AlertCircle,
    label: 'Urgente',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
};

const typeLabels: Record<string, string> = {
  stock_alert: 'Alerta de estoque',
  bill_reminder: 'Lembrete de conta',
  sale_alert: 'Alerta de venda',
  system_update: 'Atualização do sistema',
  payment_reminder: 'Lembrete de pagamento',
  low_stock: 'Estoque baixo',
  general: 'Geral',
};

interface NotificationDetailModalProps {
  notification: NotificationDetail | null;
  open: boolean;
  onClose: () => void;
  onAction?: (url: string) => void;
}

export function NotificationDetailModal({
  notification,
  open,
  onClose,
  onAction,
}: NotificationDetailModalProps) {
  if (!notification) return null;

  const config = priorityConfig[notification.priority as keyof typeof priorityConfig] ?? priorityConfig.normal;
  const Icon = config.icon;
  const typeLabel = typeLabels[notification.type] ?? notification.type;

  const handleAction = () => {
    if (notification.actionUrl) {
      onClose();
      if (onAction) {
        onAction(notification.actionUrl);
      } else if (notification.actionUrl.startsWith('http')) {
        window.open(notification.actionUrl, '_blank');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <div className={`flex-shrink-0 p-2 rounded-lg ${config.bg} ${config.border} border`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg leading-tight">
                {notification.title}
              </DialogTitle>
              {notification.category && (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {notification.category}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Mensagem
            </h4>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {notification.message}
            </p>
          </div>

          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Tipo</span>
              <span className="font-medium">{typeLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Prioridade</span>
              <span className="font-medium">{config.label}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Data</span>
              <span className="font-medium">
                {format(new Date(notification.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            {notification.isRead !== undefined && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">
                  {notification.isRead ? 'Lida' : 'Não lida'}
                </span>
              </div>
            )}
          </div>

          {notification.actionUrl && notification.actionLabel && (
            <Button
              onClick={handleAction}
              className="w-full sm:w-auto"
              variant="default"
            >
              {notification.actionLabel}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
