import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, AlertTriangle, CheckCircle2, Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../hooks/useAuth';
import { useDateRange } from '../../hooks/useDateRange';
import { InstallmentsTable } from '../installments/installments-table';
import { CustomersDebtList } from '../installments/customers-debt-list';
import { PaymentDialog } from '../installments/payment-dialog';
import { CustomerDebtPaymentDialog } from '../installments/customer-debt-payment-dialog';
import { formatCurrency } from '../../lib/utils';
import { useDeviceStore } from '../../store/device-store';
import toast from 'react-hot-toast';

type DateFilter = 'all' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'this-year';

export default function InstallmentsPage() {
  const { api, user } = useAuth();
  const { queryKeyPart } = useDateRange();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [customerDebtDialogOpen, setCustomerDebtDialogOpen] = useState(false);
  const [selectedCustomerDebt, setSelectedCustomerDebt] = useState<{
    customer: any;
    totalRemaining: number;
  } | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('this-month');
  const [lastScanned, setLastScanned] = useState(0);

  const {
    barcodeBuffer,
    setBarcodeBuffer,
    scanSuccess,
    setScanSuccess,
    scannerActive,
    setScannerActive,
  } = useDeviceStore();

  const isSeller = user?.role === 'vendedor';
  const isCompany = user?.role === 'empresa';

  // Calcular datas baseadas no filtro
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    switch (dateFilter) {
      case 'this-week': {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Domingo da semana atual
        start.setHours(0, 0, 0, 0);
        return {
          startDate: start,
          endDate: now,
        };
      }
      case 'last-week': {
        const end = new Date(now);
        end.setDate(now.getDate() - now.getDay() - 1); // Sábado da semana passada
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(end.getDate() - 6); // Domingo da semana passada
        start.setHours(0, 0, 0, 0);
        return {
          startDate: start,
          endDate: end,
        };
      }
      case 'this-month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        return {
          startDate: start,
          endDate: now,
        };
      }
      case 'last-month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        return {
          startDate: start,
          endDate: end,
        };
      }
      case 'this-year': {
        const start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        return {
          startDate: start,
          endDate: now,
        };
      }
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [dateFilter]);

  // Função para filtrar parcelas: parcelas futuras sempre aparecem, parcelas do passado só se estiverem no intervalo
  const filterInstallments = (installments: any[]) => {
    if (dateFilter === 'all' || !startDate || !endDate) {
      return installments;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return installments.filter((installment) => {
      const dueDate = new Date(installment.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Parcelas futuras sempre aparecem
      if (dueDate > now) {
        return true;
      }

      // Parcelas do passado só aparecem se estiverem no intervalo do filtro
      // Comparar apenas as datas (sem horas)
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      return dueDateOnly >= startDateOnly && dueDateOnly <= endDateOnly;
    });
  };

  const normalizeInstallments = (raw: any): any[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.installments)) return raw.installments;
    return [];
  };

  const { data: pendingInstallments, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['installments-pending', queryKeyPart],
    queryFn: async () => {
      const response = await api.get('/installment?isPaid=false');
      return normalizeInstallments(response.data);
    },
    enabled: !!user,
  });

  const { data: allInstallments, isLoading: allLoading, refetch: refetchAll } = useQuery({
    queryKey: ['installments-all', queryKeyPart],
    queryFn: async () => {
      const response = await api.get('/installment');
      return normalizeInstallments(response.data);
    },
    enabled: isCompany,
  });

  const { data: overdueInstallments, isLoading: overdueLoading, refetch: refetchOverdue } = useQuery({
    queryKey: ['installments-overdue', queryKeyPart],
    queryFn: async () => {
      const response = await api.get('/installment/overdue');
      return normalizeInstallments(response.data);
    },
    enabled: isCompany,
  });

  const { data: paidInstallments, isLoading: paidLoading, refetch: refetchPaid } = useQuery({
    queryKey: ['installments-paid', queryKeyPart],
    queryFn: async () => {
      const response = await api.get('/installment?isPaid=true');
      return normalizeInstallments(response.data);
    },
    enabled: isCompany,
  });

  const { data: stats } = useQuery({
    queryKey: ['installments-stats', queryKeyPart],
    queryFn: async () => {
      const response = await api.get('/installment/stats');
      return response.data || {};
    },
    enabled: isCompany,
  });

  const handlePayment = (installment: any) => {
    setSelectedInstallment(installment);
    setPaymentDialogOpen(true);
  };

  const refreshInstallmentLists = () => {
    if (isCompany) {
      refetchAll();
      refetchOverdue();
      refetchPaid();
    }
    refetchPending();
  };

  const handlePaymentClose = () => {
    setPaymentDialogOpen(false);
    setSelectedInstallment(null);
    refreshInstallmentLists();
  };

  const openCustomerDebtDialog = (customer: any, totalRemaining = 0) => {
    if (!customer) return;
    setSelectedCustomerDebt({
      customer,
      totalRemaining,
    });
    setCustomerDebtDialogOpen(true);
  };

  const handleManageCustomerDebt = (data: {
    customer: any;
    installmentCount: number;
    totalRemaining: number;
  }) => {
    openCustomerDebtDialog(data.customer, data.totalRemaining);
  };

  const handleManageCustomerDebtFromTable = (customer: any) => {
    openCustomerDebtDialog(customer);
  };

  const handleCustomerDebtDialogClose = () => {
    setCustomerDebtDialogOpen(false);
    setSelectedCustomerDebt(null);
  };

  const handleCustomerDebtPaid = () => {
    refreshInstallmentLists();
  };

  // Função para buscar parcela por código de barras
  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const response = await api.get(`/installment/barcode/${barcode}`);
      const installment = response.data;

      if (installment) {
        // Abrir modal de pagamento automaticamente
        setSelectedInstallment(installment);
        setPaymentDialogOpen(true);
        setScanSuccess(true);
        setTimeout(() => setScanSuccess(false), 1200);
        toast.success(`Parcela encontrada: ${installment.installmentNumber}/${installment.totalInstallments}`);
      }
    } catch (error: any) {
      console.error('Erro ao buscar parcela por código de barras:', error);
      if (error.response?.status === 404) {
        toast.error('Parcela não encontrada com este código de barras');
      } else {
        toast.error('Erro ao buscar parcela');
      }
    }
  };

  // Leitura de código de barras
  useEffect(() => {
    if (!scannerActive) {
      setScannerActive(true);
    }

    const scanStartedAtRef = { current: null as number | null };

    const onKey = (e: KeyboardEvent) => {
      if (!e.key) return;

      if (e.key === 'Enter') {
        const code = barcodeBuffer.trim();
        if (code.length >= 3) {
          const startedAt = scanStartedAtRef.current ?? Date.now();
          const duration = Date.now() - startedAt;
          const avgPerChar = duration / Math.max(1, code.length);
          const isLikelyScanner = avgPerChar < 80;

          const now = Date.now();
          if (isLikelyScanner && now - lastScanned > 500) {
            console.log('[Installments Barcode Scanner] Código escaneado:', code);
            handleBarcodeScanned(code);
            setLastScanned(now);
          }
        }
        setBarcodeBuffer('');
        scanStartedAtRef.current = null;
      } else if (e.key.length === 1) {
        if (!barcodeBuffer) {
          scanStartedAtRef.current = Date.now();
        }
        setBarcodeBuffer((s) => {
          const newBuffer = s + e.key;
          return newBuffer.length > 50 ? newBuffer.slice(-50) : newBuffer;
        });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      setScannerActive(false);
    };
  }, [barcodeBuffer, lastScanned, scannerActive, setScannerActive, setBarcodeBuffer]);

  if (isSeller) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes com Dívidas</h1>
            <p className="text-muted-foreground">Lista de clientes com pagamentos pendentes</p>
          </div>
        </div>

        <CustomersDebtList
          installments={pendingInstallments || []}
          isLoading={pendingLoading}
          onPaymentClick={handleManageCustomerDebt}
        />

        <CustomerDebtPaymentDialog
          open={customerDebtDialogOpen}
          onClose={handleCustomerDebtDialogClose}
          customer={selectedCustomerDebt?.customer}
          onPaid={handleCustomerDebtPaid}
        />

        <PaymentDialog
          open={paymentDialogOpen}
          onClose={handlePaymentClose}
          installment={selectedInstallment}
        />
      </div>
    );
  }

  if (isCompany) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pagamentos a Prazo</h1>
            <p className="text-muted-foreground">Gerencie parcelas e pagamentos dos clientes</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.totalReceivable || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.pendingInstallments || 0} parcelas pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(stats?.overdueAmount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.overdueInstallments || 0} parcelas vencidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Parcelas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalInstallments || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.paidInstallments || 0} pagas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtro de Data */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por vencimento:</span>
            </div>
            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione um filtro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="this-week">Esta semana</SelectItem>
                <SelectItem value="last-week">Semana passada</SelectItem>
                <SelectItem value="this-month">Este mês</SelectItem>
                <SelectItem value="last-month">Mês passado</SelectItem>
                <SelectItem value="this-year">Este ano</SelectItem>
              </SelectContent>
            </Select>
            {dateFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateFilter('all')}
                className="h-8"
              >
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>
        </Card>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              Todas ({allInstallments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pendentes ({pendingInstallments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Vencidas ({overdueInstallments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="paid">
              Pagas ({paidInstallments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <InstallmentsTable
              installments={filterInstallments(allInstallments || [])}
              isLoading={allLoading}
              onPayment={handlePayment}
              onRefetch={refetchAll}
              onManageCustomerDebt={handleManageCustomerDebtFromTable}
            />
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <InstallmentsTable
              installments={filterInstallments(pendingInstallments || [])}
              isLoading={pendingLoading}
              onPayment={handlePayment}
              onRefetch={refetchPending}
              onManageCustomerDebt={handleManageCustomerDebtFromTable}
            />
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4">
            <InstallmentsTable
              installments={filterInstallments(overdueInstallments || [])}
              isLoading={overdueLoading}
              onPayment={handlePayment}
              onRefetch={refetchOverdue}
              onManageCustomerDebt={handleManageCustomerDebtFromTable}
            />
          </TabsContent>

          <TabsContent value="paid" className="space-y-4">
            <InstallmentsTable
              installments={filterInstallments(paidInstallments || [])}
              isLoading={paidLoading}
              onPayment={handlePayment}
              onRefetch={refetchPaid}
              showPayButton={false}
              onManageCustomerDebt={handleManageCustomerDebtFromTable}
            />
          </TabsContent>
        </Tabs>

        <CustomerDebtPaymentDialog
          open={customerDebtDialogOpen}
          onClose={handleCustomerDebtDialogClose}
          customer={selectedCustomerDebt?.customer}
          onPaid={handleCustomerDebtPaid}
        />

        <PaymentDialog
          open={paymentDialogOpen}
          onClose={handlePaymentClose}
          installment={selectedInstallment}
        />
      </div>
    );
  }

  return null;
}
