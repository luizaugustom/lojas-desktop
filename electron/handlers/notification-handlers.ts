import { BrowserWindow, ipcMain, Notification, nativeImage } from 'electron';
import * as path from 'path';
import { sanitizeRoutePath, isValidRoute } from '../../src/lib/allowed-routes';

interface ShowNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  onClickPath?: string;
}

/**
 * Valida o onClickPath vindo do renderer antes de enviar IPC 'navigate'.
 *
 * Defesa em profundidade: o renderer também valida, mas o main é a fronteira
 * de confiança para o processo do SO e nunca deve repassar caminho cru.
 *
 * Retorna a rota normalizada se válida, ou null se inválida.
 *
 * NOTA: a checagem fina por papel (settings/* + plano) acontece no renderer,
 * que tem acesso ao AuthContext. Aqui aplicamos apenas o allowlist top-level
 * para impedir navegação arbitrária entre áreas sem autorização.
 */
const sanitizeOnClickPath = (raw: unknown): string | null => {
  const normalized = sanitizeRoutePath(raw);
  if (!normalized) return null;

  // Para o allowlist top-level, considera os 4 papéis e aceita settings
  // quando o papel é admin/empresa/gestor. O renderer faz a checagem fina.
  const rolesToCheck: Array<'admin' | 'empresa' | 'gestor' | 'vendedor'> = [
    'admin',
    'empresa',
    'gestor',
    'vendedor',
  ];
  for (const role of rolesToCheck) {
    if (isValidRoute(normalized, role)) {
      return normalized;
    }
  }
  return null;
};

/**
 * Registra handlers IPC para notificações nativas do Electron.
 * Permite que o renderer exiba notificações do SO ao receber
 * eventos relevantes (ex: lembrete de ponto).
 */
export function registerNotificationHandlers(): void {
  ipcMain.handle(
    'notifications:show',
    (_event, payload: ShowNotificationPayload) => {
      try {
        if (!Notification.isSupported()) {
          return { ok: false, reason: 'unsupported' };
        }
        const opts: Electron.NotificationConstructorOptions = {
          title: payload.title,
          body: payload.body,
          silent: payload.silent ?? false,
        };
        if (payload.icon) {
          try {
            const iconPath = path.isAbsolute(payload.icon)
              ? payload.icon
              : path.join(process.cwd(), payload.icon);
            opts.icon = nativeImage.createFromPath(iconPath);
          } catch {
            // ignora ícone inválido
          }
        }
        const n = new Notification(opts);
        n.on('click', () => {
          // Traz a janela principal para o foco e navega (se path informado).
          // Valida o path contra o allowlist antes de enviar ao renderer.
          const windows = BrowserWindow.getAllWindows();
          const main = windows[0];
          if (main) {
            if (main.isMinimized()) main.restore();
            main.show();
            main.focus();
            const safePath = sanitizeOnClickPath(payload.onClickPath);
            if (safePath) {
              main.webContents.send('navigate', safePath);
            }
          }
        });
        n.show();
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: String(err) };
      }
    },
  );

  ipcMain.handle('notifications:is-supported', () => {
    return Notification.isSupported();
  });
}