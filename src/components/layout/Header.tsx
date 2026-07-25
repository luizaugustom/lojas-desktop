import { Menu, Moon, Sun, LogOut, Megaphone, CalendarRange } from 'lucide-react';
import { Button } from '../ui/button';
import { useUIStore } from '@/store/ui-store';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { AdminBroadcastDialog } from '../admin-broadcast-dialog';
import { DateRangeModal } from '../date-range/DateRangeModal';
import { NotesButton } from '../notes/NotesButton';
import { ContactsButton } from '../contacts/ContactsButton';
import { CalendarButton } from '../calendar/CalendarButton';
import { companyApi } from '@/lib/api-endpoints';
import { getImageUrl } from '@/lib/image-utils';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const { user } = useAuth();
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [dateRangeModalOpen, setDateRangeModalOpen] = useState(false);

  // Buscar logo da empresa quando o usuário mudar
  useEffect(() => {
    async function fetchCompanyLogo() {
      if (user?.companyId && (user.role === 'empresa' || user.role === 'vendedor')) {
        try {
          const response = await companyApi.myCompany();
          // companyApi.myCompany() retorna AxiosResponse, precisa acessar .data
          const logoUrl = response.data?.logoUrl;
          
          if (logoUrl && logoUrl.trim() !== '' && logoUrl !== 'null' && logoUrl !== 'undefined') {
            setCompanyLogoUrl(logoUrl);
          } else {
            setCompanyLogoUrl(null);
          }
        } catch (err) {
          console.error('Erro ao buscar logo da empresa:', err);
          setCompanyLogoUrl(null);
        }
      } else {
        setCompanyLogoUrl(null);
      }
    }
    fetchCompanyLogo();
  }, [user?.companyId, user?.role]);

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center gap-2 sm:gap-4 border-b bg-background"
      role="banner"
    >
      {/* Container dos botões do lado esquerdo com padding igual ao lado direito */}
      <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Botão de contatos (lado esquerdo) - empresa e vendedor */}
        <ContactsButton />
        {/* Botão de anotações (lado esquerdo) - empresa e vendedor */}
        <NotesButton />
        {/* Botão de agenda (lado esquerdo) - empresa e vendedor */}
        <CalendarButton />
      </div>

      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 justify-center">
        {/* Logomarca centralizada se existir */}
        {companyLogoUrl && companyLogoUrl.trim() !== '' && companyLogoUrl !== 'null' && companyLogoUrl !== 'undefined' ? (
          <div className="relative flex items-center justify-center h-14 w-[40%] max-w-[250px] mx-auto">
            <img
              src={getImageUrl(companyLogoUrl) || ''}
              alt="Logomarca da empresa"
              className="h-full w-full object-contain max-h-full"
              onError={() => {
                console.error('Erro ao carregar logo da empresa:', companyLogoUrl);
                setCompanyLogoUrl(null);
              }}
            />
          </div>
        ) : (
          <div className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
            {user?.name || 'Montshop'}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 lg:px-6">
        <NotificationBell />
        
        {user?.role === 'admin' && (
          <AdminBroadcastDialog>
            <Button 
              variant="ghost" 
              size="icon" 
              title="Enviar Novidades do Sistema"
              className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Enviar novidades do sistema"
            >
              <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </Button>
          </AdminBroadcastDialog>
        )}

        {/* Botão de filtro de data */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setDateRangeModalOpen(true)}
          className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Filtrar por período de datas"
          title="Filtrar dados por período"
        >
          <CalendarRange className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
        >
          {theme === 'light' ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Modal de filtro de data */}
      <DateRangeModal open={dateRangeModalOpen} onOpenChange={setDateRangeModalOpen} />
    </header>
  );
}
