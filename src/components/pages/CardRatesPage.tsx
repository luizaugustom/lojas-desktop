import { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'react-hot-toast';
import { handleApiError } from '../../lib/handleApiError';
import { cardAcquirerRateApi } from '../../lib/api-endpoints';
import { AcquirerCnpjSelect } from '../ui/acquirer-cnpj-select';
import { getAcquirerList } from '../../lib/acquirer-cnpj-list';

interface CardAcquirerRate {
  id: string;
  acquirerCnpj: string;
  acquirerName: string;
  debitRate: number;
  creditRate: number;
  installmentRates: Record<string, number>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CardRatesPage() {
  const [rates, setRates] = useState<CardAcquirerRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<CardAcquirerRate | null>(null);
  const [formData, setFormData] = useState<{
    acquirerCnpj: string;
    acquirerName: string;
    debitRate: number | undefined;
    creditRate: number | undefined;
    installmentRates: Record<string, number>;
    isActive: boolean;
  }>({
    acquirerCnpj: '',
    acquirerName: '',
    debitRate: undefined,
    creditRate: undefined,
    installmentRates: {} as Record<string, number>,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [editingInstallments, setEditingInstallments] = useState(false);
  const [newInstallmentCount, setNewInstallmentCount] = useState(2);
  const [newInstallmentRate, setNewInstallmentRate] = useState(0);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      const response = await cardAcquirerRateApi.list();
      setRates(response.data.data || response.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (rate?: CardAcquirerRate) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        acquirerCnpj: rate.acquirerCnpj,
        acquirerName: rate.acquirerName,
        debitRate: rate.debitRate,
        creditRate: rate.creditRate,
        installmentRates: rate.installmentRates || {},
        isActive: rate.isActive,
      });
    } else {
      setEditingRate(null);
      setFormData({
        acquirerCnpj: '',
        acquirerName: '',
        debitRate: undefined,
        creditRate: undefined,
        installmentRates: {},
        isActive: true,
      });
    }
    setEditingInstallments(false);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingRate(null);
    setFormData({
      acquirerCnpj: '',
      acquirerName: '',
      debitRate: 0,
      creditRate: 0,
      installmentRates: {},
      isActive: true,
    });
  };

  const handleAcquirerChange = (cnpj: string) => {
    setFormData({ ...formData, acquirerCnpj: cnpj });
    const acquirer = getAcquirerList().find(a => a.cnpj === cnpj);
    if (acquirer) {
      setFormData({ ...formData, acquirerCnpj: cnpj, acquirerName: acquirer.name });
    }
  };

  const handleSave = async () => {
    if (!formData.acquirerCnpj || !formData.acquirerName) {
      toast.error('CNPJ e nome da credenciadora são obrigatórios');
      return;
    }

    if (formData.debitRate === undefined || formData.debitRate < 0 || formData.debitRate > 100) {
      toast.error('Taxa de débito deve estar entre 0% e 100%');
      return;
    }

    if (formData.creditRate === undefined || formData.creditRate < 0 || formData.creditRate > 100) {
      toast.error('Taxa de crédito deve estar entre 0% e 100%');
      return;
    }

    try {
      setSaving(true);
      if (editingRate) {
        await cardAcquirerRateApi.update(editingRate.id, {
          ...formData,
          debitRate: formData.debitRate ?? 0,
          creditRate: formData.creditRate ?? 0,
        });
        toast.success('Taxa atualizada com sucesso');
      } else {
        await cardAcquirerRateApi.create({
          ...formData,
          debitRate: formData.debitRate ?? 0,
          creditRate: formData.creditRate ?? 0,
        });
        toast.success('Taxa criada com sucesso');
      }
      handleCloseDialog();
      loadRates();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta taxa?')) {
      return;
    }

    try {
      await cardAcquirerRateApi.delete(id);
      toast.success('Taxa removida com sucesso');
      loadRates();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleAddInstallmentRate = () => {
    if (newInstallmentCount < 2 || newInstallmentCount > 24) {
      toast.error('Número de parcelas deve estar entre 2 e 24');
      return;
    }
    if (newInstallmentRate < 0 || newInstallmentRate > 100) {
      toast.error('Taxa deve estar entre 0% e 100%');
      return;
    }
    setFormData({
      ...formData,
      installmentRates: {
        ...formData.installmentRates,
        [newInstallmentCount.toString()]: newInstallmentRate,
      },
    });
    setNewInstallmentCount(2);
    setNewInstallmentRate(0);
  };

  const handleRemoveInstallmentRate = (count: string) => {
    const newRates = { ...formData.installmentRates };
    delete newRates[count];
    setFormData({ ...formData, installmentRates: newRates });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Taxas de Máquina de Cartão</h1>
          <p className="text-muted-foreground">Configure as taxas por credenciadora</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Taxa
        </Button>
      </div>

      {rates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma taxa configurada</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Taxa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Taxas Configuradas</CardTitle>
            <CardDescription>Gerencie as taxas de cada credenciadora</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credenciadora</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Débito</TableHead>
                  <TableHead>Crédito à Vista</TableHead>
                  <TableHead>Parcelado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.acquirerName}</TableCell>
                    <TableCell className="font-mono text-xs">{rate.acquirerCnpj}</TableCell>
                    <TableCell>{rate.debitRate.toFixed(2)}%</TableCell>
                    <TableCell>{rate.creditRate.toFixed(2)}%</TableCell>
                    <TableCell>
                      {Object.keys(rate.installmentRates || {}).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(rate.installmentRates || {})
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .slice(0, 3)
                            .map(([count, rate]) => (
                              <Badge key={count} variant="outline">
                                {count}x: {rate.toFixed(2)}%
                              </Badge>
                            ))}
                          {Object.keys(rate.installmentRates || {}).length > 3 && (
                            <Badge variant="outline">
                              +{Object.keys(rate.installmentRates || {}).length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rate.isActive ? 'default' : 'secondary'}>
                        {rate.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(rate)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rate.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? 'Editar Taxa' : 'Nova Taxa de Credenciadora'}
            </DialogTitle>
            <DialogDescription>
              Configure as taxas para débito, crédito à vista e parcelado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="acquirerCnpj">CNPJ da Credenciadora *</Label>
                <AcquirerCnpjSelect
                  value={formData.acquirerCnpj}
                  onChange={handleAcquirerChange}
                  disabled={!!editingRate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acquirerName">Nome da Credenciadora *</Label>
                <Input
                  id="acquirerName"
                  value={formData.acquirerName}
                  onChange={(e) => setFormData({ ...formData, acquirerName: e.target.value })}
                  placeholder="Ex: Cielo, Stone, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="debitRate">Taxa Débito (%) *</Label>
                <Input
                  id="debitRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.debitRate ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    const n = v === '' ? undefined : parseFloat(v);
                    setFormData({ ...formData, debitRate: v === '' ? undefined : (isNaN(n as number) ? undefined : n) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditRate">Taxa Crédito à Vista (%) *</Label>
                <Input
                  id="creditRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.creditRate ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    const n = v === '' ? undefined : parseFloat(v);
                    setFormData({ ...formData, creditRate: v === '' ? undefined : (isNaN(n as number) ? undefined : n) });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Taxas por Número de Parcelas</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingInstallments(!editingInstallments)}
                >
                  {editingInstallments ? 'Ocultar' : 'Gerenciar'}
                </Button>
              </div>

              {editingInstallments && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      placeholder="Parcelas (2-24)"
                      min="2"
                      max="24"
                      value={newInstallmentCount}
                      onChange={(e) => setNewInstallmentCount(Number(e.target.value))}
                    />
                    <Input
                      type="number"
                      placeholder="Taxa (%)"
                      step="0.01"
                      min="0"
                      max="100"
                      value={newInstallmentRate}
                      onChange={(e) => setNewInstallmentRate(Number(e.target.value))}
                    />
                    <Button type="button" onClick={handleAddInstallmentRate}>
                      Adicionar
                    </Button>
                  </div>

                  {Object.keys(formData.installmentRates).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Taxas Configuradas:</Label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(formData.installmentRates)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([count, rate]) => (
                            <Badge
                              key={count}
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              {count}x: {rate.toFixed(2)}%
                              <button
                                type="button"
                                onClick={() => handleRemoveInstallmentRate(count)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!editingInstallments && Object.keys(formData.installmentRates).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(formData.installmentRates)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .slice(0, 5)
                    .map(([count, rate]) => (
                      <Badge key={count} variant="outline">
                        {count}x: {rate.toFixed(2)}%
                      </Badge>
                    ))}
                  {Object.keys(formData.installmentRates).length > 5 && (
                    <Badge variant="outline">
                      +{Object.keys(formData.installmentRates).length - 5}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Taxa ativa</Label>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                As taxas são aplicadas automaticamente no cálculo do lucro líquido. Para crédito
                parcelado, a taxa será aplicada de acordo com o número de parcelas configurado.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingRate ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

