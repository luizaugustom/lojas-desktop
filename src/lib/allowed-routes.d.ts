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
export declare const ALLOWED_ROUTES: readonly ["dashboard", "products", "sales", "customers", "sellers", "sales-history", "reports", "bills", "installments", "cash-closure", "invoices", "inbound-invoices", "boletos", "companies", "stock-transfer", "metrics", "gestores", "devices", "budgets", "seller-profile", "establishments", "time-clock", "time-clock-history", "time-clock-manage", "time-clock-pending", "time-clock-config", "time-clock-qr", "public-catalog"];
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
export declare const sanitizeRoutePath: (raw: unknown) => string | null;
/**
 * Verifica se a rota (top-level ou settings/<slug>) é válida.
 * Para settings/<slug>, exige papel 'admin', 'empresa' ou 'gestor' e que o slug
 * seja uma das 12 categorias conhecidas. Use `isSettingsCategoryVisible` no
 * renderer para checagem fina baseada em plano/entitlement.
 */
export interface RoleCheck {
    isSettingsCategoryVisible: (role: 'admin' | 'empresa' | 'gestor' | 'vendedor', slug: string) => boolean;
}
export declare const isValidRoute: (route: string, role: "admin" | "empresa" | "gestor" | "vendedor", roleCheck?: RoleCheck) => boolean;
