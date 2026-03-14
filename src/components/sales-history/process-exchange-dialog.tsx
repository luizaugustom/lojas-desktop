import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { handleApiError } from '../../lib/handleApiError';
import { getFriendlyPrintErrorMessage } from '../../lib/print-error-message';
import { formatCurrency } from '../../lib/utils';
import type {
  Exchange,
  PaymentMethod,
  Product,
  Sale,
} from '../../types';

interface ProcessExchangeDialogProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSuccess?: (exchange: Exchange) => void;
}

interface ReturnedSelection {
  saleItemId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface NewExchangeItem {
  productId: string;
  name: string;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
  stockQuantity?: number;
}

interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
  additionalInfo?: string;
}

interface ProcessExchangePayload {
  originalSaleId: string;
  reason: string;
  note?: string;
  returnedItems: Array<{
    saleItemId: string;
    productId: string;
    quantity: number;
  }>;
  newItems?: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  payments?: Array<{
    method: PaymentMethod;
    amount: number;
    additionalInfo?: string;
  }>;
  refunds?: Array<{
    method: PaymentMethod;
    amount: number;
    additionalInfo?: string;
  }>;
  issueStoreCredit?: boolean;
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; disabled?: boolean }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'installment', label: 'Parcelado' },
  { value: 'store_credit', label: 'Crédito em Loja', disabled: true },
];

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const createEntryId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

export function ProcessExchangeDialog({
  open,
  onClose,
  sale,
  onSuccess,
}: ProcessExchangeDialogProps) {
  const { api } = useAuth();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [returnedQuantities, setReturnedQuantities] = useState<Record<string, number>>({});
  const [newItems, setNewItems] = useState<NewExchangeItem[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [refunds, setRefunds] = useState<PaymentEntry[]>([]);
  const [issueStoreCredit, setIssueStoreCredit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSearch = useDebounce(searchTerm, 350);

  const saleItems = sale?.items ?? [];

  const alreadyReturnedMap = useMemo(() => {
    const map = new Map<string, number>();

    if (sale?.exchanges) {
      for (const exchange of sale.exchanges) {
        for (const item of exchange.returnedItems || []) {
          if (item.saleItemId) {
            map.set(
              item.saleItemId,
              (map.get(item.saleItemId) ?? 0) + item.quantity,
            );
          }
        }
      }
    }

    return map;
  }, [sale]);

  const selectedReturns: ReturnedSelection[] = useMemo(() => {
    return saleItems
      .map((item) => {
        const quantity = returnedQuantities[item.id] ?? 0;
        if (quantity <= 0) {
          return null;
        }

        const unitPrice =
          typeof item.unitPrice === 'number'
            ? item.unitPrice
            : Number((item as any).unitPrice ?? 0);

        return {
          saleItemId: item.id,
          productId: item.productId,
          quantity,
          unitPrice,
        };
      })
      .filter(Boolean) as ReturnedSelection[];
  }, [saleItems, returnedQuantities]);

  const returnedTotal = useMemo(
    () =>
      roundCurrency(
        selectedReturns.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        ),
      ),
    [selectedReturns],
  );

  const deliveredTotal = useMemo(
    () =>
      roundCurrency(
        newItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        ),
      ),
    [newItems],
  );

  const difference = roundCurrency(deliveredTotal - returnedTotal);
  const amountToReceive = difference > 0 ? difference : 0;
  const amountToRefund = difference < 0 ? Math.abs(difference) : 0;

  const paymentsTotal = useMemo(
    () =>
      roundCurrency(
        payments.reduce((sum, payment) => sum + payment.amount, 0),
      ),
    [payments],
  );

  const refundsTotal = useMemo(
    () =>
      roundCurrency(
        refunds.reduce((sum, refund) => sum + refund.amount, 0),
      ),
    [refunds],
  );

  const storeCreditPreview = useMemo(() => {
    if (difference >= 0 || !issueStoreCredit) {
      return 0;
    }
    return roundCurrency(Math.max(0, amountToRefund - refundsTotal));
  }, [amountToRefund, refundsTotal, difference, issueStoreCredit]);

  const canSubmit = selectedReturns.length > 0 && reason.trim().length >= 3;

  const { data: productResults = [], isFetching: isSearching } = useQuery({
    queryKey: ['exchange-products', debouncedSearch],
    enabled: open && debouncedSearch.trim().length >= 2,
    queryFn: async () => {
      const response = await api.get('/product', {
        params: {
          search: debouncedSearch,
          page: 1,
          limit: 10,
        },
      });

      const products =
        response.data?.products ||
        response.data?.data ||
        response.data ||
        [];

      return Array.isArray(products) ? products : [];
    },
  });

  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
      setReturnedQuantities({});
      setNewItems([]);
      setPayments([]);
      setRefunds([]);
      setIssueStoreCredit(false);
      setSearchTerm('');
    }
  }, [open, sale?.id]);

  const handleChangeReturnedQuantity = (saleItemId: string, value: number) => {
    if (!sale) return;
    const saleItem = saleItems.find((item) => item.id === saleItemId);
    if (!saleItem) return;

    const alreadyReturned = alreadyReturnedMap.get(saleItemId) ?? 0;
    const maxAvailable = Math.max(0, saleItem.quantity - alreadyReturned);
    const safeValue = Math.min(Math.max(0, Math.floor(value)), maxAvailable);

    setReturnedQuantities((prev) => ({
      ...prev,
      [saleItemId]: safeValue,
    }));
  };

  const handleAddProduct = (product: Product) => {
    if (product.stockQuantity <= 0) {
      toast.error('Produto sem estoque disponível.');
      return;
    }

    setNewItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const updated = prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + 1,
                  product.stockQuantity ?? item.quantity + 1,
                ),
              }
            : item,
        );
        return updated;
      }

      const unitPrice = typeof product.price === 'number'
        ? product.price
        : Number(product.price ?? 0);

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          quantity: 1,
          unitPrice: roundCurrency(unitPrice),
          stockQuantity: product.stockQuantity,
        },
      ];
    });
    toast.success(`${product.name} adicionado à troca.`);
  };

  const handleUpdateNewItemQuantity = (productId: string, rawValue: number) => {
    setNewItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const maxStock = item.stockQuantity ?? Number.MAX_SAFE_INTEGER;
        const safeValue = Math.max(1, Math.min(Math.floor(rawValue), maxStock));
        return { ...item, quantity: safeValue };
      }),
    );
  };

  const handleUpdateNewItemPrice = (productId: string, rawValue: number) => {
    setNewItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const safeValue = Math.max(0, roundCurrency(rawValue));
        return { ...item, unitPrice: safeValue };
      }),
    );
  };

  const handleRemoveNewItem = (productId: string) => {
    setNewItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleAddPayment = (type: 'payment' | 'refund') => {
    const entry: PaymentEntry = {
      id: createEntryId(),
      method: 'cash',
      amount: 0,
    };

    if (type === 'payment') {
      setPayments((prev) => [...prev, entry]);
    } else {
      setRefunds((prev) => [...prev, entry]);
    }
  };

  const handleUpdatePayment = (
    type: 'payment' | 'refund',
    id: string,
    field: keyof PaymentEntry,
    value: PaymentMethod | number | string,
  ) => {
    const updater = (entries: PaymentEntry[]) =>
      entries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      );

    if (type === 'payment') {
      setPayments((prev) => updater(prev));
    } else {
      setRefunds((prev) => updater(prev));
    }
  };

  const handleRemovePayment = (type: 'payment' | 'refund', id: string) => {
    if (type === 'payment') {
      setPayments((prev) => prev.filter((entry) => entry.id !== id));
    } else {
      setRefunds((prev) => prev.filter((entry) => entry.id !== id));
    }
  };

  const validateBeforeSubmit = () => {
    if (!sale) {
      toast.error('Venda não encontrada.');
      return false;
    }

    if (selectedReturns.length === 0) {
      toast.error('Selecione pelo menos um item para devolução.');
      return false;
    }

    if (reason.trim().length < 3) {
      toast.error('Informe um motivo com pelo menos 3 caracteres.');
      return false;
    }

    const tolerance = 0.01;

    if (difference > tolerance) {
      if (payments.length === 0) {
        toast.error('Informe as formas de pagamento para receber a diferença.');
        return false;
      }

      if (Math.abs(paymentsTotal - amountToReceive) > tolerance) {
        toast.error(
          `Total de pagamentos (${formatCurrency(
            paymentsTotal,
          )}) não confere com o valor devido (${formatCurrency(
            amountToReceive,
          )}).`,
        );
        return false;
      }
    }

    if (difference < -tolerance) {
      if (issueStoreCredit) {
        if (refundsTotal - amountToRefund > tolerance) {
          toast.error('Os reembolsos não podem exceder o valor a devolver.');
          return false;
        }
      } else {
        if (refunds.length === 0) {
          toast.error('Informe as formas de reembolso para devolver a diferença.');
          return false;
        }

        if (Math.abs(refundsTotal - amountToRefund) > tolerance) {
          toast.error(
            `Total de reembolsos (${formatCurrency(
              refundsTotal,
            )}) não confere com o valor devido (${formatCurrency(
              amountToRefund,
            )}).`,
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!sale || isSubmitting) return;

    if (!validateBeforeSubmit()) {
      return;
    }

    const payload: ProcessExchangePayload = {
      originalSaleId: sale.id,
      reason: reason.trim(),
      note: note.trim() || undefined,
      returnedItems: selectedReturns.map((item) => ({
        saleItemId: item.saleItemId,
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    if (newItems.length > 0) {
      payload.newItems = newItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));
    }

    if (difference > 0 && payments.length > 0) {
      payload.payments = payments.map((entry) => ({
        method: entry.method,
        amount: roundCurrency(entry.amount),
        additionalInfo: entry.additionalInfo?.trim() || undefined,
      }));
    }

    if (difference < 0) {
      if (refunds.length > 0) {
        payload.refunds = refunds.map((entry) => ({
          method: entry.method,
          amount: roundCurrency(entry.amount),
          additionalInfo: entry.additionalInfo?.trim() || undefined,
        }));
      }
      payload.issueStoreCredit = issueStoreCredit || undefined;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/sale/exchange', payload);
      const exchange = response.data;
      toast.success('Troca processada com sucesso!');
      
      // Se gerou crédito em loja, oferecer impressão do comprovante
      if (exchange.storeCreditAmount > 0 && (exchange as any).storeCreditVoucherData) {
        const shouldPrint = window.confirm(
          `Crédito em loja de ${formatCurrency(exchange.storeCreditAmount)} gerado com sucesso!\n\nDeseja imprimir o comprovante agora?`
        );
        
        if (shouldPrint) {
          try {
            const printResponse = await api.post(`/sale/exchange/${exchange.id}/print-credit-voucher`);
            const printData = printResponse.data;
            
            // Se for desktop e tiver conteúdo, imprimir localmente
            if (printData.content && typeof window !== 'undefined' && window.electronAPI?.printers) {
              const { printContent } = await import('../../lib/print-service');
              const printResult = await printContent(printData.content);
              
              if (printResult.success) {
                toast.success('Comprovante impresso com sucesso!');
              } else {
                toast.error(getFriendlyPrintErrorMessage(printResult.error));
              }
            } else {
              toast.success('Comprovante enviado para impressão!');
            }
          } catch (printError) {
            console.error('Erro ao imprimir comprovante:', printError);
            const { message } = handleApiError(printError, { showToast: false });
            toast.error(message);
          }
        }
      }
      
      onSuccess?.(exchange);
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Processar Troca de Produtos</DialogTitle>
          <DialogDescription>
            Selecione os itens a serem devolvidos e os produtos que serão entregues, informe o motivo e finalize a troca.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da troca</Label>
                <Input
                  id="reason"
                  placeholder="Ex.: Produto com defeito, tamanho incorreto..."
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Observações (opcional)</Label>
                <Input
                  id="note"
                  placeholder="Notas adicionais para registro interno"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Itens da venda</h3>
                <p className="text-sm text-muted-foreground">
                  Informe a quantidade de cada item que será devolvida nesta troca.
                </p>
              </div>
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                {saleItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum item encontrado na venda.
                  </p>
                ) : (
                  saleItems.map((item) => {
                    const alreadyReturned = alreadyReturnedMap.get(item.id) ?? 0;
                    const maxAvailable = Math.max(0, item.quantity - alreadyReturned);
                    const selectedQuantity = returnedQuantities[item.id] ?? 0;
                    return (
                      <div
                        key={item.id}
                        className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]"
                      >
                        <div>
                          <p className="font-medium">{item.product?.name ?? 'Produto'}</p>
                          <p className="text-xs text-muted-foreground">
                            Vendido: {item.quantity} • Já devolvido: {alreadyReturned}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Qtd. devolver</Label>
                          <Input
                            type="number"
                            min={0}
                            max={maxAvailable}
                            inputMode="numeric"
                            value={selectedQuantity === 0 ? '' : selectedQuantity}
                            onChange={(event) =>
                              handleChangeReturnedQuantity(
                                item.id,
                                Number(event.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Preço unit.</Label>
                          <p className="text-sm font-medium">
                            {formatCurrency(
                              typeof item.unitPrice === 'number'
                                ? item.unitPrice
                                : Number((item as any).unitPrice ?? 0),
                            )}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Subtotal</Label>
                          <p className="text-sm font-medium">
                            {formatCurrency(
                              selectedQuantity *
                                (typeof item.unitPrice === 'number'
                                  ? item.unitPrice
                                  : Number((item as any).unitPrice ?? 0)),
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Novos itens para entrega</h3>
                  <p className="text-sm text-muted-foreground">
                    Busque os produtos desejados e adicione-os com a quantidade e valor corretos.
                  </p>
                </div>
                <div className="w-full md:w-80">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produtos por nome, código ou SKU..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {debouncedSearch.trim().length >= 2 && (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Resultados ({productResults.length})
                    </p>
                    {isSearching && (
                      <Badge variant="secondary">Buscando...</Badge>
                    )}
                  </div>
                  {productResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum produto encontrado para &quot;{debouncedSearch}&quot;.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {productResults.map((product: Product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                        >
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Estoque: {product.stockQuantity ?? 0} • {formatCurrency(Number(product.price ?? 0))}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddProduct(product)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                {newItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum novo produto adicionado. Adicione itens para entrega na troca, se necessário.
                  </p>
                ) : (
                  newItems.map((item) => (
                    <div
                      key={item.productId}
                      className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.stockQuantity !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Estoque disponível: {item.stockQuantity}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Qtd. entregar</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) =>
                            handleUpdateNewItemQuantity(
                              item.productId,
                              Number(event.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Preço unit.</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) =>
                            handleUpdateNewItemPrice(
                              item.productId,
                              Number(event.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Subtotal</Label>
                        <p className="text-sm font-medium">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-start justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveNewItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Resumo financeiro</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-lg border p-4 bg-muted/20">
                  <div className="flex items-center justify-between text-sm">
                    <span>Total devolvido</span>
                    <span className="font-medium">{formatCurrency(returnedTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total entregue</span>
                    <span className="font-medium">{formatCurrency(deliveredTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Diferença</span>
                    <span className="font-semibold">
                      {formatCurrency(difference)}
                    </span>
                  </div>
                </div>

                {difference > 0 && (
                  <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Valor a receber</p>
                        <p className="text-xs text-muted-foreground">
                          Informe as formas de pagamento do cliente.
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(amountToReceive)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {payments.map((entry) => (
                        <div
                          key={entry.id}
                          className="grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_auto]"
                        >
                          <Select
                            value={entry.method}
                            onValueChange={(value: PaymentMethod) =>
                              handleUpdatePayment('payment', entry.id, 'method', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Forma de pagamento" />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  disabled={option.disabled}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            value={entry.amount === 0 ? '' : entry.amount}
                            onChange={(event) =>
                              handleUpdatePayment(
                                'payment',
                                entry.id,
                                'amount',
                                Number(event.target.value),
                              )
                            }
                          />
                          <Input
                            placeholder="Info adicional (opcional)"
                            value={entry.additionalInfo ?? ''}
                            onChange={(event) =>
                              handleUpdatePayment(
                                'payment',
                                entry.id,
                                'additionalInfo',
                                event.target.value,
                              )
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemovePayment('payment', entry.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddPayment('payment')}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar forma de pagamento
                      </Button>
                      <p className="text-xs text-muted-foreground text-right">
                        Total: {formatCurrency(paymentsTotal)}
                      </p>
                    </div>
                  </div>
                )}

                {difference < 0 && (
                  <div className="space-y-3 rounded-lg border p-4 bg-muted/20 md:col-span-2">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">Valor a devolver</p>
                        <p className="text-xs text-muted-foreground">
                          Registre o reembolso ao cliente ou converta a diferença em crédito.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="store-credit"
                          checked={issueStoreCredit}
                          onCheckedChange={setIssueStoreCredit}
                        />
                        <Label htmlFor="store-credit" className="text-sm">
                          Gerar crédito em loja
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {refunds.map((entry) => (
                        <div
                          key={entry.id}
                          className="grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_auto]"
                        >
                          <Select
                            value={entry.method}
                            onValueChange={(value: PaymentMethod) =>
                              handleUpdatePayment('refund', entry.id, 'method', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Forma de devolução" />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  disabled={option.disabled}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            value={entry.amount === 0 ? '' : entry.amount}
                            onChange={(event) =>
                              handleUpdatePayment(
                                'refund',
                                entry.id,
                                'amount',
                                Number(event.target.value),
                              )
                            }
                          />
                          <Input
                            placeholder="Info adicional (opcional)"
                            value={entry.additionalInfo ?? ''}
                            onChange={(event) =>
                              handleUpdatePayment(
                                'refund',
                                entry.id,
                                'additionalInfo',
                                event.target.value,
                              )
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemovePayment('refund', entry.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      {!issueStoreCredit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddPayment('refund')}
                          className="w-full"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar forma de reembolso
                        </Button>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Total reembolsado: {formatCurrency(refundsTotal)}</span>
                        {issueStoreCredit && (
                          <span>Crédito em loja: {formatCurrency(storeCreditPreview)}</span>
                        )}
                        {!issueStoreCredit && (
                          <span>Total devido: {formatCurrency(amountToRefund)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {difference > 0 && (
              <span>
                Cliente deve pagar: <strong>{formatCurrency(amountToReceive)}</strong>
              </span>
            )}
            {difference < 0 && (
              <span>
                Valor a devolver: <strong>{formatCurrency(amountToRefund)}</strong>
              </span>
            )}
            {difference === 0 && (
              <span>Sem diferença financeira nesta troca.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Processando...' : 'Confirmar troca'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
