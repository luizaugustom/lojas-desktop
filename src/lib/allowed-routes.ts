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

export const ALLOWED_ROUTES = [
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
] as const;

export type AllowedRoute = (typeof ALLOWED_ROUTES)[number];

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
export const sanitizeRoutePath = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withoutFragment = trimmed.split('#')[0] ?? '';
  const withoutQuery = withoutFragment.split('?')[0] ?? '';
  const normalized = withoutQuery.replace(/^\/+/, '').replace(/\/+$/, '');

  if (!normalized) return null;
  if (normalized.includes('..')) return null;
  if (normalized.includes('\0')) return null;
  if (normalized.length > 128) return null;

  return normalized;
};

/**
 * Verifica se a rota (top-level ou settings/<slug>) é válida.
 * Para settings/<slug>, exige papel 'admin', 'empresa' ou 'gestor' e que o slug
 * seja uma das 12 categorias conhecidas. Use `isSettingsCategoryVisible` no
 * renderer para checagem fina baseada em plano/entitlement.
 */
export interface RoleCheck {
  isSettingsCategoryVisible: (role: 'admin' | 'empresa' | 'gestor' | 'vendedor', slug: string) => boolean;
}

export const isValidRoute = (
  route: string,
  role: 'admin' | 'empresa' | 'gestor' | 'vendedor',
  roleCheck?: RoleCheck,
): boolean => {
  if (!route) return false;

  if ((ALLOWED_ROUTES as readonly string[]).includes(route)) {
    return true;
  }

  if (route === 'card-rates') {
    return true;
  }

  if (route.startsWith('settings/')) {
    const slug = route.slice('settings/'.length);
    if (!slug) return false;
    if (role === 'vendedor') return false;
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
