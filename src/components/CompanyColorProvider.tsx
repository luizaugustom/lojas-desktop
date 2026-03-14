import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../store/ui-store';
import { useQuery } from '@tanstack/react-query';
import { companyApi } from '../lib/api-endpoints';
import { logger } from '@/lib/logger';

export function CompanyColorProvider({ children }: { children: React.ReactNode }) {
  const setCompanyColor = useUIStore((state) => state.setCompanyColor);
  const { user } = useAuth();

  // Buscar cor da empresa quando o usuário tiver companyId
  const { data: companyData } = useQuery({
    queryKey: ['my-company', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) return null;
      try {
        const response = await companyApi.myCompany();
        return response.data || response;
      } catch (error) {
        logger.error('Erro ao buscar empresa:', error);
        return null;
      }
    },
    enabled: !!user?.companyId && (user.role === 'empresa' || user.role === 'vendedor'),
  });

  // Atualiza a cor da empresa quando ela mudar
  useEffect(() => {
    if (companyData?.brandColor) {
      logger.log('Aplicando cor da empresa:', companyData.brandColor);
      setCompanyColor(companyData.brandColor);
    } else {
      setCompanyColor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyData?.brandColor]);

  return <>{children}</>;
}

