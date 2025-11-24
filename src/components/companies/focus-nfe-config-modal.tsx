import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Company } from '../../types';
import { companyApi } from '../../lib/api-endpoints';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface FocusNfeConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onSuccess?: () => void;
}

export function FocusNfeConfigModal({ open, onOpenChange, company, onSuccess }: FocusNfeConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [formData, setFormData] = useState({
    focusNfeApiKey: '',
    focusNfeEnvironment: 'sandbox' as 'sandbox' | 'production',
    ibptToken: '',
  });

  useEffect(() => {
    if (open && company) {
      loadConfig();
    } else {
      // Reset form when modal closes
      setFormData({
        focusNfeApiKey: '',
        focusNfeEnvironment: 'sandbox',
        ibptToken: '',
      });
    }
  }, [open, company]);

  const loadConfig = async () => {
    if (!company) return;

    setLoadingConfig(true);
    try {
      const response = await companyApi.getFocusNfeConfig(company.id);
      if (response.data) {
        setFormData({
          focusNfeApiKey: response.data.focusNfeApiKey || '',
          focusNfeEnvironment: (response.data.focusNfeEnvironment || 'sandbox') as 'sandbox' | 'production',
          ibptToken: response.data.ibptToken || '',
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar configuração:', error);
      // Não mostrar erro se não houver configuração ainda
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setLoading(true);
    try {
      await companyApi.updateFocusNfeConfig(company.id, formData);
      toast.success('Configuração do Focus NFe salva com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar configuração do Focus NFe');
    } finally {
      setLoading(false);
    }
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar Focus NFe - {company.name}</DialogTitle>
          <DialogDescription>
            Configure a API Key e ambiente do Focus NFe para esta empresa. O certificado digital e senha devem ser configurados nas configurações da empresa.
          </DialogDescription>
        </DialogHeader>

        {loadingConfig ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="focusNfeApiKey">
                API Key do Focus NFe *
              </Label>
              <Input
                id="focusNfeApiKey"
                type="password"
                value={formData.focusNfeApiKey}
                onChange={(e) => setFormData({ ...formData, focusNfeApiKey: e.target.value })}
                placeholder="Digite a API Key do Focus NFe"
                required
              />
              <p className="text-xs text-muted-foreground">
                API Key específica desta empresa no Focus NFe
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focusNfeEnvironment">
                Ambiente *
              </Label>
              <Select
                value={formData.focusNfeEnvironment}
                onValueChange={(value) => setFormData({ ...formData, focusNfeEnvironment: value as 'sandbox' | 'production' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ambiente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Homologação)</SelectItem>
                  <SelectItem value="production">Production (Produção)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ambiente onde as notas fiscais serão emitidas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ibptToken">
                Token IBPT (Opcional)
              </Label>
              <Input
                id="ibptToken"
                type="password"
                value={formData.ibptToken}
                onChange={(e) => setFormData({ ...formData, ibptToken: e.target.value })}
                placeholder="Digite o token IBPT (opcional)"
              />
              <p className="text-xs text-muted-foreground">
                Token da API IBPT para consulta de tributos (opcional)
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
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

