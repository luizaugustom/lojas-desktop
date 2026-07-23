import { useEffect, useState } from 'react';
import { Lock, Save, Store } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { handleApiError } from '@/lib/handleApiError';
import { toast } from 'react-hot-toast';

export interface CatalogoSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://montshop.app').replace(
  /\/+$/,
  '',
);

const withPublicSiteUrl = (path?: string | null) => {
  if (!path) return null;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_SITE_URL}${normalizedPath}`;
};

export function CatalogoSettings({ locked, lockReason }: CatalogoSettingsProps) {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({ url: '', enabled: false });

  if (locked) {
    return (
      <Alert className="border-destructive/40 bg-destructive/5">
        <Lock className="h-4 w-4 text-destructive" aria-hidden />
        <AlertDescription>
          {lockReason ?? 'Esta categoria está bloqueada para a sua empresa.'}
        </AlertDescription>
      </Alert>
    );
  }

  const load = async () => {
    try {
      setLoading(true);
      const response = await api.get('/company/my-company/catalog-page');
      setConfig(response.data);
      setForm({
        url: response.data.catalogPageUrl || '',
        enabled: response.data.catalogPageEnabled || false,
      });
      if (response.data.catalogPageAllowed === false) {
        setForm((prev) => ({ ...prev, enabled: false }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da página de catálogo:', error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      if (form.enabled && !form.url) {
        toast.error('Informe uma URL para a página de catálogo');
        return;
      }
      const updates: any = {};
      if (form.url) updates.catalogPageUrl = form.url;
      if (form.enabled !== config?.catalogPageEnabled) {
        updates.catalogPageEnabled = form.enabled;
      }
      await api.patch('/company/my-company/catalog-page', updates);
      toast.success('Configurações da página de catálogo atualizadas com sucesso!');
      await load();
    } catch (error: any) {
      console.error('Erro ao atualizar página de catálogo:', error);
      handleApiError(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleEnabled = async (nextEnabled: boolean) => {
    try {
      setUpdating(true);
      await api.patch('/company/my-company/catalog-page', { catalogPageEnabled: nextEnabled });
      setForm((prev) => ({ ...prev, enabled: nextEnabled }));
      toast.success(nextEnabled ? 'Página de catálogo ativada!' : 'Página de catálogo desativada.');
      await load();
    } catch (error: any) {
      console.error('Erro ao alterar catálogo:', error);
      setForm((prev) => ({ ...prev, enabled: !nextEnabled }));
      handleApiError(error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const previewUrl = form.url ? withPublicSiteUrl(`/catalog/${form.url}`) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Página de Catálogo Pública
        </CardTitle>
        <CardDescription>
          Crie uma página pública de catálogo para exibir seus produtos na web
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${form.enabled ? 'bg-green-500' : 'bg-gray-400'}`}
            />
            <div>
              <p className="font-medium">{form.enabled ? 'Página Ativa' : 'Página Desativada'}</p>
              {form.enabled && previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {previewUrl}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="catalog-url">
              URL da Página (apenas letras minúsculas, números, hífen e underscore)
            </Label>
            <Input
              id="catalog-url"
              value={form.url}
              onChange={(e) =>
                setForm({ ...form, url: e.target.value.toLowerCase() })
              }
              placeholder="exemplo: masolucoes"
              disabled={updating}
            />
            <p className="text-xs text-muted-foreground">
              Exemplo: se você digitar &quot;masolucoes&quot;, sua página será acessível em{' '}
              {`${PUBLIC_SITE_URL}/catalog/masolucoes`}
            </p>
          </div>

          {config?.catalogPageAllowed === false && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Permissão não autorizada
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                A empresa não tem permissão para usar catálogo digital. Entre em contato com o
                administrador para autorizar esta funcionalidade.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Ativar Página</p>
              <p className="text-sm text-muted-foreground">
                Torna sua página de catálogo acessível publicamente
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => handleToggleEnabled(e.target.checked)}
                className="sr-only peer"
                disabled={updating || config?.catalogPageAllowed === false}
              />
              <div
                className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary ${
                  config?.catalogPageAllowed === false ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </label>
          </div>

          <Button onClick={handleUpdate} disabled={updating} className="w-full">
            {updating ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Sobre a Página de Catálogo
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Lista todos os seus produtos com estoque disponível</li>
            <li>• Exibe fotos, preços e informações dos produtos</li>
            <li>• Mostra suas informações de contato (telefone, email, endereço)</li>
            <li>• Acesso público - não requer login</li>
            <li>• Compartilhe o link com seus clientes!</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default CatalogoSettings;
