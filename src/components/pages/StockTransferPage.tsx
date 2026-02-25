import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeftRight, FileDown, Loader2, Search, Package } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { useAuth } from '../../contexts/AuthContext';
import { managerApi, productApi, stockTransferApi } from '../../lib/api-endpoints';
import { handleApiError } from '../../lib/handleApiError';
import { downloadFile } from '../../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export default function StockTransferPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fromCompanyId, setFromCompanyId] = useState('');
  const [toCompanyId, setToCompanyId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchDebounced, setProductSearchDebounced] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; barcode?: string; stockQuantity?: number } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setProductSearchDebounced(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  const { data: companiesData } = useQuery({
    queryKey: ['manager', 'my-companies'],
    queryFn: () => managerApi.myCompanies().then((r) => r.data),
    enabled: user?.role === 'gestor',
  });
  const companies = Array.isArray(companiesData) ? companiesData : [];

  const { data: modalProductsData, isLoading: modalProductsLoading } = useQuery({
    queryKey: ['products', 'company', fromCompanyId, 'modal', productSearchDebounced],
    queryFn: () =>
      productApi
        .list({ companyId: fromCompanyId, page: 1, limit: 50, search: productSearchDebounced || undefined })
        .then((r) => r.data),
    enabled: !!fromCompanyId && productModalOpen && user?.role === 'gestor',
  });
  const modalProducts = (modalProductsData as any)?.products ?? (Array.isArray(modalProductsData) ? modalProductsData : []);
  const modalTotal = (modalProductsData as any)?.total ?? modalProducts.length;

  const { data: transfersData } = useQuery({
    queryKey: ['stock-transfer', 'list'],
    queryFn: () => stockTransferApi.list({ page: 1, limit: 30 }).then((r) => r.data),
    enabled: user?.role === 'gestor',
  });
  const transfers = (transfersData as any)?.data ?? [];

  const qty = parseInt(quantity, 10);
  const canSubmit =
    fromCompanyId &&
    toCompanyId &&
    productId &&
    !isNaN(qty) &&
    qty >= 1 &&
    fromCompanyId !== toCompanyId &&
    selectedProduct &&
    (selectedProduct.stockQuantity ?? 0) >= qty;

  const openProductModal = useCallback(() => {
    if (!fromCompanyId) return;
    setProductSearch('');
    setProductModalOpen(true);
  }, [fromCompanyId]);

  const chooseProduct = useCallback((p: any) => {
    setProductId(p.id);
    setSelectedProduct({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      stockQuantity: p.stockQuantity,
    });
    setProductModalOpen(false);
  }, []);

  useEffect(() => {
    if (!fromCompanyId) {
      setProductId('');
      setSelectedProduct(null);
    }
  }, [fromCompanyId]);

  const handleTransfer = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await stockTransferApi.create({ fromCompanyId, toCompanyId, productId, quantity: qty });
      toast.success('Transferência realizada');
      setQuantity('');
      setProductId('');
      setSelectedProduct(null);
      queryClient.invalidateQueries({ queryKey: ['stock-transfer'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'company', fromCompanyId] });
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async (transferId: string, transferredAt: string) => {
    setPdfLoadingId(transferId);
    try {
      const res = await stockTransferApi.getPdf(transferId);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
      const dateStr = new Date(transferredAt).toISOString().slice(0, 10);
      const filename = `transferencia-${dateStr}-${transferId.slice(0, 8)}.pdf`;
      downloadFile(blob, filename);
      toast.success('PDF baixado com sucesso');
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setPdfLoadingId(null);
    }
  };

  if (user?.role !== 'gestor') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Acesso restrito ao perfil Gestor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transferência de estoque</h1>
        <p className="text-muted-foreground">Mover produtos entre lojas</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Nova transferência
          </CardTitle>
          <CardDescription>Selecione origem, destino, produto e quantidade.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Loja de origem</Label>
              <Select value={fromCompanyId} onValueChange={(v) => { setFromCompanyId(v); setProductId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.fantasyName || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loja de destino</Label>
              <Select value={toCompanyId} onValueChange={setToCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {companies.filter((c: any) => c.id !== fromCompanyId).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.fantasyName || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start font-normal h-10"
                onClick={openProductModal}
                disabled={!fromCompanyId}
              >
                <Package className="h-4 w-4 mr-2 shrink-0" />
                {selectedProduct
                  ? `${selectedProduct.name} — estoque: ${selectedProduct.stockQuantity ?? 0}`
                  : fromCompanyId
                    ? 'Buscar e selecionar produto'
                    : 'Selecione a loja de origem primeiro'}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              {selectedProduct && <p className="text-xs text-muted-foreground">Disponível: {selectedProduct.stockQuantity ?? 0}</p>}
            </div>
          </div>
          <Button onClick={handleTransfer} disabled={!canSubmit || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
            {submitting ? 'Transferindo...' : 'Transferir'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar produto</DialogTitle>
            <DialogDescription>
              Busque pelo nome ou código de barras e clique no produto para selecionar.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="border rounded-md overflow-auto min-h-[200px] max-h-[50vh]">
            {modalProductsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : modalProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {productSearchDebounced ? 'Nenhum produto encontrado.' : 'Nenhum produto nesta loja.'}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Nome</th>
                    <th className="text-left py-2 px-3">Código</th>
                    <th className="text-right py-2 px-3">Estoque</th>
                  </tr>
                </thead>
                <tbody>
                  {modalProducts.map((p: any) => (
                    <tr
                      key={p.id}
                      className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => chooseProduct(p)}
                    >
                      <td className="py-2 px-3 font-medium">{p.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{p.barcode ?? '—'}</td>
                      <td className="text-right py-2 px-3">{p.stockQuantity ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {modalTotal > 50 && (
            <p className="text-xs text-muted-foreground">
              Mostrando até 50 resultados. Use a busca para refinar.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Últimas transferências</CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma transferência.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Data</th>
                  <th className="text-left py-2">Origem</th>
                  <th className="text-left py-2">Destino</th>
                  <th className="text-left py-2">Produto</th>
                  <th className="text-right py-2">Qtd</th>
                  <th className="text-center py-2">Relatório</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t: any) => (
                  <tr key={t.id} className="border-b">
                    <td className="py-2">{new Date(t.transferredAt).toLocaleString('pt-BR')}</td>
                    <td className="py-2">{t.fromCompany?.fantasyName || t.fromCompany?.name || t.fromCompanyId}</td>
                    <td className="py-2">{t.toCompany?.fantasyName || t.toCompany?.name || t.toCompanyId}</td>
                    <td className="py-2">{t.product?.name || t.productId}</td>
                    <td className="text-right py-2">{t.quantity}</td>
                    <td className="py-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPdf(t.id, t.transferredAt)}
                        disabled={pdfLoadingId === t.id}
                        className="gap-1"
                      >
                        {pdfLoadingId === t.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Baixar PDF</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
