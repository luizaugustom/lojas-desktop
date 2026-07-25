import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Company } from '../../types';
import { adminApi, companyApi } from '../../lib/api-endpoints';
import { toast } from 'react-hot-toast';
import { Loader2, Key, Banknote } from 'lucide-react';

interface UnimakeConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onSuccess?: () => void;
}

/**
 * Modal de configuração Unimake (e-Boleto) por empresa — uso exclusivo do Admin.
 * Espelha o padrão do FocusNfeConfigModal na lista de Empresas.
 */
export function UnimakeConfigModal({
  open,
  onOpenChange,
  company,
  onSuccess,
}: UnimakeConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [hasCertificateA1, setHasCertificateA1] = useState(false);
  const [formData, setFormData] = useState({
    appId: '',
    configurationId: '',
    appKey: '',
    sandbox: true,
  });

  const loadConfig = useCallback(async () => {
    if (!company) return;

    setLoadingConfig(true);
    try {
      const [unimakeRes, fiscalRes] = await Promise.all([
        adminApi.getCompanyUnimake(company.id),
        companyApi.getFiscalConfigForAdmin(company.id).catch(() => null),
      ]);
      const cfg = unimakeRes.data;
      setFormData({
        appId: cfg?.appId ?? '',
        configurationId: cfg?.configurationId ?? '',
        appKey: '',
        sandbox: cfg?.sandbox ?? true,
      });
      setConfigured(!!cfg?.configured);
      const fiscal = fiscalRes?.data;
      setHasCertificateA1(
        !!(
          (company as any).hasCertificateBlob ||
          fiscal?.certificateFileData ||
          fiscal?.certificateUploadedAt ||
          fiscal?.hasCertificateBlob
        ),
      );
    } catch (error) {
      console.error('Erro ao carregar configuração Unimake:', error);
      toast.error('Erro ao carregar configuração Unimake');
    } finally {
      setLoadingConfig(false);
    }
  }, [company]);

  useEffect(() => {
    if (open && company) {
      loadConfig();
    } else {
      setFormData({ appId: '', configurationId: '', appKey: '', sandbox: true });
      setConfigured(false);
      setHasCertificateA1(false);
    }
  }, [open, company, loadConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    if (!formData.appId.trim()) {
      toast.error('Informe o App ID');
      return;
    }
    if (!formData.configurationId.trim()) {
      toast.error('Informe o Configuration ID');
      return;
    }
    if (!configured && !formData.appKey.trim()) {
      toast.error('Informe a App Key');
      return;
    }

    setLoading(true);
    try {
      const payload: {
        appId: string;
        configurationId: string;
        sandbox: boolean;
        appKey?: string;
      } = {
        appId: formData.appId.trim(),
        configurationId: formData.configurationId.trim(),
        sandbox: formData.sandbox,
      };
      if (formData.appKey.trim()) {
        payload.appKey = formData.appKey.trim();
      }

      await adminApi.updateCompanyUnimake(company.id, payload);
      toast.success(`Unimake configurado para ${company.name}.`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar configuração Unimake:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar configuração Unimake');
    } finally {
      setLoading(false);
    }
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Configurar Boletos (Unimake) — {company.name}
          </DialogTitle>
          <DialogDescription>
            Credenciais Unimake e-Boleto desta empresa. A App Key é criptografada e nunca é
            exposta novamente.
          </DialogDescription>
        </DialogHeader>

        {loadingConfig ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unimake-appId">App ID *</Label>
              <Input
                id="unimake-appId"
                value={formData.appId}
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                placeholder="App ID Unimake (painel do cliente)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unimake-configurationId">Configuration ID *</Label>
              <Input
                id="unimake-configurationId"
                value={formData.configurationId}
                onChange={(e) => setFormData({ ...formData, configurationId: e.target.value })}
                placeholder="ID da configuração Unimake (por empresa/ambiente)"
              />
              <p className="text-xs text-muted-foreground">
                Obrigatório como query string em todas as chamadas ao provedor.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unimake-appKey">
                App Key {configured ? '(deixe em branco para manter)' : '*'}
              </Label>
              <Input
                id="unimake-appKey"
                type="password"
                value={formData.appKey}
                onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                {configured
                  ? 'Deixe em branco para manter a App Key já configurada.'
                  : 'Informe a App Key secreta do painel Unimake.'}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Ambiente Sandbox</Label>
                <p className="text-xs text-muted-foreground">
                  Use produção somente após validar todos os fluxos em sandbox.
                </p>
              </div>
              <Switch
                checked={formData.sandbox}
                onCheckedChange={(checked) => setFormData({ ...formData, sandbox: checked })}
              />
            </div>

            <div
              className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
                hasCertificateA1
                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                  : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
              }`}
            >
              <Key className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {hasCertificateA1
                  ? 'Certificado A1 cadastrado para esta empresa — pronto para emitir boletos.'
                  : 'Esta empresa ainda não possui Certificado A1 cadastrado. A emissão de boletos falhará até que seja enviado na ficha fiscal da empresa.'}
              </span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
