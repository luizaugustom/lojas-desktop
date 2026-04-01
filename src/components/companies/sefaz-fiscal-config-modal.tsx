import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Company } from '../../types';
import { companyApi } from '../../lib/api-endpoints';
import { toast } from 'react-hot-toast';
import { Loader2, Lock, Eye, EyeOff, Copy } from 'lucide-react';

interface SefazFiscalConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onSuccess?: () => void;
}

export function SefazFiscalConfigModal({
  open,
  onOpenChange,
  company,
  onSuccess,
}: SefazFiscalConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingFiscalConfig, setLoadingFiscalConfig] = useState(false);
  const [fiscalConfig, setFiscalConfig] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    sefazEnvironment: 'homologacao' as 'homologacao' | 'producao',
    ibptToken: '',
  });

  const loadFiscalConfig = useCallback(async () => {
    if (!company) return;

    setLoadingFiscalConfig(true);
    try {
      const response = await companyApi.getFiscalConfigForAdmin(company.id);
      const data = response.data;
      setFiscalConfig(data);
      setFormData({
        sefazEnvironment: (data?.sefazEnvironment || 'homologacao') as 'homologacao' | 'producao',
        ibptToken: data?.ibptToken || '',
      });
    } catch (error: any) {
      console.error('Erro ao carregar configurações fiscais:', error);
      toast.error('Erro ao carregar configurações fiscais');
    } finally {
      setLoadingFiscalConfig(false);
    }
  }, [company]);

  useEffect(() => {
    if (open && company) {
      loadFiscalConfig();
    } else {
      setFormData({ sefazEnvironment: 'homologacao', ibptToken: '' });
      setFiscalConfig(null);
    }
  }, [open, company, loadFiscalConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setLoading(true);
    try {
      await companyApi.updateFiscalConfigForAdmin(company.id, {
        sefazEnvironment: formData.sefazEnvironment,
        ibptToken: formData.ibptToken.trim() || undefined,
      });
      toast.success('Configuração fiscal (SEFAZ) salva com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar configuração fiscal');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!fiscalConfig?.certificatePassword) {
      toast.error('Senha não disponível');
      return;
    }
    navigator.clipboard.writeText(fiscalConfig.certificatePassword);
    toast.success('Senha copiada para a área de transferência!');
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuração fiscal — {company.name}</DialogTitle>
          <DialogDescription>
            Ambiente SEFAZ (homologação ou produção), token IBPT opcional e visão do certificado digital A1.
          </DialogDescription>
        </DialogHeader>

        {loadingFiscalConfig ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sefazEnvironment">Ambiente SEFAZ *</Label>
              <Select
                value={formData.sefazEnvironment}
                onValueChange={(value) =>
                  setFormData({ ...formData, sefazEnvironment: value as 'homologacao' | 'producao' })
                }
              >
                <SelectTrigger id="sefazEnvironment">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homologacao">Homologação (testes)</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define para qual ambiente da SEFAZ as NF-e / NFC-e serão transmitidas.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ibptToken">Token IBPT (opcional)</Label>
              <Input
                id="ibptToken"
                type="password"
                value={formData.ibptToken}
                onChange={(e) => setFormData({ ...formData, ibptToken: e.target.value })}
                placeholder="Token para tributos aproximados (Lei 12.741)"
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Armazenado na empresa para consultas IBPT.
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Certificado digital A1
              </h3>
              {fiscalConfig ? (
                <div className="space-y-4">
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      fiscalConfig.hasCertificateBlob
                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                        : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                    }`}
                  >
                    {fiscalConfig.hasCertificateBlob
                      ? '✅ Arquivo .pfx / .p12 armazenado no servidor (BLOB).'
                      : '⚠️ Nenhum certificado A1 no servidor. A empresa deve enviar o .pfx em Configurações.'}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Senha do certificado</Label>
                      {fiscalConfig.certificatePassword && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyPassword}
                          className="h-7 text-xs"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={fiscalConfig.certificatePassword || ''}
                        readOnly
                        className="flex-1 font-mono text-sm"
                        placeholder={fiscalConfig.certificatePassword ? '••••••••' : 'Não configurada'}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={!fiscalConfig.certificatePassword}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Não foi possível carregar os dados fiscais.
                </p>
              )}
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
