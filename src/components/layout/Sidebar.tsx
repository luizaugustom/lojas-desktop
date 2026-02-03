import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  UserCheck,
  FileBarChart,
  Receipt,
  FileDown,
  CreditCard,
  DollarSign,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  TestTube,
  CalendarClock,
  ClipboardList,
  Printer,
  FileText,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { useAuth } from '@/contexts/AuthContext';
import logoImage from '@/logosvg.svg';

const navigation = [
  { name: 'Dashboard', route: 'dashboard', icon: LayoutDashboard, roles: ['admin', 'empresa'] },
  { name: 'Produtos', route: 'products', icon: Package, roles: ['admin', 'empresa', 'vendedor'] },
  { name: 'Vendas', route: 'sales', icon: ShoppingCart, roles: ['admin', 'empresa', 'vendedor'] },
  { name: 'Orçamentos', route: 'budgets', icon: FileText, roles: ['empresa', 'vendedor'] },
  { name: 'Histórico de Vendas', route: 'sales-history', icon: ClipboardList, roles: ['empresa', 'vendedor'] },
  { name: 'Clientes', route: 'customers', icon: Users, roles: ['admin', 'empresa', 'vendedor'] },
  { name: 'Vendedores', route: 'sellers', icon: UserCheck, roles: ['admin', 'empresa'] },
  { name: 'Pagamentos a Prazo', route: 'installments', icon: CalendarClock, roles: ['empresa', 'vendedor'] },
  { name: 'Contas a Pagar', route: 'bills', icon: CreditCard, roles: ['admin', 'empresa'] },
  { name: 'Fechamento de Caixa', route: 'cash-closure', icon: DollarSign, roles: ['admin', 'empresa', 'vendedor'] },
  { name: 'Relatórios', route: 'reports', icon: FileBarChart, roles: ['admin', 'empresa'] },
  { name: 'Notas Fiscais', route: 'invoices', icon: Receipt, roles: ['empresa'] },
  { name: 'Notas de Entrada', route: 'inbound-invoices', icon: FileDown, roles: ['empresa'] },
  { name: 'Empresas', route: 'companies', icon: Building2, roles: ['admin'] },
  { name: 'Testes da API', route: 'test-api', icon: TestTube, roles: ['admin'] },
  { name: 'Dispositivos', route: 'devices', icon: Printer, roles: ['empresa', 'vendedor'] },
  { name: 'Configurações', route: 'settings', icon: Settings, roles: ['admin', 'empresa'] },
];

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { user } = useAuth();

  const filteredNavigation = navigation.filter((item) => {
    if (!user) {
      console.log('[Sidebar] Sem usuário, filtrando todos os itens');
      return false;
    }

    // Normalizar role (caso venha como 'company' ao invés de 'empresa')
    const normalizedRole = user.role;
    
    console.log('[Sidebar] Filtrando item:', {
      name: item.name,
      itemRoles: item.roles,
      userRole: user.role,
      normalizedRole,
      shouldInclude: item.roles.includes(normalizedRole)
    });

    const adminExcluded = new Set([
      'Dashboard',
      'Produtos',
      'Vendas',
      'Clientes',
      'Vendedores',
      'Contas a Pagar',
      'Relatórios',
      'Fechamento de Caixa',
    ]);

    if (normalizedRole === 'admin' && adminExcluded.has(item.name)) {
      return false;
    }

    // Notas Fiscais: empresa sempre; vendedor apenas se nfeEmissionEnabled
    if (item.name === 'Notas Fiscais') {
      return normalizedRole === 'empresa' || (normalizedRole === 'vendedor' && user.nfeEmissionEnabled === true);
    }

    const shouldInclude = item.roles.includes(normalizedRole);
    console.log('[Sidebar] Item', item.name, shouldInclude ? 'INCLUÍDO' : 'EXCLUÍDO');
    
    return shouldInclude;
  });
  
  console.log('[Sidebar] Navegação filtrada:', filteredNavigation.map(n => n.name));
  console.log('[Sidebar] Usuário atual:', user);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed top-[32px] inset-x-0 bottom-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-[32px] bottom-0 left-0 z-50 transform border-r bg-card transition-all duration-300 ease-in-out lg:translate-x-0',
          sidebarCollapsed ? 'w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        role="navigation"
        aria-label="Menu principal"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {!sidebarCollapsed && (
                <img src={logoImage} alt="MontShop Logo" className="h-6 w-6" />
              )}
              {!sidebarCollapsed && <span className="text-lg font-bold">MontShop</span>}
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleSidebarCollapsed}
                title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
                className="hidden lg:inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="inline-flex lg:hidden items-center justify-center p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <nav className={cn('flex-1 space-y-1 overflow-y-auto', sidebarCollapsed ? 'p-2' : 'p-4')}>
            {filteredNavigation.map((item) => {
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => {
                    onNavigate(item.route);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    'flex items-center rounded-lg py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full',
                    sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                </button>
              );
            })}
          </nav>

          {user && (
            <>
              {user.role === 'vendedor' && (
                <div className={cn('border-t', sidebarCollapsed ? 'p-2' : 'p-4')}>
                  <button
                    onClick={() => onNavigate('seller-profile')}
                    className={cn(
                      'flex items-center rounded-lg py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full',
                      sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
                      currentRoute === 'seller-profile'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <User className="h-5 w-5" />
                    {!sidebarCollapsed && <span className="truncate">Meu Perfil</span>}
                  </button>
                </div>
              )}
              <div className={cn('border-t', sidebarCollapsed ? 'p-2' : 'p-4')}>
                <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-3')}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {(
                      (user.name && user.name.charAt(0)) ||
                      (user.login && user.login.charAt(0)) ||
                      '?'
                    ).toUpperCase()}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{user.name || user.login || 'Usuário'}</p>
                      <p className="truncate text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

