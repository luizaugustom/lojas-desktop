import { BrowserWindow, ipcMain, Notification, nativeImage } from 'electron';
import * as path from 'path';
import { sanitizeRoutePath, isValidRoute } from '../../src/lib/allowed-routes';
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
var sanitizeOnClickPath = function (raw) {
    var normalized = sanitizeRoutePath(raw);
    if (!normalized)
        return null;
    // Para o allowlist top-level, considera os 4 papéis e aceita settings
    // quando o papel é admin/empresa/gestor. O renderer faz a checagem fina.
    var rolesToCheck = [
        'admin',
        'empresa',
        'gestor',
        'vendedor',
    ];
    for (var _i = 0, rolesToCheck_1 = rolesToCheck; _i < rolesToCheck_1.length; _i++) {
        var role = rolesToCheck_1[_i];
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
export function registerNotificationHandlers() {
    ipcMain.handle('notifications:show', function (_event, payload) {
        var _a;
        try {
            if (!Notification.isSupported()) {
                return { ok: false, reason: 'unsupported' };
            }
            var opts = {
                title: payload.title,
                body: payload.body,
                silent: (_a = payload.silent) !== null && _a !== void 0 ? _a : false,
            };
            if (payload.icon) {
                try {
                    var iconPath = path.isAbsolute(payload.icon)
                        ? payload.icon
                        : path.join(process.cwd(), payload.icon);
                    opts.icon = nativeImage.createFromPath(iconPath);
                }
                catch (_b) {
                    // ignora ícone inválido
                }
            }
            var n = new Notification(opts);
            n.on('click', function () {
                // Traz a janela principal para o foco e navega (se path informado).
                // Valida o path contra o allowlist antes de enviar ao renderer.
                var windows = BrowserWindow.getAllWindows();
                var main = windows[0];
                if (main) {
                    if (main.isMinimized())
                        main.restore();
                    main.show();
                    main.focus();
                    var safePath = sanitizeOnClickPath(payload.onClickPath);
                    if (safePath) {
                        main.webContents.send('navigate', safePath);
                    }
                }
            });
            n.show();
            return { ok: true };
        }
        catch (err) {
            return { ok: false, reason: String(err) };
        }
    });
    ipcMain.handle('notifications:is-supported', function () {
        return Notification.isSupported();
    });
}
