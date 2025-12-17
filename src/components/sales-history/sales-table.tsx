import { Eye, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Skeleton } from '../ui/skeleton';

interface Sale {
  id: string;
  saleDate?: string;
  createdAt: string;
  total: number;
  isCancelled?: boolean;
  clientName?: string;
  clientCpfCnpj?: string;
  seller?: {
    id: string;
    name: string;
  };
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product?: {
      name: string;
    };
  }>;
  paymentMethods?: Array<{
    method: string;
    amount: number;
  }>;
}

interface SalesTableProps {
  sales: Sale[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetails: (saleId: string) => void;
  onCancelSale?: (saleId: string) => void;
}

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    cash: 'Dinheiro',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    pix: 'PIX',
    installment: 'Parcelado',
  };
  return labels[method] || method;
};

const getPaymentMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    cash: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    credit_card: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    debit_card: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    pix: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    installment: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };
  return colors[method] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

export function SalesTable({
  sales,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onViewDetails,
  onCancelSale,
}: SalesTableProps) {
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Nenhuma venda encontrada no período selecionado.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Desktop View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Vendedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Itens
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pagamento
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {formatDate(sale.saleDate || sale.createdAt)}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div>
                    <p className="font-medium">{sale.clientName || 'Cliente Anônimo'}</p>
                    {sale.clientCpfCnpj && (
                      <p className="text-xs text-muted-foreground">{sale.clientCpfCnpj}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {sale.seller?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {sale.items?.length || 0} {sale.items?.length === 1 ? 'item' : 'itens'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {sale.paymentMethods && sale.paymentMethods.length > 0 ? (
                      sale.paymentMethods.map((pm, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className={`text-xs ${getPaymentMethodColor(pm.method)}`}
                        >
                          {getPaymentMethodLabel(pm.method)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                  <div className="flex items-center justify-end gap-2">
                    {formatCurrency(sale.total)}
                    {sale.isCancelled && (
                      <Badge variant="destructive" className="ml-2">
                        Cancelada
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewDetails(sale.id)}
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {onCancelSale && !sale.isCancelled && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCancelSale(sale.id)}
                        title="Cancelar venda"
                        className="text-destructive hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden divide-y">
        {sales.map((sale) => (
          <div key={sale.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{sale.clientName || 'Cliente Anônimo'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(sale.saleDate || sale.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-lg">{formatCurrency(sale.total)}</p>
                {sale.isCancelled && (
                  <Badge variant="destructive" className="mt-1">
                    Cancelada
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Vendedor:</span>
              <span>{sale.seller?.name || '-'}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Itens:</span>
              <span>{sale.items?.length || 0}</span>
            </div>

            {sale.paymentMethods && sale.paymentMethods.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sale.paymentMethods.map((pm, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className={`text-xs ${getPaymentMethodColor(pm.method)}`}
                  >
                    {getPaymentMethodLabel(pm.method)}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onViewDetails(sale.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalhes
              </Button>
              {onCancelSale && !sale.isCancelled && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => onCancelSale(sale.id)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

