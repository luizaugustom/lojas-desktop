import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { productApi } from '../../lib/api-endpoints';
import { handleApiError } from '../../lib/handleApiError';
import { formatCurrency } from '../../lib/utils';

interface AddStockDialogProps {
  open: boolean;
  onClose: () => void;
  product: { id: string; name: string; stockQuantity: number; costPrice?: number };
  onSuccess?: () => void;
}

export function AddStockDialog({ open, onClose, product, onSuccess }: AddStockDialogProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [unitCost, setUnitCost] = useState('');

  useEffect(() => {
    if (open) {
      setQuantity('');
      setExpirationDate('');
      setBatchNumber('');
      setUnitCost(product.costPrice ? String(product.costPrice) : '');
    }
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    try {
      setLoading(true);
      await productApi.addStock(product.id, {
        quantity: qty,
        expirationDate: expirationDate || undefined,
        batchNumber: batchNumber || undefined,
        unitCost: unitCost ? Number(unitCost) : undefined,
      });
      toast.success('Estoque adicionado com sucesso!');
      onClose();
      onSuccess?.();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Estoque</DialogTitle>
          <DialogDescription>
            Adicionar estoque ao produto <strong>{product.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="Ex: 100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expirationDate">Data de Validade</Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Se não informada, o produto não terá controle de validade por lote.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchNumber">Número do Lote</Label>
            <Input
              id="batchNumber"
              type="text"
              placeholder="Ex: LOTE-2026-001"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Identificação do lote fornecido pelo fabricante.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitCost">Custo Unitário</Label>
            <Input
              id="unitCost"
              type="number"
              step="0.01"
              min="0"
              placeholder={product.costPrice ? formatCurrency(product.costPrice) : 'Ex: 10.50'}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              disabled={loading}
            />
            {product.costPrice && (
              <p className="text-xs text-muted-foreground">
                Preço de custo cadastrado: {formatCurrency(product.costPrice)}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !quantity}>
              {loading ? 'Adicionando...' : 'Adicionar Estoque'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}