import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Lock,
  Unlock,
  CreditCard,
  Wallet,
  TrendingUp,
  Calendar,
  Printer,
  History,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  Loader2,
  ArrowDownCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useDateRange } from '../../hooks/useDateRange';
import { printContent } from '@/lib/print-service';
import { cashClosureApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { formatCurrency, formatDateTime, formatDate, toLocalISOString } from '@/lib/utils';

interface PaymentSummaryEntry {
  method: string;
  total: number;
}

interface SalePaymentDetail {
  method: string;
  amount: number;
}

interface SellerSale {
  id: string;
  date: string;
  total: number;
  change: number;
  clientName?: string | null;
  paymentMethods: SalePaymentDetail[];
}

interface SellerReport {
  id: string;
  name: string;
  totalSales: number;
  totalChange: number;
  sales: SellerSale[];
}

interface CashClosureReportData {
  company: {
    name: string;
    cnpj: string;
    address?: string;
  };
  closure: {
    id: string;
    openingDate: string;
    closingDate: string;
    openingAmount: number;
    closingAmount: number;
    totalSales: number;
    totalWithdrawals: number;
    totalChange: number;
    totalCashSales: number;
    expectedClosing: number;
    difference: number;
    salesCount: number;
    seller?: {
      id: string;
      name: string;
    } | null;
  };
  paymentSummary: PaymentSummaryEntry[];
  sellers: SellerReport[];
  includeSaleDetails: boolean;
  installmentPayments?: {
    total: number;
    byMethod: PaymentSummaryEntry[];
    count: number;
  };
  withdrawals?: Array<{
    id?: string;
    amount: number;
    reason: string;
    createdAt: string;
  }>;
  metadata?: {
    clientTimeInfo?: {
      timeZone?: string;
      locale?: string;
      utcOffsetMinutes?: number;
      currentDate?: string;
    };
  };
}

interface CashClosureSummary {
  id: string;
  openingDate: string;
  closingDate?: string | null;
  openingAmount: number;
  closingAmount: number;
  totalSales: number;
  totalWithdrawals?: number;
  totalChange?: number;
  totalCashSales?: number;
  expectedClosing?: number;
  difference?: number;
  salesCount?: number;
  seller?: {
    id: string;
    name: string;
  } | null;
  includeSaleDetails?: boolean;
}

interface CashClosure extends CashClosureSummary {
  isClosed: boolean;
  reportData?: CashClosureReportData;
}

interface CashClosureHistoryResponse {
  closures: CashClosure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CashClosureDetailsResponse extends CashClosureSummary {
  closure: CashClosureSummary;
  reportData: CashClosureReportData;
  reportContent?: string;
}

interface CashClosureDetailsDialogData extends CashClosureDetailsResponse {
  printRequested?: boolean;
  printResult?: {
    success?: boolean;
    error?: string;
    content?: string | null;
  } | null;
}

interface CashStats {
  hasOpenClosure: boolean;
  openingDate?: string;
  openingAmount?: number;
  totalSales?: number;
  totalCashSales?: number;
  salesCount?: number;
  salesByPaymentMethod?: Record<string, number>;
  salesBySeller?: Record<string, number>;
  totalInstallmentPayments?: number;
  installmentPaymentsByMethod?: Record<string, number>;
  totalWithdrawals?: number;
  withdrawals?: Array<{
    id: string;
    amount: number;
    reason: string;
    createdAt: string;
  }>;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  pix: 'PIX',
  installment: 'Parcelado',
};

const getPaymentMethodLabel = (method: string) => PAYMENT_METHOD_LABELS[method] ?? method;

const WITHDRAWAL_REASONS = [
  'Troco para clientes',
  'Depósito bancário',
  'Despesas operacionais',
  'Outro',
] as const;

export default function CashClosurePage() {
  const { api } = useAuth();
  const { queryParams, queryKeyPart } = useDateRange();
  const [openingAmount, setOpeningAmount] = useState<number | undefined>(0);
  const [closingAmount, setClosingAmount] = useState<number | undefined>(0);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);
  const [includeSaleDetails, setIncludeSaleDetails] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; data?: CashClosureDetailsDialogData | null; title?: string }>({ open: false });
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number | undefined>(undefined);
  const [withdrawReason, setWithdrawReason] = useState<string>('');
  const [withdrawReasonOther, setWithdrawReasonOther] = useState('');

  // Buscar caixa atual
  const { data: currentClosure, isLoading: isLoadingCurrent, refetch: refetchCurrent } = useQuery<CashClosure | null>({
    queryKey: ['current-cash-closure'],
    queryFn: async () => {
      try {
        const response = await api.get('/cash-closure/current');
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });

  // Buscar estatísticas do caixa
  const { data: stats, refetch: refetchStats } = useQuery<CashStats>({
    queryKey: ['cash-stats'],
    queryFn: async () => (await api.get('/cash-closure/stats')).data,
    enabled: !!currentClosure,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Buscar histórico
  const { data: historyData, refetch: refetchHistory } = useQuery<CashClosureHistoryResponse>({
    queryKey: ['cash-history', queryKeyPart],
    queryFn: async () => {
      const params: any = {};
      if (queryParams.startDate) params.startDate = queryParams.startDate;
      if (queryParams.endDate) params.endDate = queryParams.endDate;
      return (await api.get('/cash-closure/history', { params })).data as CashClosureHistoryResponse;
    },
    enabled: showHistory,
  });

  const handleOpenCashClosure = async () => {
    if ((openingAmount ?? 0) < 0) {
      toast.error('Valor de abertura não pode ser negativo');
      return;
    }

    setLoading(true);
    try {
      await api.post('/cash-closure', {
        openingAmount: openingAmount ?? 0,
        openingDate: toLocalISOString(),
      });
      toast.success('Caixa aberto com sucesso!');
      refetchCurrent();
      setOpeningAmount(0);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCashClosure = () => {
    if (!currentClosure) return;

    if ((closingAmount ?? 0) < 0) {
      toast.error('Valor de fechamento não pode ser negativo');
      return;
    }

    if ((closingAmount ?? 0) === 0) {
      toast.error('Informe o valor contado no caixa antes de fechar.');
      return;
    }

    setIncludeSaleDetails(false);
    setCloseConfirmationOpen(true);
  };

  const handleCreateWithdrawal = async () => {
    const amount = withdrawAmount ?? 0;
    const reason = withdrawReason === 'Outro' ? withdrawReasonOther.trim() : withdrawReason;

    if (amount <= 0) {
      toast.error('Informe um valor maior que zero');
      return;
    }

    if (!reason) {
      toast.error('Informe o motivo do saque');
      return;
    }

    setLoading(true);
    try {
      await api.post('/cash-closure/withdrawals', { amount, reason });
      toast.success('Saque registrado com sucesso!');
      setWithdrawDialogOpen(false);
      setWithdrawAmount(undefined);
      setWithdrawReason('');
      setWithdrawReasonOther('');
      refetchStats();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const executeCloseCashClosure = async (shouldPrint: boolean) => {
    if (!currentClosure) return;

    setLoading(true);
    try {
      const response = await api.patch('/cash-closure/close', {
        closingAmount: closingAmount ?? 0,
        printReport: shouldPrint,
        closingDate: toLocalISOString(),
        includeSaleDetails,
      });

      const result = (response.data ?? {}) as CashClosureDetailsDialogData;
      const summary = result?.closure ?? result;
      const printResult = result?.printResult;
      const reportContent = result?.reportContent ?? null;

      const differenceValue = summary?.difference ?? difference;
      toast.success(`Caixa fechado com sucesso! Diferença: ${formatCurrency(differenceValue)}`);

      if (result?.reportData) {
        setDetailsDialog({
          open: true,
          data: result,
          title: 'Detalhes do fechamento concluído',
        });
      }

      if (shouldPrint) {
        await handleReportPrinting(printResult ?? undefined, reportContent, 'Relatório enviado para impressão!');
      }

      await refetchCurrent().catch(() => undefined);
      if (showHistory) {
        await refetchHistory().catch(() => undefined);
      }

      setClosingAmount(0);
      setCloseConfirmationOpen(false);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReprintReport = async (id: string, includeDetails: boolean = false) => {
    try {
      const response = await cashClosureApi.reprint(id, { includeSaleDetails: includeDetails });
      const result = response.data ?? {};
      const printResult = result?.printResult;
      const reportContent = result?.reportContent ?? null;

      const printed = await handleReportPrinting(printResult ?? undefined, reportContent, 'Relatório enviado para impressão!');
      if (!printed && !printResult?.error && !reportContent) {
        toast.error('Não foi possível reimprimir o relatório.');
      }

      if (result?.reportData) {
        setDetailsDialog({
          open: true,
          data: result,
          title: 'Detalhes do fechamento',
        });
      }
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleReportPrinting = async (
    printResult?: { success?: boolean; error?: string; content?: string | null },
    reportContent?: string | null,
    successMessage = 'Relatório enviado para impressão!',
  ) => {
    const fallbackContent = reportContent ?? printResult?.content ?? null;

    if (printResult?.success) {
      toast.success(successMessage);
      return true;
    }

    if (printResult && printResult.success === false) {
      toast.error(printResult.error || 'Não foi possível enviar o relatório para a impressora configurada.');
      if (fallbackContent) {
        const localResult = await printContent(fallbackContent);
        if (localResult.success) {
          toast.success('Relatório impresso localmente.');
          return true;
        }
        toast.error(localResult.error || 'Também não foi possível imprimir o relatório localmente.');
      }
      return false;
    }

    if (!printResult && fallbackContent) {
      const localResult = await printContent(fallbackContent);
      if (localResult.success) {
        toast.success(successMessage);
        return true;
      }
      toast.error(localResult.error || 'Não foi possível imprimir o relatório.');
      return false;
    }

    return false;
  };

  const handleViewDetails = async (id: string, title?: string, includeDetails: boolean = true) => {
    setDetailsLoadingId(id);
    try {
      const response = await cashClosureApi.getPrintContent(id, { includeSaleDetails: includeDetails });
      const responseData = response.data?.data || response.data;
      const result = (responseData ?? {}) as CashClosureDetailsDialogData;

      if (result?.reportData) {
        setDetailsDialog({
          open: true,
          data: result,
          title: title ?? 'Detalhes do fechamento',
        });
      } else {
        toast.error('Não foi possível carregar os detalhes do fechamento.');
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setDetailsLoadingId(null);
    }
  };

  if (isLoadingCurrent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Cálculos - Usar apenas vendas em dinheiro para o caixa
  const expectedClosing = currentClosure
    ? Number(currentClosure.openingAmount || 0) + Number(stats?.totalCashSales || 0) - Number(stats?.totalWithdrawals ?? 0)
    : 0;

  const difference = Number(closingAmount ?? 0) - expectedClosing;
  const differenceColorClass = Math.abs(difference) < 0.01
    ? 'text-green-600'
    : difference > 0
    ? 'text-blue-600'
    : 'text-red-600';

  return (
    <>
      <Dialog
        open={closeConfirmationOpen}
        onOpenChange={(open) => {
          if (!loading) {
            setCloseConfirmationOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar fechamento do caixa</DialogTitle>
            <DialogDescription>
              Revise os valores antes de concluir e escolha se deseja imprimir o relatório.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium text-foreground">Incluir detalhes das vendas</p>
                <p className="text-xs text-muted-foreground">Quando ativado, o relatório trará cada venda individualmente. Desativado mostra apenas os totais.</p>
              </div>
              <Switch
                checked={includeSaleDetails}
                onCheckedChange={(checked) => setIncludeSaleDetails(checked)}
                aria-label="Incluir detalhes das vendas"
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Saldo esperado</span>
              <span className="font-semibold">{formatCurrency(expectedClosing)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Valor contado</span>
              <span className="font-semibold">{formatCurrency(closingAmount ?? 0)}</span>
            </div>
            <div className={`flex items-center justify-between font-semibold ${differenceColorClass}`}>
              <span>Diferença</span>
              <span>{difference >= 0 ? '+' : ''}{formatCurrency(difference)}</span>
            </div>
            <div className="border-t pt-3 text-muted-foreground">
              <p>O relatório inclui todas as vendas, trocos e formas de pagamento deste período.</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setCloseConfirmationOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => executeCloseCashClosure(false)}
              disabled={loading}
            >
              Fechar sem imprimir
            </Button>
            <Button
              onClick={() => executeCloseCashClosure(true)}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Fechando...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Fechar e imprimir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={withdrawDialogOpen}
        onOpenChange={(open) => {
          if (!loading) {
            setWithdrawDialogOpen(open);
            if (!open) {
              setWithdrawAmount(undefined);
              setWithdrawReason('');
              setWithdrawReasonOther('');
            }
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5" />
              Registrar Saque
            </DialogTitle>
            <DialogDescription>
              Registre o saque realizado no caixa. O valor será descontado do saldo esperado no fechamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="withdrawAmount">Valor (R$) *</Label>
              <Input
                id="withdrawAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={withdrawAmount ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setWithdrawAmount(v === '' ? undefined : (() => { const n = Number(v); return isNaN(n) ? undefined : n; })());
                }}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawReason">Motivo do saque *</Label>
              <Select value={withdrawReason} onValueChange={setWithdrawReason} disabled={loading}>
                <SelectTrigger id="withdrawReason">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {WITHDRAWAL_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {withdrawReason === 'Outro' && (
                <Textarea
                  placeholder="Descreva o motivo do saque"
                  value={withdrawReasonOther}
                  onChange={(e) => setWithdrawReasonOther(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="mt-2"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setWithdrawDialogOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateWithdrawal}
              disabled={loading || (withdrawAmount ?? 0) <= 0 || !withdrawReason || (withdrawReason === 'Outro' && !withdrawReasonOther.trim())}
            >
              {loading ? 'Registrando...' : 'Registrar Saque'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailsDialog.open}
        onOpenChange={(open) => {
          setDetailsDialog((prev) => (open ? { ...prev, open } : { open: false }));
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailsDialog.title ?? 'Detalhes do fechamento'}</DialogTitle>
            <DialogDescription>
              Visualize todas as vendas, formas de pagamento e totais deste período.
            </DialogDescription>
          </DialogHeader>

          {detailsDialog.data ? (
            (() => {
              const reportData = detailsDialog.data!.reportData;
              const summary = reportData.closure;
              const company = reportData.company;
              const includeDetails = reportData.includeSaleDetails;
              const differenceValue = summary.difference;
              const differenceClass = Math.abs(differenceValue) < 0.01
                ? 'text-green-600'
                : differenceValue > 0
                ? 'text-blue-600'
                : 'text-red-600';

              return (
                <div className="space-y-6">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{company.name}</p>
                    <p>CNPJ: {company.cnpj}</p>
                    {company.address && <p>{company.address}</p>}
                    <p>Detalhes individuais incluídos: {includeDetails ? 'Sim' : 'Não'}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Abertura</p>
                      <p className="text-sm font-semibold text-foreground">{formatDateTime(summary.openingDate)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Fechamento</p>
                      <p className="text-sm font-semibold text-foreground">{formatDateTime(summary.closingDate)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Vendas registradas</p>
                      <p className="text-sm font-semibold text-foreground">{summary.salesCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Saldo inicial</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.openingAmount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Total de vendas</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.totalSales)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Retiradas</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.totalWithdrawals ?? 0)}</p>
                    </div>
                  </div>

                  {reportData.withdrawals && reportData.withdrawals.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Detalhamento de saques</h3>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[140px]">Data/Hora</TableHead>
                              <TableHead>Motivo</TableHead>
                              <TableHead className="text-right w-[120px]">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.withdrawals.map((w, idx) => (
                              <TableRow key={w.id ?? idx}>
                                <TableCell className="text-muted-foreground text-sm">
                                  {formatDateTime(w.createdAt)}
                                </TableCell>
                                <TableCell>{w.reason}</TableCell>
                                <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                                  -{formatCurrency(w.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Vendas em dinheiro</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.totalCashSales ?? 0)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Saldo esperado</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.expectedClosing ?? 0)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Saldo informado</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.closingAmount)}</p>
                    </div>
                    <div className="rounded-lg border p-4 md:col-span-2">
                      <p className="text-xs text-muted-foreground">Diferença</p>
                      <p className={`text-sm font-semibold ${differenceClass}`}>
                        {differenceValue >= 0 ? '+' : ''}{formatCurrency(differenceValue)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Resumo por forma de pagamento</h3>
                    {reportData.paymentSummary.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {reportData.paymentSummary.map((entry) => (
                          <div key={entry.method} className="flex items-center justify-between rounded border p-3 text-sm">
                            <span>{getPaymentMethodLabel(entry.method)}</span>
                            <span className="font-semibold">{formatCurrency(entry.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {reportData.installmentPayments && reportData.installmentPayments.count > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Pagamentos de Parcelas</h3>
                      <div className="rounded-lg border p-4 bg-muted/50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-muted-foreground">Total de pagamentos:</span>
                          <span className="font-semibold">{reportData.installmentPayments.count}</span>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-muted-foreground">Valor total:</span>
                          <span className="font-semibold text-lg">{formatCurrency(reportData.installmentPayments.total)}</span>
                        </div>
                        {reportData.installmentPayments.byMethod.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Por forma de pagamento:</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {reportData.installmentPayments.byMethod.map((entry) => (
                                <div key={entry.method} className="flex items-center justify-between rounded border p-2 text-sm bg-background">
                                  <span>{getPaymentMethodLabel(entry.method)}</span>
                                  <span className="font-semibold">{formatCurrency(entry.total)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Vendas por vendedor</h3>
                    {reportData.sellers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
                    ) : (
                      reportData.sellers.map((seller) => (
                        <div key={seller.id} className="space-y-3 rounded-lg border p-4">
                          <div className="flex flex-col gap-1 text-sm">
                            <p className="font-semibold text-foreground">{seller.name}</p>
                            <div className="flex flex-wrap gap-4 text-muted-foreground">
                              <span>Total vendido: {formatCurrency(seller.totalSales)}</span>
                              <span>Troco concedido: {formatCurrency(seller.totalChange)}</span>
                              <span>Vendas: {includeDetails ? seller.sales.length : '-'}</span>
                            </div>
                          </div>

                          {includeDetails ? (
                            <div className="overflow-x-auto rounded border">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                                  <tr>
                                    <th className="px-3 py-2">Data/Hora</th>
                                    <th className="px-3 py-2">Cliente</th>
                                    <th className="px-3 py-2">Total</th>
                                    <th className="px-3 py-2">Pagamentos</th>
                                    <th className="px-3 py-2">Troco</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {seller.sales.map((sale) => {
                                    const payments = sale.paymentMethods
                                      .map((payment) => `${getPaymentMethodLabel(payment.method)} (${formatCurrency(payment.amount)})`)
                                      .join(', ');
                                    return (
                                      <tr key={sale.id} className="border-t">
                                        <td className="px-3 py-2 align-top text-foreground">{formatDateTime(sale.date)}</td>
                                        <td className="px-3 py-2 align-top text-muted-foreground">{sale.clientName || '-'}</td>
                                        <td className="px-3 py-2 align-top text-foreground font-semibold">{formatCurrency(sale.total)}</td>
                                        <td className="px-3 py-2 align-top text-muted-foreground">{payments || '-'}</td>
                                        <td className="px-3 py-2 align-top text-muted-foreground">{sale.change > 0 ? formatCurrency(sale.change) : '-'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Detalhes individuais não incluídos neste relatório.</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="py-6 text-sm text-muted-foreground">Selecione um fechamento para visualizar os detalhes.</p>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fechamento de Caixa</h1>
          <p className="text-muted-foreground">
            Gerencie a abertura e fechamento do caixa
          </p>
        </div>
        {currentClosure && (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Unlock className="h-4 w-4 mr-1" />
            Caixa Aberto
          </Badge>
        )}
      </div>

      {!currentClosure ? (
        // CAIXA FECHADO - Formulário de Abertura
        <>
          <Card className="border-2 border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Unlock className="h-5 w-5 text-green-600" />
                Abrir Caixa
              </CardTitle>
              <CardDescription>
                Informe o valor inicial em dinheiro no caixa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openingAmount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Valor de Abertura (R$)
                </Label>
                <Input
                  id="openingAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingAmount ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setOpeningAmount(v === '' ? undefined : (() => { const n = Number(v); return isNaN(n) ? undefined : n; })());
                  }}
                  onFocus={(e) => {
                    if (Number(e.target.value) === 0) {
                      e.target.value = '';
                    }
                  }}
                  placeholder="0.00"
                  disabled={loading}
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Digite o valor em dinheiro que está no caixa no início do expediente
                </p>
              </div>

              <Button
                onClick={handleOpenCashClosure}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Abrindo...
                  </>
                ) : (
                  <>
                    <Unlock className="mr-2 h-4 w-4" />
                    Abrir Caixa
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Aviso */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    Importante
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    Abra o caixa no início do expediente. Todas as vendas realizadas serão
                    vinculadas a este fechamento até que você feche o caixa novamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        // CAIXA ABERTO - Estatísticas e Fechamento
        <>
          {/* Cards de Estatísticas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Inicial</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentClosure.openingAmount || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Abertura em {formatDateTime(currentClosure.openingDate)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas em Dinheiro</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.totalCashSales || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Para o caixa físico
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Esperado</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(expectedClosing)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Inicial + Vendas - Saques
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Diferença</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  Math.abs(difference) < 0.01 ? 'text-green-600' :
                  difference > 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.abs(difference) < 0.01 ? 'Caixa correto ✓' :
                   difference > 0 ? 'Sobra' : 'Falta'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detalhes por Forma de Pagamento */}
          {stats?.salesByPaymentMethod && Object.keys(stats.salesByPaymentMethod).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Vendas por Forma de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(stats.salesByPaymentMethod).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {method === 'cash' && '💵 Dinheiro'}
                          {method === 'credit_card' && '💳 Crédito'}
                          {method === 'debit_card' && '💳 Débito'}
                          {method === 'pix' && '📱 PIX'}
                          {method === 'installment' && '📅 Parcelado'}
                          {!['cash', 'credit_card', 'debit_card', 'pix', 'installment'].includes(method) && method}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total recebido
                        </p>
                      </div>
                      <div className="text-lg font-bold">
                        {formatCurrency(amount as number)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagamentos de Parcelas */}
          {stats?.installmentPaymentsByMethod && Object.keys(stats.installmentPaymentsByMethod).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Pagamentos de Parcelas
                </CardTitle>
                <CardDescription>
                  Pagamentos de parcelas realizados durante este período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(stats.installmentPaymentsByMethod).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {method === 'cash' && '💵 Dinheiro'}
                          {method === 'credit_card' && '💳 Crédito'}
                          {method === 'debit_card' && '💳 Débito'}
                          {method === 'pix' && '📱 PIX'}
                          {method === 'store_credit' && '🏬 Crédito em Loja'}
                          {!['cash', 'credit_card', 'debit_card', 'pix', 'store_credit'].includes(method) && method}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pagamentos de parcelas
                        </p>
                      </div>
                      <div className="text-lg font-bold">
                        {formatCurrency(amount as number)}
                      </div>
                    </div>
                  ))}
                </div>
                {stats.totalInstallmentPayments && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Total de Pagamentos de Parcelas:</span>
                      <span className="text-lg font-bold">{formatCurrency(stats.totalInstallmentPayments)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vendas por Vendedor */}
          {stats?.salesBySeller && Object.keys(stats.salesBySeller).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Vendas por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.salesBySeller).map(([seller, amount]) => (
                    <div key={seller} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{seller}</span>
                      <span className="text-lg font-bold">{formatCurrency(amount as number)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulário de Fechamento */}
          <Card className="border-2 border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                Fechar Caixa
              </CardTitle>
              <CardDescription>
                Conte o dinheiro e informe os valores para fechar o caixa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="closingAmount" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor Contado no Caixa (R$) *
                    </Label>
                    <Input
                      id="closingAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={closingAmount ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setClosingAmount(v === '' ? undefined : (() => { const n = Number(v); return isNaN(n) ? undefined : n; })());
                      }}
                      onFocus={(e) => {
                        if (Number(e.target.value) === 0) {
                          e.target.value = '';
                        }
                      }}
                      placeholder="0.00"
                      disabled={loading}
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Conte todo o dinheiro físico no caixa
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWithdrawDialogOpen(true)}
                    disabled={loading}
                    className="shrink-0 gap-2"
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    Registrar Saque
                  </Button>
                </div>

                {stats?.withdrawals && stats.withdrawals.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Saques registrados no dia</Label>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[140px]">Data/Hora</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead className="text-right w-[120px]">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.withdrawals.map((w) => (
                            <TableRow key={w.id}>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatDateTime(w.createdAt)}
                              </TableCell>
                              <TableCell>{w.reason}</TableCell>
                              <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                                -{formatCurrency(w.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total de saques: <span className="font-semibold text-foreground">{formatCurrency(stats.totalWithdrawals ?? 0)}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Resumo do Fechamento */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-semibold mb-3">Resumo do Fechamento:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Saldo Inicial:</span>
                    <span className="font-medium">{formatCurrency(currentClosure.openingAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>+ Vendas em Dinheiro:</span>
                    <span className="font-medium">{formatCurrency(stats?.totalCashSales || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>- Saques:</span>
                    <span className="font-medium">{formatCurrency(stats?.totalWithdrawals ?? 0)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Saldo Esperado:</span>
                    <span>{formatCurrency(expectedClosing)}</span>
                  </div>
{(closingAmount ?? 0) > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span>Valor Contado:</span>
                          <span className="font-medium">{formatCurrency(closingAmount ?? 0)}</span>
                        </div>
                      <div className={`border-t pt-2 flex justify-between font-bold ${
                        Math.abs(difference) < 0.01 ? 'text-green-600' :
                        difference > 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        <span>Diferença:</span>
                        <span>{difference >= 0 ? '+' : ''}{formatCurrency(difference)}</span>
                      </div>
                      {Math.abs(difference) < 0.01 && (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          ✓ Caixa está correto! Pode fechar.
                        </p>
                      )}
                      {Math.abs(difference) >= 0.01 && (
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                          ⚠️ Há uma diferença de {formatCurrency(Math.abs(difference))}. Verifique antes de fechar.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <Button
                onClick={handleCloseCashClosure}
                disabled={loading || (closingAmount ?? 0) === 0}
                className="w-full"
                size="lg"
                variant="destructive"
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Fechando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Fechar Caixa
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Histórico de Fechamentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Fechamentos
              </CardTitle>
              <CardDescription>
                Fechamentos anteriores realizados
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) refetchHistory();
              }}
            >
              {showHistory ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Ocultar
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Mostrar
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {!historyData || historyData.closures?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum fechamento anterior encontrado</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Abertura</TableHead>
                      <TableHead>Fechamento</TableHead>
                      <TableHead>Saldo Inicial</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Saldo Final</TableHead>
                      <TableHead>Diferença</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData?.closures?.map((closure: CashClosure) => {
                      const diff = closure.difference ?? (
                        Number(closure.closingAmount || 0) -
                        (Number(closure.openingAmount || 0) + Number(closure.totalSales || 0) - Number(closure.totalWithdrawals || 0))
                      );
                      const diffBadgeClass = Math.abs(diff) < 0.01
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : diff > 0
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

                      return (
                        <TableRow key={closure.id}>
                          <TableCell className="font-medium">
                            {formatDate(closure.openingDate)}
                          </TableCell>
                          <TableCell>
                            {closure.closingDate ? formatDate(closure.closingDate) : '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(closure.openingAmount || 0)}</TableCell>
                          <TableCell className="text-green-600">
                            {formatCurrency(closure.totalSales || 0)}
                          </TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(closure.closingAmount || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={Math.abs(diff) < 0.01 ? 'default' : 'secondary'}
                              className={diffBadgeClass}
                            >
                              {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {closure.salesCount ?? 0} vendas
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(
                                  closure.id,
                                  `Detalhes do fechamento (${formatDate(closure.openingDate)})`,
                                  true,
                                )}
                                disabled={detailsLoadingId === closure.id}
                                title="Ver detalhes"
                              >
                                {detailsLoadingId === closure.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReprintReport(closure.id, false)}
                                title="Reimprimir apenas o resumo"
                              >
                                <Printer className="h-4 w-4" />
                                <span className="ml-2">Resumo</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReprintReport(closure.id, true)}
                                title="Reimprimir com detalhes das vendas"
                              >
                                <Printer className="h-4 w-4" />
                                <span className="ml-2">Detalhes</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
      </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
    </>
  );
}
