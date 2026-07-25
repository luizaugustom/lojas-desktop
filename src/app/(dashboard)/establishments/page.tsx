'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Plus, Edit, Trash2, Shield, FileText } from 'lucide-react';
import { establishmentApi } from '@/lib/api-endpoints';

interface Establishment {
  id: string;
  cnpj: string;
  name: string;
  stateRegistration?: string;
  address?: string;
  number?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  isMain: boolean;
  isDtecCredentialed: boolean;
  dtecCredentialExpiresAt?: string;
  dtecProtocol?: string;
  pdvSeries?: Record<string, string> | null;
  isActive: boolean;
}

export default function EstablishmentsPage() {
  const [list, setList] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Establishment | null>(null);
  const [form, setForm] = useState<Partial<Establishment>>({});
  const [pdvSeriesText, setPdvSeriesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const response = await establishmentApi.list();
      setList(Array.isArray(response.data) ? response.data : []);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ isMain: false });
    setPdvSeriesText('');
    setDialogOpen(true);
  };

  const openEdit = (e: Establishment) => {
    setEditing(e);
    setForm(e);
    setPdvSeriesText(e.pdvSeries ? JSON.stringify(e.pdvSeries, null, 2) : '');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      let pdvSeries: Record<string, string> | undefined;
      if (pdvSeriesText.trim()) {
        try {
          pdvSeries = JSON.parse(pdvSeriesText);
        } catch {
          setError('pdvSeries deve ser JSON válido.');
          setSaving(false);
          return;
        }
      }
      const payload = { ...form, pdvSeries };
      if (editing) {
        await establishmentApi.update(editing.id, payload);
      } else {
        await establishmentApi.create(payload as any);
      }
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Desativar este estabelecimento?')) return;
    await establishmentApi.deactivate(id);
    await load();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Estabelecimentos (Art. 4º §2º)
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Cadastro de múltiplos estabelecimentos (matriz + filiais) com credenciamento DTEC e
            séries distintas por PDV.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo estabelecimento
        </Button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Nenhum estabelecimento cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{e.name}</CardTitle>
                  {e.isMain && <Badge>Matriz</Badge>}
                </div>
                <CardDescription>CNPJ: {e.cnpj}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {e.city && (
                  <p className="text-sm text-gray-600">
                    {e.city}/{e.state}
                  </p>
                )}
                {e.stateRegistration && (
                  <p className="text-xs text-gray-500">IE: {e.stateRegistration}</p>
                )}
                <div className="flex items-center gap-2">
                  {e.isDtecCredentialed ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Shield className="mr-1 h-3 w-3" /> DTEC
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400">
                      Sem DTEC
                    </Badge>
                  )}
                  {e.pdvSeries && Object.keys(e.pdvSeries).length > 0 && (
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      <FileText className="mr-1 h-3 w-3" />
                      {Object.keys(e.pdvSeries).length} PDV(s)
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeactivate(e.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} estabelecimento</DialogTitle>
            <DialogDescription>
              Para conformidade com ATO DIAT 38/2020 (Art. 4º §2º).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="cnpj">CNPJ (apenas dígitos)</Label>
              <Input
                id="cnpj"
                value={form.cnpj ?? ''}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="stateRegistration">IE</Label>
              <Input
                id="stateRegistration"
                value={form.stateRegistration ?? ''}
                onChange={(e) => setForm({ ...form, stateRegistration: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="zipCode">CEP</Label>
              <Input
                id="zipCode"
                value={form.zipCode ?? ''}
                onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="number">Número</Label>
              <Input
                id="number"
                value={form.number ?? ''}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="city">Município</Label>
              <Input
                id="city"
                value={form.city ?? ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="state">UF</Label>
              <Input
                id="state"
                maxLength={2}
                value={form.state ?? ''}
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isMain"
                checked={!!form.isMain}
                onChange={(e) => setForm({ ...form, isMain: e.target.checked })}
              />
              <Label htmlFor="isMain">É a matriz</Label>
            </div>
            <div className="col-span-2">
              <Label htmlFor="pdvSeries">Séries por PDV (Art. 13 Parágrafo único)</Label>
              <textarea
                id="pdvSeries"
                className="w-full mt-1 px-3 py-2 border rounded text-sm font-mono"
                rows={4}
                placeholder={`{ "PDV01": "1", "PDV02": "2" }`}
                value={pdvSeriesText}
                onChange={(e) => setPdvSeriesText(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}