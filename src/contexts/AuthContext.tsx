import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authLogin, authLogout, getAccessToken, setAccessToken, api } from '../lib/apiClient';
import toast from 'react-hot-toast';
import type { User } from '../types';
import { getComputerId, detectAllDevices } from '../lib/device-detection';
import { printerApi, scaleApi } from '../lib/api-endpoints';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  api: typeof api;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tentar recuperar sessão
    const init = async () => {
      const token = getAccessToken();
      if (token) {
        // Verificar se token ainda é válido fazendo refresh
        try {
          const data = await authLogin('', ''); // Isso vai falhar, mas vamos fazer refresh
          // Se chegou aqui, token é válido (não deveria)
        } catch {
          // Token inválido, limpar
          setAccessToken(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Função para detectar e registrar dispositivos do computador
  const detectAndRegisterDevices = useCallback(async () => {
    try {
      const computerId = getComputerId();
      console.log('[AuthContext] Detectando dispositivos para computador:', computerId);

      // Detecta todos os dispositivos disponíveis
      const { printers, scales } = await detectAllDevices();

      // Registra impressoras no backend
      if (printers.length > 0) {
        try {
          await printerApi.registerDevices({ computerId, printers });
          console.log(`[AuthContext] ${printers.length} impressora(s) registrada(s)`);
        } catch (error) {
          console.error('[AuthContext] Erro ao registrar impressoras:', error);
        }
      }

      // Registra balanças no backend
      if (scales.length > 0) {
        try {
          await scaleApi.registerDevices({ computerId, scales });
          console.log(`[AuthContext] ${scales.length} balança(s) registrada(s)`);
        } catch (error) {
          console.error('[AuthContext] Erro ao registrar balanças:', error);
        }
      }

      if (printers.length === 0 && scales.length === 0) {
        console.log('[AuthContext] Nenhum dispositivo detectado automaticamente. O usuário pode selecionar manualmente.');
      }
    } catch (error) {
      console.error('[AuthContext] Erro ao detectar dispositivos:', error);
    }
  }, []);

  const login = async (loginStr: string, password: string) => {
    try {
      const data = await authLogin(loginStr, password);
      setAccessToken(data.access_token);
      
      // Normalizar role da API para o frontend (igual ao frontend)
      let normalizedRole = data.user?.role;
      if (normalizedRole) {
        const roleMap: Record<string, string> = {
          'admin': 'admin',
          'company': 'empresa',
          'seller': 'vendedor',
        };
        normalizedRole = roleMap[normalizedRole] || normalizedRole;
      }
      
      const normalizedUser = {
        ...data.user,
        role: normalizedRole
      };
      
      console.log('[AuthContext] Login realizado:', { 
        originalRole: data.user?.role, 
        normalizedRole: normalizedUser.role, 
        user: normalizedUser 
      });
      
      setUser(normalizedUser);
      toast.success('Login realizado com sucesso!');
      
      // Detectar e registrar dispositivos do computador após login bem-sucedido
      try {
        console.log('[AuthContext.login] Detectando dispositivos do computador...');
        await detectAndRegisterDevices();
      } catch (deviceError) {
        console.error('[AuthContext.login] Erro ao detectar dispositivos:', deviceError);
        // Não bloqueia o login se houver erro na detecção de dispositivos
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao fazer login';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setAccessToken(null);
      setUser(null);
      toast.success('Logout realizado com sucesso!');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        api,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

