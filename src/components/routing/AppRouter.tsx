import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MainLayout } from '../layout/MainLayout';
import { TimeClockTabProvider } from '../../contexts/TimeClockTabContext';
import { SettingsRoot } from '../settings/SettingsRoot';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProductsPage from '../pages/ProductsPage';
import SalesPage from '../pages/SalesPage';
import CustomersPage from '../pages/CustomersPage';
import SellersPage from '../pages/SellersPage';
import SalesHistoryPage from '../pages/SalesHistoryPage';
import ReportsPage from '../pages/ReportsPage';
import BillsPage from '../pages/BillsPage';
import InstallmentsPage from '../pages/InstallmentsPage';
import CashClosurePage from '../pages/CashClosurePage';
import InvoicesPage from '../pages/InvoicesPage';
import InboundInvoicesPage from '../pages/InboundInvoicesPage';
import BoletosPage from '../pages/BoletosPage';
import CompaniesPage from '../pages/CompaniesPage';
import DevicesPage from '../pages/DevicesPage';
import BudgetsPage from '../pages/BudgetsPage';
import SellerProfilePage from '../pages/SellerProfilePage';
import StockTransferPage from '../pages/StockTransferPage';
import GestoresPage from '../pages/GestoresPage';
import MetricsPage from '../pages/MetricsPage';
import EstablishmentsPage from '../../app/(dashboard)/establishments/page';
import TimeClockPage from '../pages/TimeClockPage';
import TimeClockHistoryPage from '../pages/TimeClockHistoryPage';
import TimeClockManagePage from '../pages/TimeClockManagePage';
import TimeClockPendingPage from '../pages/TimeClockPendingPage';
import TimeClockConfigPage from '../pages/TimeClockConfigPage';
import TimeClockQrPage from '../pages/TimeClockQrPage';

export default function AppRouter() {
  const { isAuthenticated, loading, user } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !initialized) {
      // Redirecionar vendedores para vendas, empresas para dashboard
      if (user.role === 'vendedor') {
        setCurrentRoute('sales');
      } else {
        // Garantir que empresas vejam o dashboard
        setCurrentRoute('dashboard');
      }
      setInitialized(true);
    } else if (!isAuthenticated) {
      // Resetar quando deslogar
      setInitialized(false);
      setCurrentRoute('dashboard');
    }
  }, [isAuthenticated, user, initialized]);

  useEffect(() => {
    const handleNavigate = (event: CustomEvent<{ route: string }>) => {
      setCurrentRoute(event.detail.route);
    };

    window.addEventListener('navigate' as any, handleNavigate as EventListener);

    // Listener IPC para cliques em notificações nativas (Electron → renderer)
    const api = (window as any).electronAPI;
    let cleanupNavigate: (() => void) | undefined;
    if (api?.notifications?.onNavigate) {
      cleanupNavigate = api.notifications.onNavigate((path: string) => {
        // Mapeia path (ex: "/time-clock") → route (ex: "time-clock")
        const route = path.replace(/^\//, '');
        setCurrentRoute(route);
      });
    }

    return () => {
      window.removeEventListener('navigate' as any, handleNavigate as EventListener);
      cleanupNavigate?.();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    // Settings hub + 11 categorias espelhadas (Task 6 + Task 7).
    if (currentRoute === 'settings' || currentRoute.startsWith('settings/')) {
      return <SettingsRoot currentRoute={currentRoute} onNavigate={setCurrentRoute} />;
    }

    // Legado: redireciona a rota antiga "card-rates" para "settings/taxas-cartao"
    // sem renderizar a página antiga (já removida).
    if (currentRoute === 'card-rates') {
      return <SettingsRoot currentRoute="settings/taxas-cartao" onNavigate={setCurrentRoute} />;
    }

    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage />;
      case 'products':
        return <ProductsPage />;
      case 'sales':
        return <SalesPage />;
      case 'customers':
        return <CustomersPage />;
      case 'sellers':
        return <SellersPage />;
      case 'sales-history':
        return <SalesHistoryPage />;
      case 'reports':
        return <ReportsPage />;
      case 'bills':
        return <BillsPage />;
      case 'installments':
        return <InstallmentsPage />;
      case 'cash-closure':
        return <CashClosurePage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'establishments':
        return <EstablishmentsPage />;
      case 'inbound-invoices':
        return <InboundInvoicesPage />;
      case 'boletos':
        return <BoletosPage />;
      case 'companies':
        return <CompaniesPage />;
      case 'stock-transfer':
        return <StockTransferPage />;
      case 'metrics':
        return <MetricsPage />;
      case 'gestores':
        return <GestoresPage />;
      case 'devices':
        return <DevicesPage />;
      case 'budgets':
        return <BudgetsPage />;
      case 'seller-profile':
        return <SellerProfilePage />;
      case 'time-clock':
        return <TimeClockPage />;
      case 'time-clock-history':
        return <TimeClockHistoryPage />;
      case 'time-clock-manage':
        return <TimeClockManagePage />;
      case 'time-clock-pending':
        return <TimeClockPendingPage />;
      case 'time-clock-config':
        return <TimeClockConfigPage />;
      case 'time-clock-qr':
        return <TimeClockQrPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <TimeClockTabProvider>
      <MainLayout currentRoute={currentRoute} onNavigate={setCurrentRoute}>
        {renderPage()}
      </MainLayout>
    </TimeClockTabProvider>
  );
}
