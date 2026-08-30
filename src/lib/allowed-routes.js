/**
 * Allowlist de rotas válidas para IPC navigate (clique em notificação nativa).
 *
 * Este módulo é compartilhado entre o main process (electron/handlers/) e o
 * renderer (src/components/routing/AppRouter.tsx) via caminho relativo.
 * Não importa nada de React, lucide ou outros pacotes exclusivos do renderer,
 * para que o main também consiga usar sem dependências extras.
 *
 * Segurança: o caminho cru recebido do renderer (ou de payload.onClickPath)
 * NUNCA deve ser repassado para setCurrentRoute ou webContents.send sem antes
 * passar por `sanitizeRoutePath` e `isValidRoute` (com checagem de papel).
 */
export var ALLOWED_ROUTES = [
    'dashboard',
    'products',
    'sales',
    'customers',
    'sellers',
    'sales-history',
    'reports',
    'bills',
    'installments',
    'cash-closure',
    'invoices',
    'inbound-invoices',
    'boletos',
    'companies',
    'stock-transfer',
    'metrics',
    'gestores',
    'devices',
    'budgets',
    'seller-profile',
    'establishments',
    'time-clock',
    'time-clock-history',
    'time-clock-manage',
    'time-clock-pending',
    'time-clock-config',
    'time-clock-qr',
    'public-catalog',
];
/**
 * Limpa e normaliza um path bruto para um formato seguro:
 * - exige string
 * - trim
 * - strip de query (?) e hash (#)
 * - remove barra inicial
 * - rejeita path traversal (../) e caminhos absolutos
 *
 * Retorna null se inválido.
 */
export var sanitizeRoutePath = function (raw) {
    var _a, _b;
    if (typeof raw !== 'string')
        return null;
    var trimmed = raw.trim();
    if (!trimmed)
        return null;
    var withoutFragment = (_a = trimmed.split('#')[0]) !== null && _a !== void 0 ? _a : '';
    var withoutQuery = (_b = withoutFragment.split('?')[0]) !== null && _b !== void 0 ? _b : '';
    var normalized = withoutQuery.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!normalized)
        return null;
    if (normalized.includes('..'))
        return null;
    if (normalized.includes('\0'))
        return null;
    if (normalized.length > 128)
        return null;
    return normalized;
};
export var isValidRoute = function (route, role, roleCheck) {
    if (!route)
        return false;
    if (ALLOWED_ROUTES.includes(route)) {
        return true;
    }
    if (route === 'card-rates') {
        return true;
    }
    if (route.startsWith('settings/')) {
        var slug = route.slice('settings/'.length);
        if (!slug)
            return false;
        if (role === 'vendedor')
            return false;
        if (roleCheck) {
            return roleCheck.isSettingsCategoryVisible(role, slug);
        }
        return true;
    }
    if (route === 'settings') {
        return role !== 'vendedor';
    }
    return false;
};
