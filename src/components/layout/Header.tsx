import { Menu, Moon, Sun, LogOut, Megaphone, RefreshCw, CalendarRange } from 'lucide-react';
import { Button } from '../ui/button';
import { useUIStore } from '@/store/ui-store';
import { useAuth } from '@/contexts/AuthContext';
import { useDeviceStore } from '@/store/device-store';
import { NotificationBell } from '../notifications/NotificationBell';
import { AdminBroadcastDialog } from '../admin-broadcast-dialog';
import { DateRangeModal } from '../date-range/DateRangeModal';
import { NotesButton } from '../notes/NotesButton';
import { ContactsButton } from '../contacts/ContactsButton';
import { CalendarButton } from '../calendar/CalendarButton';
import { checkPrinterStatus } from '@/lib/printer-check';
import { companyApi } from '@/lib/api-endpoints';
import { getImageUrl } from '@/lib/image-utils';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const { user } = useAuth();
  const { printerStatus, printerName } = useDeviceStore();
  const [checkingPrinter, setCheckingPrinter] = useState(false);
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

  const handleCheckPrinter = async () => {
    setCheckingPrinter(true);
    try {
      toast.loading('Verificando impressoras...', { id: 'printer-check' });
      const result = await checkPrinterStatus();
      
      if (result.success) {
        toast.success(result.message, { id: 'printer-check' });
      } else {
        toast.error(result.message, { id: 'printer-check' });
      }
    } catch (error) {
      console.error('Erro ao verificar impressoras:', error);
      toast.error('Erro ao verificar impressoras', { id: 'printer-check' });
    } finally {
      setCheckingPrinter(false);
    }
  };

  useEffect(() => {
    checkPrinterStatus().catch((error) => {
      console.error('[Header] Erro ao inicializar status da impressora:', error);
    });
  }, []);

  const printerTooltip =
    printerStatus === 'connected'
      ? printerName
        ? `Impressora configurada: ${printerName}`
        : 'Impressora configurada e pronta'
      : printerStatus === 'checking'
        ? 'Verificando impressora configurada'
        : printerStatus === 'error'
          ? printerName
            ? `Erro ao acessar a impressora "${printerName}".`
            : 'Erro ao acessar a impressora configurada.'
          : 'Nenhuma impressora configurada.';

  const printerDisplayName =
    printerStatus === 'checking'
      ? 'Verificando...'
      : printerName || 'Sem impressora';

  const printerStatusSuffix =
    printerStatus === 'error'
      ? ' (erro)'
      : printerStatus === 'disconnected'
        ? ' (desconectada)'
        : '';

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
            {user?.name || 'MontShop'}
          </div>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-2 mr-2">
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
            printerStatus === 'connected' 
              ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
              : printerStatus === 'checking'
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                : printerStatus === 'error'
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
          title={printerTooltip}
        >
          <span className="text-[11px]">🖨️</span>
          <span className="text-[11px] font-medium truncate max-w-[140px]">
            {printerDisplayName}
            {printerStatusSuffix}
          </span>
        </div>

        {/* Botão de atualizar impressora */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCheckPrinter}
          disabled={checkingPrinter}
          title="Verificar impressoras manualmente"
        >
          <RefreshCw className={`h-4 w-4 ${checkingPrinter ? 'animate-spin' : ''}`} />
        </Button>
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

