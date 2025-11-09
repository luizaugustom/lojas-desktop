'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Loader2, Square, CheckSquare } from 'lucide-react';

interface CustomerDebtPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  customer?: {
    id: string;
    name?: string;
    cpfCnpj?: string;
  } | null;
  onPaid?: () => void;
}

interface CustomerDebtSummary {
  totalDebt: number;
  totalInstallments: number;
  overdueInstallments: number;
  overdueAmount: number;
  installments: Array<{
    id: string;
    amount: number | string;
    remainingAmount: number | string;
    dueDate: string;
    installmentNumber: number;
    totalInstallments: number;
  }>;
}

const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value) || 0;
};

const formatInputValue = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isFinite(rounded) ? String(rounded) : '';
};

const normalizeDecimalInput = (value: string) => value.replace(/,/g, '.');

const isValidDecimalInput = (value: string) => {
  if (!value) return true;
  return /^\d*(?:[.,]\d*)?$/.test(value);
};

export function CustomerDebtPaymentDialog({
  open,
  onClose,
  customer,
  onPaid,
}: CustomerDebtPaymentDialogProps) {
  const { api } = useAuth();
  const customerId = customer?.id;

  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState<string>('');
  const [selection, setSelection] = useState<
    Record<
      string,
      {
        selected: boolean;
        amount: number;
        remaining: number;
        inputValue: string;
      }
    >
  >({});

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<CustomerDebtSummary | null>({
    queryKey: ['customer-debt-summary', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const response = await api.get(`/installment/customer/${customerId}/summary`);
      return response.data;
    },
    enabled: open && !!customerId,
  });

  useEffect(() => {
    if (!open) {
      setSelection({});
      setPaymentMethod('cash');
      setNotes('');
    }
  }, [open]);

  useEffect(() => {
    if (!data || !data.installments) return;

    const initialSelection: Record<
      string,
      { selected: boolean; amount: number; remaining: number; inputValue: string }
    > = {};
    data.installments.forEach((inst) => {
      const remaining = toNumber(inst.remainingAmount);
      if (remaining <= 0) {
        return;
      }
      initialSelection[inst.id] = {
        selected: true,
        amount: Math.round(remaining * 100) / 100,
        remaining,
        inputValue: formatInputValue(remaining),
      };
    });
    setSelection(initialSelection);
  }, [data, open]);

  const installments = data?.installments ?? [];

  const selectedInstallments = useMemo(() => {
    return installments.filter((inst) => selection[inst.id]?.selected);
  }, [installments, selection]);

  const totalToPay = useMemo(() => {
    return selectedInstallments.reduce((sum, inst) => {
      const value = selection[inst.id]?.amount ?? 0;
      return Math.round((sum + value) * 100) / 100;
    }, 0);
  }, [selectedInstallments, selection]);

  const totalRemaining = useMemo(() => {
    return installments.reduce((sum, inst) => {
      return Math.round((sum + toNumber(inst.remainingAmount)) * 100) / 100;
    }, 0);
  }, [installments]);

  const hasPendingInstallments = installments.some(
    (inst) => toNumber(inst.remainingAmount) > 0,
  );

  const toggleSelection = (installmentId: string) => {
    setSelection((prev) => {
      const current = prev[installmentId];
      if (!current) return prev;
      return {
        ...prev,
        [installmentId]: {
          ...current,
          selected: !current.selected,
        },
      };
    });
  };

  const updateAmount = (installmentId: string, rawValue: string) => {
    setSelection((prev) => {
      const current = prev[installmentId];
      if (!current) return prev;

      if (!isValidDecimalInput(rawValue)) {
        return prev;
      }

      const normalized = normalizeDecimalInput(rawValue);

      if (normalized === '') {
        return {
          ...prev,
          [installmentId]: {
            ...current,
            amount: 0,
            inputValue: '',
          },
        };
      }

      const numericValue = Number(normalized);

      if (Number.isNaN(numericValue)) {
        return prev;
      }

      const clampedValue = Math.max(0, Math.min(current.remaining, numericValue));
      const formatted = formatInputValue(clampedValue);

      return {
        ...prev,
        [installmentId]: {
          ...current,
          amount: Math.round(clampedValue * 100) / 100,
          inputValue: rawValue === normalized ? formatted : formatted,
        },
      };
    });
  };

  const selectAll = () => {
    setSelection((prev) => {
      const updates: typeof prev = {};
      Object.entries(prev).forEach(([key, value]) => {
        updates[key] = {
          ...value,
          selected: true,
          amount: Math.round(value.remaining * 100) / 100,
          inputValue: formatInputValue(value.remaining),
        };
      });
      return updates;
    });
  };

  const clearSelection = () => {
    setSelection((prev) => {
      const updates: typeof prev = {};
      Object.entries(prev).forEach(([key, value]) => {
        updates[key] = {
          ...value,
          selected: false,
          amount: 0,
          inputValue: '',
        };
      });
      return updates;
    });
  };

  const bulkPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!customerId) return null;
      return api.post(`/installment/customer/${customerId}/pay/bulk`, payload);
    },
    onSuccess: async (response) => {
      toast.success(response?.data?.message || 'Pagamentos registrados com sucesso!');
      await refetch();
      onPaid?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao registrar pagamentos');
    },
  });

  const handlePaySelected = () => {
    if (!customerId) return;

    const payloadInstallments = selectedInstallments
      .map((inst) => {
        const amount = selection[inst.id]?.amount ?? 0;
        return {
          installmentId: inst.id,
          amount: Math.round(amount * 100) / 100,
        };
      })
      .filter((item) => item.amount > 0);

    if (payloadInstallments.length === 0) {
      toast.error('Selecione ao menos uma parcela com valor maior que zero.');
      return;
    }

    bulkPaymentMutation.mutate({
      paymentMethod,
      notes: notes || undefined,
      installments: payloadInstallments,
    });
  };

  const handlePayAll = () => {
    if (!customerId) return;
    if (!hasPendingInstallments) {
      toast.error('Não há dívidas pendentes para este cliente.');
      return;
    }

    bulkPaymentMutation.mutate({
      paymentMethod,
      notes: notes || undefined,
      payAll: true,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Dívidas</DialogTitle>
          <DialogDescription>
            {customer?.name ? `Cliente: ${customer.name}` : 'Selecione um cliente para visualizar as dívidas.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || isFetching ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !hasPendingInstallments ? (
          <div className="py-10 text-center text-muted-foreground">
            Nenhuma dívida pendente foi encontrada para este cliente.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total em aberto</p>
                <p className="text-xl font-semibold text-primary">{formatCurrency(totalRemaining)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Parcelas selecionadas</p>
                <p className="text-xl font-semibold">{selectedInstallments.length}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total a pagar</p>
                <p className="text-xl font-semibold text-green-600">{formatCurrency(totalToPay)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                Selecionar todas
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                Limpar seleção
              </Button>
            </div>

            <ScrollArea className="h-72 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Restante</TableHead>
                    <TableHead>Valor a pagar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((inst) => {
                    const remaining = selection[inst.id]?.remaining ?? toNumber(inst.remainingAmount);
                    const isSelected = selection[inst.id]?.selected ?? false;
                    const inputValue = selection[inst.id]?.inputValue ?? '';
                    const amount = selection[inst.id]?.amount ?? 0;

                    if (remaining <= 0) {
                      return null;
                    }

                    return (
                      <TableRow key={inst.id} className={!isSelected ? 'opacity-60' : ''}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => toggleSelection(inst.id)}
                            className="text-muted-foreground transition hover:text-primary"
                            aria-label={isSelected ? 'Desmarcar parcela' : 'Selecionar parcela'}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              Parcela {inst.installmentNumber}/{inst.totalInstallments}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(inst.dueDate)}</TableCell>
                        <TableCell>{formatCurrency(remaining)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={inputValue}
                            onChange={(event) => updateAmount(inst.id, event.target.value)}
                            disabled={!isSelected}
                            inputMode="decimal"
                            className="appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            onFocus={(event) => {
                              if (event.target.value === '0') {
                                updateAmount(inst.id, '');
                              }
                            }}
                            onBlur={(event) => {
                              const current = selection[inst.id];
                              if (!current) return;
                              if (event.target.value === '') {
                                return;
                              }

                              const normalized = normalizeDecimalInput(event.target.value);
                              const numericValue = Number(normalized);

                              if (Number.isNaN(numericValue)) {
                                updateAmount(inst.id, formatInputValue(current.amount));
                                return;
                              }

                              const clampedValue = Math.max(
                                0,
                                Math.min(current.remaining, Math.round(numericValue * 100) / 100),
                              );
                              const formatted = formatInputValue(clampedValue);
                              if (formatted !== event.target.value) {
                                updateAmount(inst.id, formatted);
                              }
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Método de pagamento</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Adicione observações (opcional)"
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={bulkPaymentMutation.isPending}
          >
            Fechar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handlePaySelected}
            disabled={
              bulkPaymentMutation.isPending || selectedInstallments.length === 0 || totalToPay <= 0
            }
          >
            {bulkPaymentMutation.isPending ? 'Processando...' : 'Pagar selecionadas'}
          </Button>
          <Button
            type="button"
            onClick={handlePayAll}
            disabled={bulkPaymentMutation.isPending || !hasPendingInstallments}
          >
            {bulkPaymentMutation.isPending ? 'Processando...' : 'Pagar todas as dívidas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


