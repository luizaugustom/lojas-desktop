import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { DeviceProvider } from './contexts/DeviceContext';
import { useUIStore } from './store/ui-store';
import TitleBar from './components/layout/TitleBar';
import AppRouter from './components/routing/AppRouter';
import { CompanyColorProvider } from './components/CompanyColorProvider';
import UpdateNotification from './components/UpdateNotification';
import { initNativeNotifications } from './services/notifications';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

function App() {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const updatePrimaryColor = useUIStore((state) => state.updatePrimaryColor);

  useEffect(() => {
    // Inicializar tema do localStorage ou usar tema do sistema
    const initTheme = async () => {
      try {
        // Primeiro verifica o localStorage (preferência do usuário)
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        
        if (savedTheme) {
          setTheme(savedTheme);
        } else if (window.electronAPI) {
          // Se não houver tema salvo, usar o tema do sistema
          const systemTheme = await window.electronAPI.theme.getSystemTheme();
          setTheme(systemTheme);

          // Listener para mudanças de tema do sistema (só se não houver preferência salva)
          window.electronAPI.theme.onThemeChanged((newTheme: 'light' | 'dark') => {
            const saved = localStorage.getItem('theme');
            if (!saved) {
              setTheme(newTheme);
            }
          });
        } else {
          // Fallback para navegador
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDark ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Erro ao inicializar tema:', error);
        // Fallback em caso de erro
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
          setTheme(savedTheme);
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDark ? 'dark' : 'light');
        }
      }
    };

    initTheme();

    // Inicializa a cor primária (azul padrão se não houver cor da empresa)
    // Isso garante que os botões e scrollbar tenham cor desde o início
    updatePrimaryColor();

    // Inicializa listener de notificações nativas (Ponto Eletrônico, etc.)
    initNativeNotifications();
  }, [setTheme, updatePrimaryColor]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DeviceProvider>
          <CompanyColorProvider>
            <div className={`app-container ${theme}`}>
              <TitleBar />
              <div className="app-content">
                <AppRouter />
              </div>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                    border: '1px solid hsl(var(--border))',
                  },
                  success: {
                    iconTheme: {
                      primary: 'hsl(var(--primary))',
                      secondary: 'white',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: 'hsl(var(--destructive))',
                      secondary: 'white',
                    },
                  },
                }}
              />
              {window.electronAPI && <UpdateNotification />}
            </div>
          </CompanyColorProvider>
        </DeviceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

