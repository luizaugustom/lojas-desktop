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

interface FocusNfeConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onSuccess?: () => void;
}

/**
 * Modal de configuração FocusNFE por empresa.
 * Substitui o antigo `SefazFiscalConfigModal` (que ainda misturava NFe.io + SEFAZ).
 * Mostra:
 *  - Token FocusNFE (apiKey) e ambiente (sandbox/production)
 *  - Token IBPT (opcional)
 *  - Status do certificado A1 (se foi enviado à FocusNFE)
 *  - Senha do certificado (somente leitura, com botão de copiar)
 */
export function FocusNfeConfigModal({
  open,
  onOpenChange,
  company,
  onSuccess,
}: FocusNfeConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [fiscalConfig, setFiscalConfig] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    focusNfeApiKey: '',
    focusNfeEnvironment: 'sandbox' as 'sandbox' | 'production',
    ibptToken: '',
  });

  const loadConfig = useCallback(async () => {
    if (!company) return;

    setLoadingConfig(true);
    try {
      // Carrega config FocusNFE (do Admin) e config fiscal (da Empresa) em paralelo.
      const [focusResponse, fiscalResponse] = await Promise.all([
        companyApi.getFocusNfeConfigForAdmin(company.id),
        companyApi.getFiscalConfigForAdmin(company.id),
      ]);

      const focus = focusResponse.data;
      setFormData({
        focusNfeApiKey: focus?.focusNfeApiKey || '',
        focusNfeEnvironment: focus?.focusNfeEnvironment === 'production' ? 'production' : 'sandbox',
        ibptToken: focus?.ibptToken || '',
      });
      setFiscalConfig(fiscalResponse.data);
    } catch (error: any) {
      console.error('Erro ao carregar configurações FocusNFE:', error);
      toast.error('Erro ao carregar configurações FocusNFE');
    } finally {
      setLoadingConfig(false);
    }
  }, [company]);

  useEffect(() => {
    if (open && company) {
      loadConfig();
    } else {
      setFormData({ focusNfeApiKey: '', focusNfeEnvironment: 'sandbox', ibptToken: '' });
      setFiscalConfig(null);
    }
  }, [open, company, loadConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setLoading(true);
    try {
      await companyApi.updateFocusNfeConfigForAdmin(company.id, {
        focusNfeApiKey: formData.focusNfeApiKey.trim(),
        focusNfeEnvironment: formData.focusNfeEnvironment,
        ibptToken: formData.ibptToken.trim() || undefined,
      });
      toast.success('Configuração FocusNFE salva com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar configuração FocusNFE');
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
          <DialogTitle>Configuração FocusNFE — {company.name}</DialogTitle>
          <DialogDescription>
            Token da API FocusNFE, ambiente de emissão e visualização do certificado digital A1.
          </DialogDescription>
        </DialogHeader>

        {loadingConfig ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="focusNfeApiKey">Token FocusNFE *</Label>
              <Input
                id="focusNfeApiKey"
                type="password"
                value={formData.focusNfeApiKey}
                onChange={(e) => setFormData({ ...formData, focusNfeApiKey: e.target.value })}
                placeholder="Token da API FocusNFE (v2)"
              />
              <p className="text-xs text-muted-foreground">
                Obrigatório. Token da conta FocusNFE (v2) para emissão de NF-e/NFC-e.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focusNfeEnvironment">Ambiente FocusNFE *</Label>
              <Select
                value={formData.focusNfeEnvironment}
                onValueChange={(value) =>
                  setFormData({ ...formData, focusNfeEnvironment: value as 'sandbox' | 'production' })
                }
              >
                <SelectTrigger id="focusNfeEnvironment">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Homologação (testes)</SelectItem>
                  <SelectItem value="production">Produção</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define se as notas serão emitidas no ambiente de testes ou produção da FocusNFE.
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
                Opcional. Armazenado no Admin para consultas IBPT.
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
                      fiscalConfig.certificateUploadedAt
                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                        : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                    }`}
                  >
                    {fiscalConfig.certificateUploadedAt
                      ? `✅ Arquivo ${fiscalConfig.certificateFileName || '.pfx/.p12'} enviado à FocusNFE em ${new Date(
                          fiscalConfig.certificateUploadedAt,
                        ).toLocaleString('pt-BR')}.`
                      : '⚠️ Nenhum certificado A1 foi enviado à FocusNFE. A empresa deve enviar o .pfx em Configurações → Certificado Digital.'}
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
