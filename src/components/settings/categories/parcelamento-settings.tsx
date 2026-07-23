import { useEffect, useState } from 'react';
import { CreditCard, Lock, Percent, Save } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { companyApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { toast } from 'react-hot-toast';

export interface ParcelamentoSettingsProps {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
}

export function ParcelamentoSettings({ locked, lockReason }: ParcelamentoSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<{
    installmentInterestRates: Record<string, number | undefined>;
    maxInstallments: number | undefined;
  }>({
    installmentInterestRates: {},
    maxInstallments: 12,
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
      const response = await companyApi.myCompany();
      const data = response.data;
      const rates = data?.installmentInterestRates || {};
      const defaultRates: Record<string, number> = {};
      for (let i = 1; i <= 24; i++) {
        defaultRates[i.toString()] = rates[i.toString()] ?? 0;
      }
      setConfig({
        installmentInterestRates: defaultRates,
        maxInstallments: data?.maxInstallments ?? 12,
      });
    } catch (error) {
      console.error('Erro ao carregar configurações de parcelamento:', error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateInstallmentRate = (parcela: number, taxa: number | undefined) => {
    setConfig({
      ...config,
      installmentInterestRates: {
        ...config.installmentInterestRates,
        [parcela.toString()]: taxa,
      },
    });
  };

  const handleSave = async () => {
    for (const [parcela, taxa] of Object.entries(config.installmentInterestRates)) {
      if (taxa != null && (taxa < 0 || taxa > 100)) {
        toast.error(`Taxa de juros da parcela ${parcela} deve estar entre 0% e 100%`);
        return;
      }
    }
    const maxInstallmentsToSave = config.maxInstallments ?? 12;
    if (maxInstallmentsToSave < 0 || maxInstallmentsToSave > 24) {
      toast.error('Limite de parcelas deve estar entre 0 e 24');
      return;
    }

    try {
      setSaving(true);
      const ratesToSave = Object.fromEntries(
        Object.entries(config.installmentInterestRates).map(([k, v]) => [k, v ?? 0]),
      );
      await companyApi.updateMyCompany({
        installmentInterestRates: ratesToSave,
        maxInstallments: maxInstallmentsToSave,
      });
      toast.success('Configurações de parcelamento salvas com sucesso!');
      await load();
    } catch (error: any) {
      console.error('Erro ao salvar configurações de parcelamento:', error);
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Configurações de Parcelamento
        </CardTitle>
        <CardDescription>
          Configure a taxa de juros e o limite máximo de parcelas para vendas a prazo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxInstallments">Limite Máximo de Parcelas</Label>
            <Input
              id="maxInstallments"
              type="number"
              min="0"
              max="24"
              value={config.maxInstallments ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                const n = v === '' ? undefined : parseInt(v, 10);
                setConfig({
                  ...config,
                  maxInstallments:
                    v === '' ? undefined : isNaN(n as number) ? undefined : n,
                });
              }}
              placeholder="12"
            />
            <p className="text-xs text-muted-foreground">
              Número máximo de parcelas permitidas para vendas a prazo. Use 0 para desabilitar
              vendas a prazo. Padrão: 12 parcelas.
            </p>
          </div>

          {(config.maxInstallments ?? 12) > 0 && (
            <div className="space-y-2">
              <Label>Taxas de Juros por Parcela (%)</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Parcela</TableHead>
                      <TableHead>Taxa de Juros (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(
                      { length: config.maxInstallments ?? 12 },
                      (_, i) => i + 1,
                    ).map((parcela) => (
                      <TableRow key={parcela}>
                        <TableCell className="font-medium">{parcela}x</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={config.installmentInterestRates[parcela.toString()] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                const n = parseFloat(v);
                                updateInstallmentRate(
                                  parcela,
                                  v === '' ? undefined : isNaN(n) ? undefined : n,
                                );
                              }}
                              placeholder="0.00"
                              className="w-32"
                            />
                            <Percent className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure a taxa de juros para cada parcela individualmente. Ex: Parcela 1 com 0%,
                Parcela 2 com 2.5%, etc.
              </p>
            </div>
          )}
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
              Salvar Configurações
            </>
          )}
        </Button>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Sobre os Juros em Parcelas
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Configure taxas de juros diferentes para cada parcela</li>
            <li>• Parcelas podem ter 0% de juros (sem juros)</li>
            <li>
              • O valor total da venda será calculado automaticamente com base nas taxas de cada
              parcela
            </li>
            <li>• Os juros aumentam o lucro líquido da empresa</li>
            <li>• O limite de parcelas será validado ao criar vendas a prazo</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default ParcelamentoSettings;
