import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/store/ui-store';
import { useAuth } from '@/contexts/AuthContext';
import { TrialConversionModal } from '../trial/trial-conversion-modal';
import { TermsAcceptanceModal } from '../terms/TermsAcceptanceModal';
import { PlanType } from '@/types';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companyApi } from '@/lib/api-endpoints';

interface MainLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}

export function MainLayout({ currentRoute, onNavigate, children }: MainLayoutProps) {
  const { sidebarCollapsed } = useUIStore();
  const { logout, user, isAuthenticated } = useAuth();
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Buscar dados da empresa para verificar aceitação de termos
  const { data: company } = useQuery({
    queryKey: ['company', 'my-company'],
    queryFn: () => companyApi.myCompany().then(res => res.data),
    enabled: isAuthenticated && user?.role !== 'admin' && user?.role !== 'vendedor',
  });

  // Verificar se deve mostrar o modal de termos de uso
  useEffect(() => {
    if (company && company.termsAccepted !== true) {
      // Mostrar modal de termos imediatamente (obrigatório)
      setShowTermsModal(true);
      return;
    }
  }, [company]);

  // Verificar se deve mostrar o modal de conversão do plano TRIAL
  useEffect(() => {
    if (user && user.role === 'empresa' && (user as any).plan && (user as any).plan === PlanType.TRIAL_7_DAYS && company?.termsAccepted === true) {
      // Só mostrar modal de trial se os termos já foram aceitos
      const hideUntil = localStorage.getItem('trialModalHideUntil');
      if (hideUntil) {
        const hideUntilDate = new Date(hideUntil);
        const now = new Date();
        if (hideUntilDate > now) {
          return;
        }
      }
      const timer = setTimeout(() => {
        setShowTrialModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, company]);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <Sidebar currentRoute={currentRoute} onNavigate={onNavigate} />
      <div
        className="flex flex-1 flex-col overflow-hidden lg:ml-0"
        style={{
          marginLeft: '0',
          paddingLeft: sidebarCollapsed ? '4rem' : '16rem',
          transition: 'padding-left 0.3s ease-in-out',
        }}
      >
        <Header onLogout={logout} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      
      {/* Modal de Aceitação de Termos de Uso */}
      <TermsAcceptanceModal
        open={showTermsModal}
        companyName={company?.name}
        onAccept={() => {
          setShowTermsModal(false);
          // Recarregar dados da empresa para atualizar o estado
          window.location.reload();
        }}
        onReject={() => {
          logout();
        }}
      />
      {/* Modal de Conversão do Plano TRIAL */}
      {(user as any)?.plan && (user as any).plan === PlanType.TRIAL_7_DAYS && company?.termsAccepted === true && (
        <TrialConversionModal
          open={showTrialModal}
          onOpenChange={setShowTrialModal}
          plan={(user as any).plan}
        />
      )}
    </div>
  );
}

