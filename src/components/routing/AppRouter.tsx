import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MainLayout } from '../layout/MainLayout';
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
import CompaniesPage from '../pages/CompaniesPage';
import DevicesPage from '../pages/DevicesPage';
import SettingsPage from '../pages/SettingsPage';
import BudgetsPage from '../pages/BudgetsPage';
import SellerProfilePage from '../pages/SellerProfilePage';
import CardRatesPage from '../pages/CardRatesPage';
import StockTransferPage from '../pages/StockTransferPage';
import GestoresPage from '../pages/GestoresPage';
import MetricsPage from '../pages/MetricsPage';

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
    return () => {
      window.removeEventListener('navigate' as any, handleNavigate as EventListener);
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
      case 'inbound-invoices':
        return <InboundInvoicesPage />;
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
      case 'settings':
        return <SettingsPage />;
      case 'budgets':
        return <BudgetsPage />;
      case 'seller-profile':
        return <SellerProfilePage />;
      case 'card-rates':
        return <CardRatesPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <MainLayout currentRoute={currentRoute} onNavigate={setCurrentRoute}>{renderPage()}</MainLayout>;
}
