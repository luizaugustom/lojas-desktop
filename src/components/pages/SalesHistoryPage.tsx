import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Filter, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { handleApiError } from '../../lib/handleApiError';
import { formatCurrency, formatDateTime, toLocalISOString } from '../../lib/utils';
import { SalesTable } from '../sales-history/sales-table';
import { SaleDetailsDialog } from '../sales-history/sale-details-dialog';
import { CancelSaleDialog } from '../sales/cancel-sale-dialog';
import { saleApi } from '../../lib/api-endpoints';

type PeriodFilter = 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'all';

interface PeriodOption {
  value: PeriodFilter;
  label: string;
  days?: number;
}

const periodOptions: PeriodOption[] = [
  { value: 'today', label: 'Hoje', days: 0 },
  { value: 'week', label: 'Última Semana', days: 7 },
  { value: 'month', label: 'Último Mês', days: 30 },
  { value: '3months', label: 'Últimos 3 Meses', days: 90 },
  { value: '6months', label: 'Últimos 6 Meses', days: 180 },
  { value: 'year', label: 'Último Ano', days: 365 },
  { value: 'all', label: 'Todas', days: undefined },
];

export default function SalesHistoryPage() {
  const { api, user } = useAuth();
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterSeller, setFilterSeller] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Verificar se é vendedor
  const isSeller = user?.role === 'vendedor';

  // Calcular datas com base no período selecionado
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const selectedPeriod = periodOptions.find(p => p.value === period);
    
    if (!selectedPeriod || selectedPeriod.days === undefined) {
      return { startDate: undefined, endDate: undefined };
    }

    const start = new Date();
    if (selectedPeriod.days === 0) {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - selectedPeriod.days);
      start.setHours(0, 0, 0, 0);
    }

    return {
      startDate: toLocalISOString(start),
      endDate: toLocalISOString(end),
    };
  }, [period]);

  // Buscar vendas - usar endpoint correto baseado no role
  const { data: salesData, isLoading, refetch } = useQuery({
    queryKey: ['sales-history', isSeller, period, page, limit, startDate, endDate],
    queryFn: async () => {
      const params: any = { page, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Se for vendedor, usar endpoint my-sales, senão usar endpoint geral
      const endpoint = isSeller ? '/sale/my-sales' : '/sale';
      const response = await api.get(endpoint, { params });
      return response.data;
    },
    enabled: !!user,
  });

  // Buscar estatísticas - usar endpoint correto baseado no role
  const { data: statsData } = useQuery({
    queryKey: ['sales-stats', isSeller, period, startDate, endDate],
    queryFn: async () => {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Se for vendedor, usar endpoint my-stats, senão usar endpoint stats
      const endpoint = isSeller ? '/sale/my-stats' : '/sale/stats';
      const response = await api.get(endpoint, { params });
      return response.data;
    },
    enabled: !!user,
  });

  const sales = salesData?.sales || salesData?.data || [];
  const total = salesData?.total || 0;
  const totalPages = salesData?.totalPages || Math.ceil(total / limit);

  // Backend retorna totalValue, mas o código espera totalRevenue
  // Buscar perdas (totalCost no período)
  const { data: lossesData } = useQuery({
    queryKey: ['losses-summary', startDate, endDate],
    queryFn: async () => {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await api.get('/product-losses/summary', { params });
      return response.data;
    },
    enabled: !!user,
  });

  // Buscar contas pagas no período e somar os valores
  const { data: paidBillsData } = useQuery({
    queryKey: ['paid-bills', startDate, endDate],
    queryFn: async () => {
      const params: any = { isPaid: true };
      if (startDate) params.startDate = startDate;
      
      // Sempre limitar até hoje para não incluir contas futuras
      // Mesmo que o período selecionado inclua datas futuras, só consideramos contas que já venceram
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      params.endDate = today.toISOString();
      
      const response = await api.get('/bill-to-pay', { params });
      return response.data;
    },
    enabled: !!user,
  });

  const totalLosses = lossesData?.totalCost || 0;
  const paidBillsAmount = Array.isArray(paidBillsData?.bills)
    ? paidBillsData.bills.reduce((sum: number, bill: any) => sum + (bill?.amount || 0), 0)
    : 0;

  const stats = {
    totalSales: statsData?.totalSales || 0,
    totalRevenue: statsData?.totalRevenue || statsData?.totalValue || 0,
    averageTicket: statsData?.averageTicket || 0,
    totalCostOfGoods: statsData?.totalCostOfGoods || 0,
  };

  // Debug: log stats data
  if (statsData) {
    console.log('[Sales History] Stats from API:', statsData);
    console.log('[Sales History] Parsed stats:', stats);
    console.log('[Sales History] Bills:', paidBillsAmount, 'Losses:', totalLosses);
    console.log('[Sales History] Net Profit Calculation:', {
      revenue: stats.totalRevenue,
      cogs: stats.totalCostOfGoods,
      bills: paidBillsAmount,
      losses: totalLosses,
      netProfit: (stats.totalRevenue || 0) - (stats.totalCostOfGoods || 0) - paidBillsAmount - totalLosses,
    });
  }

  const netProfit = (stats.totalRevenue || 0) - (stats.totalCostOfGoods || 0) - paidBillsAmount - totalLosses;

  const filteredSales = useMemo(() => {
    let list = sales as any[];

    // Filtro por cliente
    if (filterClient.trim()) {
      const q = filterClient.toLowerCase();
      list = list.filter((s) =>
        (s.clientName || '').toLowerCase().includes(q) || (s.clientCpfCnpj || '').toLowerCase().includes(q),
      );
    }

    // Filtro por vendedor
    if (filterSeller.trim()) {
      const q = filterSeller.toLowerCase();
      list = list.filter((s) => (s.seller?.name || '').toLowerCase().includes(q));
    }

    // Filtro por pagamento (qualquer método que contenha)
    if (filterPayment.trim()) {
      const q = filterPayment.toLowerCase();
      list = list.filter((s) =>
        (s.paymentMethods || []).some((pm: any) => getPaymentMethodLabel(pm.method).toLowerCase().includes(q)),
      );
    }

    // Filtro por data (intervalo específico)
    const parseDate = (d: any) => new Date(d).getTime();
    const startMillis = filterStartDate ? parseDate(filterStartDate) : null;
    const endMillis = filterEndDate ? parseDate(filterEndDate) : null;

    if (startMillis || endMillis) {
      list = list.filter((s) => {
        const saleMillis = parseDate(s.saleDate || s.createdAt);
        if (startMillis && saleMillis < startMillis) return false;
        if (endMillis) {
          // incluir fim do dia
          const endDay = new Date(filterEndDate);
          endDay.setHours(23, 59, 59, 999);
          if (saleMillis > endDay.getTime()) return false;
        }
        return true;
      });
    }

    return list;
  }, [sales, filterClient, filterSeller, filterPayment, filterStartDate, filterEndDate]);

  const handleViewDetails = (saleId: string) => {
    setSelectedSaleId(saleId);
    setDetailsOpen(true);
  };

  const handleCancelSale = (saleId: string) => {
    setCancelSaleId(saleId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelSaleId) return;

    setCancelling(true);
    try {
      await saleApi.cancel(cancelSaleId, { reason });
      toast.success('Venda cancelada com sucesso!');
      setCancelDialogOpen(false);
      setCancelSaleId(null);
      refetch();
    } catch (error) {
      handleApiError(error);
    } finally {
      setCancelling(false);
    }
  };

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

  const handleExportSales = async () => {
    try {
      toast.loading('Gerando arquivo Excel...', { id: 'export' });

      const params: any = { limit: 10000 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Se for vendedor, usar endpoint my-sales, senão usar endpoint geral
      const endpoint = isSeller ? '/sale/my-sales' : '/sale';
      const response = await api.get(endpoint, { params });
      const allSales = response.data.sales || response.data.data || [];

      const workbook = XLSX.utils.book_new();

      const summaryData = [
        ['RELATÓRIO DE VENDAS'],
        [''],
        ['Período:', periodOptions.find(p => p.value === period)?.label || 'Todas'],
        ['Data de Geração:', formatDateTime(toLocalISOString())],
        startDate ? ['Data Início:', formatDateTime(startDate)] : [],
        endDate ? ['Data Fim:', formatDateTime(endDate)] : [],
        [''],
        ['ESTATÍSTICAS'],
        ['Total de Vendas:', stats.totalSales],
        ['Receita Total:', formatCurrency(stats.totalRevenue)],
        ['Ticket Médio:', formatCurrency(stats.averageTicket)],
      ].filter(row => row.length > 0);

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

      const salesData: any[] = [];
      salesData.push([
        'ID da Venda',
        'Data',
        'Cliente',
        'CPF/CNPJ',
        'Vendedor',
        'Qtd. Itens',
        'Total',
        'Troco',
        'Formas de Pagamento',
      ]);

      allSales.forEach((sale: any) => {
        const paymentMethods = sale.paymentMethods
          ?.map((pm: any) => `${getPaymentMethodLabel(pm.method)}: ${formatCurrency(pm.amount)}`)
          .join('; ') || '-';

        salesData.push([
          sale.id,
          formatDateTime(sale.saleDate || sale.createdAt),
          sale.clientName || 'Cliente Anônimo',
          sale.clientCpfCnpj || '-',
          sale.seller?.name || '-',
          sale.items?.length || 0,
          Number(sale.total),
          Number(sale.change || 0),
          paymentMethods,
        ]);
      });

      const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
      salesSheet['!cols'] = [
        { wch: 38 },
        { wch: 18 },
        { wch: 25 },
        { wch: 18 },
        { wch: 20 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
        { wch: 40 },
      ];
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Vendas');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vendas-${period}-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Vendas exportadas com sucesso!', { id: 'export' });
    } catch (error) {
      toast.error('Erro ao exportar vendas', { id: 'export' });
      handleApiError(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize e gerencie todas as vendas realizadas
          </p>
        </div>
        <Button onClick={handleExportSales} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Período:</span>
          </div>
          <Select value={period} onValueChange={(value) => {
            setPeriod(value as PeriodFilter);
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            placeholder="Buscar por cliente (nome ou CPF/CNPJ)"
          />
          <Input
            value={filterSeller}
            onChange={(e) => setFilterSeller(e.target.value)}
            placeholder="Buscar por vendedor"
          />
          <Input
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            placeholder="Buscar por pagamento (ex.: PIX, Crédito)"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              placeholder="Data inicial"
            />
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              placeholder="Data final"
            />
          </div>
        </div>
      </Card>

      {/* Estatísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Vendas</p>
              <p className="text-2xl font-bold mt-2">{stats.totalSales}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(stats.averageTicket)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Lucro Líquido</p>
              <p className={`text-2xl font-bold mt-2 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Receita - COGS - Contas - Perdas</p>
            </div>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${netProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <Wallet className={`h-6 w-6 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabela de Vendas */}
      <Card>
        <SalesTable
          sales={filteredSales}
          isLoading={isLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onViewDetails={handleViewDetails}
          onCancelSale={!isSeller ? handleCancelSale : undefined}
        />
      </Card>

      {/* Dialog de Detalhes */}
      {selectedSaleId && (
        <SaleDetailsDialog
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedSaleId(null);
          }}
          saleId={selectedSaleId}
        />
      )}

      {/* Dialog de Cancelamento */}
      <CancelSaleDialog
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setCancelSaleId(null);
        }}
        onConfirm={handleConfirmCancel}
        loading={cancelling}
      />
    </div>
  );
}
