import { useEffect, useState } from 'react';
import { AlertCircle, Banknote, Lock, Save } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { companyApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { toast } from 'react-hot-toast';

export interface BoletosSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

export function BoletosSettings({ locked, lockReason }: BoletosSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);

  const boletoAllowed = companyData?.boletoAllowed !== false;

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
      const response = await companyApi.myCompany();
      setCompanyData(response.data);
      setEnabled(!!response.data?.boletoEnabled);
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await companyApi.updateMyCompany({ boletoEnabled: enabled });
      toast.success('Configuração de boleto salva!');
      await load();
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Boletos
        </CardTitle>
        <CardDescription>
          Ative o módulo de boletos. Os boletos são emitidos via Unimake e-Boleto, com credenciais
          gerenciadas exclusivamente pelo administrador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!boletoAllowed && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Para ativar boletos, é necessária a liberação do administrador. Entre em contato com
              o suporte.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Ativar boletos</Label>
              <p className="text-sm text-muted-foreground">
                Habilita a página de gestão de boletos e a opção de emitir boleto junto à nota
                fiscal.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!boletoAllowed}
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm">Boleto Unimake configurado</Label>
                <p className="text-xs text-muted-foreground">
                  Tokens (appId/appKey) são gerenciados exclusivamente pelo administrador.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  (companyData as any)?.unimakeConfigured
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                }`}
              >
                {(companyData as any)?.unimakeConfigured ? 'Sim' : 'Não'}
              </span>
            </div>
            {(companyData as any)?.unimakeSandbox !== undefined && (
              <p className="text-xs text-muted-foreground">
                Ambiente atual:{' '}
                {(companyData as any)?.unimakeSandbox ? 'Sandbox (testes)' : 'Produção'}
              </p>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default BoletosSettings;
