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
import { Loader2, Square, CheckSquare, Eye, Download } from 'lucide-react';
import { PaymentReceiptConfirmDialog } from './payment-receipt-confirm-dialog';
import { printContent } from '../../lib/print-service';
import { generateBulkPaymentReceiptContent } from '../../lib/payment-receipt-content';
import { InstallmentProductsDialog } from './installment-products-dialog';
import { ConfirmationModal } from '../ui/confirmation-modal';

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
    saleId?: string;
  }>;
}

interface GeneratedBillet {
  installmentId: string;
  installmentNumber?: number;
  totalInstallments?: number;
  dueDate?: string;
  remainingAmount?: number | string;
  newBilletPdf: string;
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

type DebtFilter = 'default' | 'overdue' | 'all';

const filterInstallmentsByDueDate = (
  installments: CustomerDebtSummary['installments'],
  filter: DebtFilter,
) => {
  if (filter === 'all') return installments;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return installments.filter((inst) => {
    const d = new Date(inst.dueDate);
    if (filter === 'overdue') return d < now;
    return d < now || (d >= startOfMonth && d <= endOfMonth);
  });
};

export function CustomerDebtPaymentDialog({
  open,
  onClose,
  customer,
  onPaid,
}: CustomerDebtPaymentDialogProps) {
  const { api, user } = useAuth();
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
  const [showReceiptConfirm, setShowReceiptConfirm] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [printing, setPrinting] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [remainingDebts, setRemainingDebts] = useState<Array<{
    id: string;
    installmentNumber: number;
    totalInstallments: number;
    amount: number;
    remainingAmount: number;
    dueDate: string;
  }>>([]);
  const [totalRemainingDebt, setTotalRemainingDebt] = useState<number | null>(null);
  const [debtFilter, setDebtFilter] = useState<DebtFilter>('default');
  const [showGeneratedBillets, setShowGeneratedBillets] = useState(false);
  const [showBilletConfirm, setShowBilletConfirm] = useState(false);

  const companyInfo = useMemo(() => {
    if (!company) return null;
    const addressParts = [
      company.address?.street,
      company.address?.number,
      company.address?.complement,
      company.address?.neighborhood,
      company.address?.city,
      company.address?.state,
    ].filter(Boolean);

    return {
      name: company.name,
      cnpj: company.cnpj,
      address: addressParts.join(', '),
    };
  }, [company]);

  useEffect(() => {
    let active = true;
    const loadCompany = async () => {
      if (!open) return;
      try {
        const response = await api.get('/company/my-company');
        if (active) setCompany(response.data);
      } catch (err) {
        if (active) setCompany(null);
      }
    };
    loadCompany();
    return () => {
      active = false;
    };
  }, [open, api]);

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
      setShowReceiptConfirm(false);
      setPaymentData(null);
      setRemainingDebts([]);
      setTotalRemainingDebt(null);
      setSelectedInstallmentId(null);
      setDebtFilter('default');
      setShowGeneratedBillets(false);
      setShowBilletConfirm(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !data || !data.installments) return;

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

  const filteredInstallments = useMemo(() => {
    return filterInstallmentsByDueDate(installments, debtFilter);
  }, [installments, debtFilter]);

  const installmentDetailsById = useMemo(() => {
    return new Map(
      installments.map((inst) => [inst.id, inst]),
    );
  }, [installments]);

  const selectedInstallments = useMemo(() => {
    return filteredInstallments.filter((inst) => selection[inst.id]?.selected);
  }, [filteredInstallments, selection]);

  const totalToPay = useMemo(() => {
    return selectedInstallments.reduce((sum, inst) => {
      const value = selection[inst.id]?.amount ?? 0;
      return Math.round((sum + value) * 100) / 100;
    }, 0);
  }, [selectedInstallments, selection]);

  const totalRemaining = useMemo(() => {
    return filteredInstallments.reduce((sum, inst) => {
      return Math.round((sum + toNumber(inst.remainingAmount)) * 100) / 100;
    }, 0);
  }, [filteredInstallments]);

  const hasAnyPendingInstallments = installments.some(
    (inst) => toNumber(inst.remainingAmount) > 0,
  );

  const hasFilteredPendingInstallments = filteredInstallments.some(
    (inst) => toNumber(inst.remainingAmount) > 0,
  );

  const generatedBillets = useMemo<GeneratedBillet[]>(() => {
    if (!paymentData?.payments || !Array.isArray(paymentData.payments)) return [];
    return paymentData.payments
      .filter((payment: any) => !!payment?.newBilletPdf)
      .map((payment: any) => {
        const details = installmentDetailsById.get(payment.installmentId);
        return {
          installmentId: payment.installmentId,
          installmentNumber: details?.installmentNumber,
          totalInstallments: details?.totalInstallments,
          dueDate: payment.dueDate ?? details?.dueDate,
          remainingAmount: payment.remainingAmount ?? details?.remainingAmount,
          newBilletPdf: payment.newBilletPdf,
        };
      });
  }, [paymentData?.payments, installmentDetailsById]);

  const hasGeneratedBillets = generatedBillets.length > 0;

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
    const filteredIds = new Set(
      filteredInstallments
        .filter((inst) => toNumber(inst.remainingAmount) > 0)
        .map((inst) => inst.id),
    );
    setSelection((prev) => {
      const updates: typeof prev = {};
      Object.entries(prev).forEach(([key, value]) => {
        updates[key] = filteredIds.has(key)
          ? {
              ...value,
              selected: true,
              amount: Math.round(value.remaining * 100) / 100,
              inputValue: formatInputValue(value.remaining),
            }
          : value;
      });
      return updates;
    });
  };

  const clearSelection = () => {
    const filteredIds = new Set(
      filteredInstallments
        .filter((inst) => toNumber(inst.remainingAmount) > 0)
        .map((inst) => inst.id),
    );
    setSelection((prev) => {
      const updates: typeof prev = {};
      Object.entries(prev).forEach(([key, value]) => {
        updates[key] = filteredIds.has(key)
          ? { ...value, selected: false, amount: 0, inputValue: '' }
          : value;
      });
      return updates;
    });
  };

  // Carrega dívidas pendentes após o pagamento
  useEffect(() => {
    if (!paymentData || !customerId) {
      setRemainingDebts([]);
      setTotalRemainingDebt(null);
      return;
    }

    let isCancelled = false;
    const currentCustomerId = customerId;
    const loadRemainingDebts = async () => {
      try {
        const resp = await api.get(`/installment/customer/${currentCustomerId}/summary`);
        const raw = resp?.data ?? {};
        const installmentsList: any[] = Array.isArray(raw.installments) ? raw.installments : [];

        const pending = installmentsList
          .filter((inst) => {
            const remaining = toNumber(inst.remainingAmount ?? inst.amount);
            return remaining > 0;
          })
          .map((inst) => ({
            id: inst.id,
            installmentNumber: inst.installmentNumber,
            totalInstallments: inst.totalInstallments,
            amount: toNumber(inst.amount),
            remainingAmount: toNumber(inst.remainingAmount ?? inst.amount),
            dueDate: inst.dueDate,
          }));

        const total = pending.reduce((sum, inst) => sum + inst.remainingAmount, 0);

        if (!isCancelled) {
          setRemainingDebts(pending);
          setTotalRemainingDebt(total);
        }
      } catch (err) {
        if (!isCancelled) {
          setRemainingDebts([]);
          setTotalRemainingDebt(null);
        }
      }
    };

    loadRemainingDebts();
    return () => {
      isCancelled = true;
    };
    // Usa apenas customerId e verifica se paymentData existe (não o objeto inteiro)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!paymentData, customerId, api]);

  const bulkPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!customerId) return null;
      return api.post(`/installment/customer/${customerId}/pay/bulk`, payload);
    },
    onSuccess: async (response, variables) => {
      // Armazena os dados do pagamento para o comprovante
      setPaymentData({
        totalPaid: response?.data?.totalPaid || 0,
        paymentMethod: variables.paymentMethod,
        notes: variables.notes,
        date: new Date().toISOString(),
        sellerName: user?.name,
        payments: response?.data?.payments || [],
      });
      const payments = Array.isArray(response?.data?.payments) ? response.data.payments : [];
      const hasNewBillets = payments.some((payment: any) => !!payment?.newBilletPdf);
      if (hasNewBillets) {
        setShowBilletConfirm(true);
        setShowGeneratedBillets(false);
      } else {
        setShowGeneratedBillets(false);
      }
      
      toast.success(response?.data?.message || 'Pagamentos registrados com sucesso!');
      await refetch();
      onPaid?.();
      
      // Mostra o diálogo de confirmação de impressão
      setShowReceiptConfirm(true);
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
    if (!hasAnyPendingInstallments) {
      toast.error('Não há dívidas pendentes para este cliente.');
      return;
    }

    bulkPaymentMutation.mutate({
      paymentMethod,
      notes: notes || undefined,
      payAll: true,
    });
  };

  const handlePrintReceipt = async () => {
    setShowReceiptConfirm(false);
    
    if (!paymentData || !customer) {
      toast.error('Dados do pagamento não carregados');
      return;
    }

    setPrinting(true);
    try {
      // Aguarda carregamento das dívidas pendentes se ainda não foram carregadas
      let finalRemainingDebts = remainingDebts;
      let finalTotalRemaining = totalRemainingDebt;

      if (remainingDebts.length === 0 && customerId) {
        try {
          const resp = await api.get(`/installment/customer/${customerId}/summary`);
          const raw = resp?.data ?? {};
          const installmentsList: any[] = Array.isArray(raw.installments) ? raw.installments : [];

          const pending = installmentsList
            .filter((inst) => {
              const remaining = toNumber(inst.remainingAmount ?? inst.amount);
              return remaining > 0;
            })
            .map((inst) => ({
              id: inst.id,
              installmentNumber: inst.installmentNumber,
              totalInstallments: inst.totalInstallments,
              amount: toNumber(inst.amount),
              remainingAmount: toNumber(inst.remainingAmount ?? inst.amount),
              dueDate: inst.dueDate,
            }));

          finalRemainingDebts = pending;
          finalTotalRemaining = pending.reduce((sum, inst) => sum + inst.remainingAmount, 0);
        } catch (err) {
          // Usa os valores já carregados em caso de erro
        }
      }

      // Gera o conteúdo de impressão
      const receiptContent = generateBulkPaymentReceiptContent({
        companyInfo: companyInfo || undefined,
        customerInfo: {
          id: customer.id,
          name: customer.name || '',
          cpfCnpj: customer.cpfCnpj,
          phone: undefined,
        },
        paymentData,
        installmentsData: data?.installments,
        remainingDebts: finalRemainingDebts,
        totalRemainingDebt: finalTotalRemaining,
      });

      // Imprime usando o serviço universal
      const printResult = await printContent(receiptContent);
      
      if (printResult.success) {
        toast.success('Comprovante enviado para impressão!');
      } else {
        toast.error(`Erro ao imprimir: ${printResult.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao imprimir comprovante:', error);
      toast.error('Erro ao preparar comprovante para impressão');
    } finally {
      setPrinting(false);
      setPaymentData(null);
      onClose();
    }
  };

  const downloadBilletPdf = (base64: string, filename: string) => {
    if (!base64 || typeof window === 'undefined') return;
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSkipReceipt = () => {
    setShowReceiptConfirm(false);
    setPaymentData(null);
    onClose();
  };

  const handleShowGeneratedBillets = () => {
    setShowBilletConfirm(false);
    setShowGeneratedBillets(true);
  };

  const handleSkipGeneratedBillets = () => {
    setShowBilletConfirm(false);
    setShowGeneratedBillets(false);
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

        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Label>Filtrar dívidas</Label>
              <Select
                value={debtFilter}
                onValueChange={(value) => setDebtFilter(value as DebtFilter)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Vencidas ou este mês</SelectItem>
                  <SelectItem value="overdue">Somente atrasadas</SelectItem>
                  <SelectItem value="all">Todas as dívidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading || isFetching ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !hasAnyPendingInstallments ? (
            <div className="py-10 text-center text-muted-foreground">
              Nenhuma dívida pendente foi encontrada para este cliente.
            </div>
          ) : !hasFilteredPendingInstallments ? (
            <div className="py-10 text-center text-muted-foreground">
              Nenhuma dívida encontrada para este filtro. Tente &quot;Todas as dívidas&quot;.
            </div>
          ) : (
            <>
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
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInstallments.map((inst) => {
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
                              className="appearance-none"
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
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInstallmentId(inst.id)}
                              className="h-8 w-8 p-0"
                              title="Ver detalhes dos produtos"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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

              {hasGeneratedBillets && showGeneratedBillets && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <div className="text-sm font-semibold">Boletos gerados para o proximo mes</div>
                  <div className="mt-3 space-y-2">
                    {generatedBillets.map((billet: GeneratedBillet) => {
                      const installmentLabel =
                        billet.installmentNumber && billet.totalInstallments
                          ? `Parcela ${billet.installmentNumber}/${billet.totalInstallments}`
                          : 'Parcela atualizada';
                      const dueDateLabel = billet.dueDate ? formatDate(billet.dueDate) : 'Nao informado';
                      const fileName =
                        billet.installmentNumber && billet.totalInstallments
                          ? `boleto-parcela-${billet.installmentNumber}-${billet.totalInstallments}.pdf`
                          : 'boleto-restante.pdf';

                      return (
                        <div
                          key={billet.installmentId}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-100 bg-white px-3 py-2"
                        >
                          <div className="text-sm">
                            <div className="font-medium">{installmentLabel}</div>
                            <div className="text-xs text-amber-800">Vencimento: {dueDateLabel}</div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => downloadBilletPdf(billet.newBilletPdf, fileName)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Baixar boleto
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

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
            disabled={bulkPaymentMutation.isPending || !hasAnyPendingInstallments}
          >
            {bulkPaymentMutation.isPending ? 'Processando...' : 'Pagar todas as dívidas'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Modal de confirmação de impressão */}
      <PaymentReceiptConfirmDialog
        open={showReceiptConfirm}
        onConfirm={handlePrintReceipt}
        onCancel={handleSkipReceipt}
      />

      <ConfirmationModal
        open={showBilletConfirm}
        onClose={handleSkipGeneratedBillets}
        onConfirm={handleShowGeneratedBillets}
        title="Boleto do restante"
        description="Deseja visualizar ou imprimir o boleto referente ao valor restante da dívida?"
        confirmText="Visualizar boleto"
        cancelText="Não agora"
      />

      {/* Modal de detalhes dos produtos */}
      {selectedInstallmentId && (
        <InstallmentProductsDialog
          open={!!selectedInstallmentId}
          onClose={() => setSelectedInstallmentId(null)}
          installmentId={selectedInstallmentId}
        />
      )}
    </Dialog>
  );
}


