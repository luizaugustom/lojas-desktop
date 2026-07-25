/**
 * Service de notificações nativas do Electron.
 *
 * Estratégia:
 * - Notificações in-app: NotificationBell já cuida (vindo via WebSocket/polling da API).
 * - Notificações nativas: este módulo dispara `window.electronAPI.notifications.show`
 *   quando recebe uma notificação relevante (ex: ponto).
 *
 * Regras:
 * - Só dispara nativo se a notificação for `high` priority OU
 *   se for de ponto (time_clock_*) — independente de priority.
 */

interface InAppNotification {
  id?: string;
  type?: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high';
  title?: string;
  message?: string;
}

let initialized = false;

function getElectronApi(): {
  notifications: {
    show: (payload: {
      title: string;
      body: string;
      icon?: string;
      silent?: boolean;
      onClickPath?: string;
    }) => Promise<{ ok: boolean; reason?: string }>;
  };
} | null {
  if (typeof window === 'undefined') return null;
  return (window as any).electronAPI ?? null;
}

function shouldShowNative(n: InAppNotification): boolean {
  if (!n) return false;
  if (n.priority === 'high') return true;
  if (typeof n.type === 'string' && n.type.startsWith('time_clock_')) return true;
  if (typeof n.category === 'string' && n.category === 'ponto') return true;
  return false;
}

/**
 * Inicializa listener de notificações. Espera receber notificações via
 * subscription do WebSocket ou polling; cada notificação é avaliada e,
 * se relevante, disparada como notificação nativa do SO.
 */
export function initNativeNotifications(): void {
  if (initialized) return;
  initialized = true;

  const api = getElectronApi();
  if (!api?.notifications?.show) return;

  // Hook: subscrever ao sistema de notificações in-app
  if (typeof window !== 'undefined') {
    window.addEventListener('in-app-notification', (event: any) => {
      const n: InAppNotification = event.detail;
      if (!shouldShowNative(n)) return;
      const title = n.title ?? 'Ponto Eletrônico';
      const body = n.message ?? '';
      void api.notifications.show({
        title,
        body,
        silent: false,
        onClickPath: '/time-clock',
      });
    });
  }
}

/**
 * Helper para emitir uma notificação in-app + nativa a partir do código
 * do renderer (útil em ações locais como "Ponto registrado!").
 */
export function emitInAppNotification(n: InAppNotification): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('in-app-notification', { detail: n }));
}