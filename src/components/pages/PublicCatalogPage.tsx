import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBasicCatalogInfo } from '@/hooks/useBasicCatalog';
import { BasicCatalogView } from '@/components/public-catalog/BasicCatalogView';
import { BasicCatalogSkeleton } from '@/components/public-catalog/BasicCatalogSkeleton';
import { BasicCatalogError } from '@/components/public-catalog/BasicCatalogError';

export default function PublicCatalogPage() {
  const { api } = useAuth();
  const [catalogUrl, setCatalogUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/company/my-company/catalog-page');
        if (!mounted) return;
        setCatalogUrl(res.data?.catalogPageUrl ?? null);
      } catch (err: any) {
        if (!mounted) return;
        setLoadError(err?.message ?? 'Erro ao carregar configurações');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [api]);

  // Validação reativa: checa se a página está habilitada antes de tentar buscar dados.
  const info = useBasicCatalogInfo(catalogUrl ?? '');

  if (loadError) {
    return (
      <div className="catalog-root min-h-full">
        <BasicCatalogError />
      </div>
    );
  }
  if (!catalogUrl) {
    return (
      <div className="catalog-root mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="text-base text-slate-700">
          Sua empresa ainda não possui uma URL de catálogo configurada.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Vá em <strong>Configurações → Catálogo</strong> e defina uma URL pública.
        </p>
      </div>
    );
  }

  if (info.isLoading) {
    return (
      <div className="catalog-root min-h-full">
        <BasicCatalogSkeleton />
      </div>
    );
  }
  if (info.error || !info.data) {
    return (
      <div className="catalog-root min-h-full">
        <BasicCatalogError onRetry={() => info.refetch()} />
      </div>
    );
  }

  return <BasicCatalogView url={catalogUrl} />;
}