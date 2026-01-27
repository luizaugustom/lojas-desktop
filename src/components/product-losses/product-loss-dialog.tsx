import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useAuth } from '../../hooks/useAuth';
import { handleApiError } from '../../lib/handleApiError';

const lossFormSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  quantity: z.number().positive('Quantidade deve ser positiva').min(1, 'Quantidade mínima é 1'),
  reason: z.string().min(1, 'Motivo é obrigatório'),
  notes: z.string().optional(),
  sellerId: z.string().optional(),
});

type LossFormData = z.infer<typeof lossFormSchema>;

interface ProductLossDialogProps {
  open: boolean;
  onClose: () => void;
  initialProduct?: { id: string; name: string; stockQuantity: number } | null;
}

export function ProductLossDialog({ open, onClose, initialProduct }: ProductLossDialogProps) {
  const { api, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<LossFormData>({
    resolver: zodResolver(lossFormSchema),
  });

  const selectedProductId = watch('productId');

  // Buscar produtos
  const { data: productsResponse } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return (await api.get('/product')).data;
    },
  });

  // Buscar vendedores (se for empresa)
  const { data: sellersResponse } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      return (await api.get('/seller')).data;
    },
    enabled: user?.role === 'empresa',
  });

  const products = productsResponse?.products || [];
  const sellers = sellersResponse?.sellers || [];
  const selectedProduct = products.find((p: any) => p.id === selectedProductId);

  useEffect(() => {
    if (!open) {
      reset();
    } else if (initialProduct) {
      // Se houver um produto inicial, pré-selecionar
      setValue('productId', initialProduct.id);
    }
  }, [open, reset, initialProduct, setValue]);

  const onSubmit = async (data: LossFormData) => {
    try {
      setLoading(true);

      await api.post('/product-losses', {
        productId: data.productId,
        quantity: data.quantity,
        reason: data.reason,
        notes: data.notes || undefined,
        sellerId: data.sellerId || undefined,
      });

      toast.success('Perda registrada com sucesso!');
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Perda de Produto</DialogTitle>
          <DialogDescription>
            Registre uma perda de produto (vencimento, quebra, roubo, etc.)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Produto *</Label>
            <Select
              value={selectedProductId || ''}
              onValueChange={(value) => setValue('productId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product: any) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - Estoque: {product.stockQuantity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.productId && (
              <p className="text-sm text-destructive">{errors.productId.message}</p>
            )}
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">
                Estoque disponível: {selectedProduct.stockQuantity} unidades
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={selectedProduct?.stockQuantity || 0}
              {...register('quantity', { 
                setValueAs: (v) =>
                  v === '' || v === undefined
                    ? undefined
                    : (isNaN(Number(v)) ? undefined : Number(v)),
              })}
              disabled={loading || !selectedProductId}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Perda *</Label>
            <Select
              value={watch('reason') || ''}
              onValueChange={(value) => setValue('reason', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vencimento">Vencimento</SelectItem>
                <SelectItem value="Quebra">Quebra</SelectItem>
                <SelectItem value="Roubo">Roubo</SelectItem>
                <SelectItem value="Furto">Furto</SelectItem>
                <SelectItem value="Avaria">Avaria</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              disabled={loading}
              placeholder="Observações adicionais sobre a perda..."
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          {user?.role === 'empresa' && sellers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="sellerId">Vendedor (opcional)</Label>
              <Select
                value={watch('sellerId') || ''}
                onValueChange={(value) => setValue('sellerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {sellers.map((seller: any) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Perda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

