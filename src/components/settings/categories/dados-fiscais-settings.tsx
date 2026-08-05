import { useEffect, useState } from 'react';
import { Lock, Save, Store } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Switch } from '../../ui/switch';
import { companyApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { toast } from 'react-hot-toast';

export interface DadosFiscaisSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

export function DadosFiscaisSettings({ locked, lockReason }: DadosFiscaisSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({
    taxRegime: 'SIMPLES_NACIONAL',
    cnae: '',
    stateRegistration: '',
    municipioIbge: '',
    nfceSerie: '1',
    nfeSerie: '1',
    focusNfeEnvironment: 'sandbox' as 'sandbox' | 'production',
    csc: '',
    idTokenCsc: '000001',
    aliquotaCbsDefault: '0.9',
    aliquotaIbsDefault: '0.1',
  });

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
      const response = await companyApi.getFiscalConfig();
      const data = response.data;
      setConfig(data);
      setForm({
        taxRegime: data.taxRegime || 'SIMPLES_NACIONAL',
        cnae: data.cnae || '',
        stateRegistration: data.stateRegistration || '',
        municipioIbge: data.municipioIbge || '',
        nfceSerie: data.nfceSerie || '1',
        nfeSerie: data.nfeSerie || '1',
        focusNfeEnvironment: (data.focusNfeEnvironment || 'sandbox') as 'sandbox' | 'production',
        csc: data.csc || '',
        idTokenCsc: data.idTokenCsc || '000001',
        aliquotaCbsDefault: data.aliquotaCbsDefault?.toString() || '0.9',
        aliquotaIbsDefault: data.aliquotaIbsDefault?.toString() || '0.1',
      });
    } catch (error) {
      console.error('Erro ao carregar configurações fiscais:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!form.municipioIbge) {
      toast.error('Código IBGE do município é obrigatório');
      return;
    }
    if (form.municipioIbge.length !== 7) {
      toast.error('Código IBGE deve ter 7 dígitos');
      return;
    }

    try {
      setSaving(true);
      const response = await companyApi.updateFiscalConfig({
        ...form,
        aliquotaCbsDefault:
          form.aliquotaCbsDefault === '' ? undefined : Number(form.aliquotaCbsDefault),
        aliquotaIbsDefault:
          form.aliquotaIbsDefault === '' ? undefined : Number(form.aliquotaIbsDefault),
      });
      const data = response.data ?? {};
      if (data.cscSyncWarning) {
        toast.error(
          data.message ||
            'CSC salvo localmente, mas não sincronizado com a FocusNFE. Verifique o token e o painel Focus.',
          { duration: 8000 },
        );
      } else {
        toast.success('Dados fiscais salvos com sucesso!');
      }
      await load();
    } catch (error: any) {
      console.error('Erro ao salvar dados fiscais:', error);
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEmitOnlyNfeToggle = async (checked: boolean) => {
    try {
      await companyApi.updateFiscalConfig({ emitOnlyNfe: checked });
      setConfig((prev: any) => (prev ? { ...prev, emitOnlyNfe: checked } : prev));
      toast.success(checked ? 'Emissão somente NFe ativada' : 'Emissão somente NFe desativada');
    } catch (err: any) {
      handleApiError(err);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Dados Fiscais para Emissão de NFC-e
        </CardTitle>
        <CardDescription>
          Configure os dados obrigatórios para emissão de notas fiscais eletrônicas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!config?.hasCertificateBlob || !config?.hasCertificatePassword ? (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100 font-semibold mb-1">
              ⚠️ Certificado A1 e senha necessários para a SEFAZ
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              A emissão de NF-e e NFC-e é feita diretamente com a SEFAZ. Configure a senha e envie o
              arquivo .pfx ou .p12 na seção &quot;Certificado Digital&quot;.
            </p>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-900 dark:text-green-100 font-semibold mb-1">
              ✅ Certificado digital pronto
            </p>
            <p className="text-sm text-green-800 dark:text-green-200">
              Certificado A1 e senha configurados.
            </p>
          </div>
        )}

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="taxRegime">Regime Tributário *</Label>
            <Select
              value={form.taxRegime}
              onValueChange={(value) => setForm({ ...form, taxRegime: value })}
            >
              <SelectTrigger id="taxRegime">
                <SelectValue placeholder="Selecione o regime tributário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                <SelectItem value="SIMPLES_NACIONAL_EXCESSO">Simples Nacional - Excesso</SelectItem>
                <SelectItem value="LUCRO_PRESUMIDO">Lucro Presumido</SelectItem>
                <SelectItem value="LUCRO_REAL">Lucro Real</SelectItem>
                <SelectItem value="MEI">MEI</SelectItem>
              </SelectContent>
            </Select>
            {config?.taxRegime && (
              <p className="text-xs text-muted-foreground">✅ Configurado: {config.taxRegime}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stateRegistration">Inscrição Estadual *</Label>
            <Input
              id="stateRegistration"
              value={form.stateRegistration}
              onChange={(e) => setForm({ ...form, stateRegistration: e.target.value })}
              placeholder="Ex: 123.456.789"
            />
            {config?.stateRegistration ? (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✅ Configurada: {config.stateRegistration}
              </p>
            ) : (
              <p className="text-xs text-red-600 dark:text-red-400">
                ❌ Não configurada - obrigatória para emissão de NFC-e
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="municipioIbge">Código IBGE do Município *</Label>
            <Input
              id="municipioIbge"
              value={form.municipioIbge}
              onChange={(e) =>
                setForm({ ...form, municipioIbge: e.target.value.replace(/\D/g, '') })
              }
              placeholder="Ex: 4205407 (Florianópolis)"
              maxLength={7}
            />
            <p className="text-xs text-muted-foreground">
              7 dígitos. Consulte em:{' '}
              <a
                href="https://www.ibge.gov.br/explica/codigos-dos-municipios.php"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                IBGE
              </a>
            </p>
            {config?.municipioIbge ? (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✅ Configurado: {config.municipioIbge}
              </p>
            ) : (
              <p className="text-xs text-red-600 dark:text-red-400">
                ❌ Não configurado - obrigatório para emissão de NFC-e
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nfceSerie">Série da NFC-e</Label>
            <Input
              id="nfceSerie"
              value={form.nfceSerie}
              onChange={(e) => setForm({ ...form, nfceSerie: e.target.value.replace(/\D/g, '') })}
              placeholder="1"
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">
              Geralmente &quot;1&quot;. Consulte com seu contador se precisar de série diferente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nfeSerie">Série da NF-e</Label>
            <Input
              id="nfeSerie"
              value={form.nfeSerie}
              onChange={(e) => setForm({ ...form, nfeSerie: e.target.value.replace(/\D/g, '') })}
              placeholder="1"
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">
              Série usada nas NF-e modelo 55. Geralmente &quot;1&quot;, salvo orientação fiscal diferente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focusNfeEnvironment">Ambiente FocusNFE</Label>
            <Select
              value={form.focusNfeEnvironment}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  focusNfeEnvironment: value as 'sandbox' | 'production',
                })
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
              Define em qual ambiente da FocusNFE as NF-e/NFC-e serão emitidas. O CSC abaixo deve
              ser o do mesmo ambiente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csc">CSC — Código de Segurança do Contribuinte (NFC-e)</Label>
            <Input
              id="csc"
              value={form.csc}
              onChange={(e) => setForm({ ...form, csc: e.target.value.trim() })}
              placeholder="Token obtido na SEFAZ do seu estado"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Use o CSC e o ID Token do mesmo ambiente selecionado (homologação ≠ produção na SEFAZ).
              Copie exatamente como no portal, incluindo hífens. Ao salvar, sincronizamos com a
              FocusNFE (evita rejeição 464 — Hash do QR-Code).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="idTokenCsc">ID Token CSC</Label>
            <Input
              id="idTokenCsc"
              value={form.idTokenCsc}
              onChange={(e) =>
                setForm({
                  ...form,
                  idTokenCsc: e.target.value.replace(/\D/g, '').slice(0, 6),
                })
              }
              placeholder="000001"
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Até 6 dígitos, com zeros à esquerda se a SEFAZ informar (ex.: 000001).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnae">
              CNAE (Classificação Nacional de Atividades Econômicas)
            </Label>
            <Input
              id="cnae"
              value={form.cnae}
              onChange={(e) => setForm({ ...form, cnae: e.target.value.replace(/\D/g, '') })}
              placeholder="Ex: 4761001"
              maxLength={7}
            />
            <p className="text-xs text-muted-foreground">
              7 dígitos. Opcional, mas recomendado.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="aliquotaCbsDefault">Alíquota padrão CBS</Label>
              <Input
                id="aliquotaCbsDefault"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.aliquotaCbsDefault}
                onChange={(e) => setForm({ ...form, aliquotaCbsDefault: e.target.value })}
                placeholder="0.90"
              />
              <p className="text-xs text-muted-foreground">
                Percentual piloto usado no cálculo interno de CBS. Revise com o contador antes de
                usar em produção.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aliquotaIbsDefault">Alíquota padrão IBS</Label>
              <Input
                id="aliquotaIbsDefault"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.aliquotaIbsDefault}
                onChange={(e) => setForm({ ...form, aliquotaIbsDefault: e.target.value })}
                placeholder="0.10"
              />
              <p className="text-xs text-muted-foreground">
                Percentual piloto usado no cálculo interno de IBS. Revise com o contador antes de
                usar em produção.
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <>
              <Save className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Dados Fiscais
            </>
          )}
        </Button>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Emitir somente NFe nas vendas</Label>
            <p className="text-sm text-muted-foreground">
              Quando ativo, todas as vendas emitirão NFe em vez de NFC-e. Na finalização será
              perguntado se deseja emitir boleto e a data de vencimento.
            </p>
          </div>
          <Switch
            checked={config?.emitOnlyNfe ?? false}
            onCheckedChange={handleEmitOnlyNfeToggle}
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-2">
            ℹ️ Campos obrigatórios para emissão de NFC-e
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Regime Tributário</li>
            <li>• Inscrição Estadual</li>
            <li>• Código IBGE do Município</li>
            <li>• Certificado digital A1 — senha e arquivo .pfx (próxima seção)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default DadosFiscaisSettings;
