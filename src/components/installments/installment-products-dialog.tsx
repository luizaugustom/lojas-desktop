'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../lib/utils';

interface InstallmentProductsDialogProps {
  open: boolean;
  onClose: () => void;
  installmentId: string;
}

export function InstallmentProductsDialog({
  open,
  onClose,
  installmentId,
}: InstallmentProductsDialogProps) {
  const { api } = useAuth();

  const { data: installment, isLoading } = useQuery({
    queryKey: ['installment', installmentId],
    queryFn: async () => {
      const response = await api.get(`/installment/${installmentId}`);
      return response.data;
    },
    enabled: open && !!installmentId,
  });

  const sale = installment?.sale;
  const items = sale?.items || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes dos Produtos</DialogTitle>
          <DialogDescription>
            Produtos comprados nesta parcela
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            Nenhum produto encontrado para esta parcela.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Produto</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Qtd.</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Preço Unit.</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {item.product?.name || 'Produto'}
                          </span>
                          {item.product?.barcode && (
                            <span className="text-xs text-muted-foreground">
                              Código de barras: {item.product.barcode}
                            </span>
                          )}
                          {item.product?.category && (
                            <span className="text-xs text-muted-foreground mt-1">
                              Categoria: {item.product.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                      Total da Venda:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-lg">
                      {formatCurrency(sale?.total || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
