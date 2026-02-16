import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Filter, TrendingUp, Wallet, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../../hooks/useAuth';
import { useDateRange } from '../../hooks/useDateRange';
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
import { PageHelpModal } from '../help/page-help-modal';
import { salesHistoryHelpTitle, salesHistoryHelpDescription, salesHistoryHelpIcon, getSalesHistoryHelpTabs } from '../help/contents/sales-history-help';

type PeriodFilter = 'today' | 'week' | 'last_15_days' | 'month' | '3months' | '6months' | 'year' | 'all';

interface PeriodOption {
  value: PeriodFilter;
  label: string;
}

const periodOptions: PeriodOption[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'last_15_days', label: 'Últimos 15 dias' },
  { value: 'month', label: 'Último Mês' },
  { value: '3months', label: 'Últimos 3 Meses' },
  { value: '6months', label: 'Últimos 6 Meses' },
  { value: 'year', label: 'Este Ano' },
  { value: 'all', label: 'Todas' },
];

export default function SalesHistoryPage() {
  const { api, user } = useAuth();
  const { queryParams, queryKeyPart, dateRange } = useDateRange();
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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

  // Calcular datas com base no período selecionado da página
  const periodRange = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (period) {
      case 'today':
        return { startDate: start, endDate: end };

      case 'week': {
        // Semana atual: segunda-feira até hoje
        const day = start.getDay();
        const diff = day === 0 ? 6 : day - 1;
        start.setDate(start.getDate() - diff);
        return { startDate: start, endDate: end };
      }

      case 'last_15_days':
        start.setDate(start.getDate() - 14);
        return { startDate: start, endDate: end };

      case 'month':
        start.setMonth(start.getMonth() - 1);
        return { startDate: start, endDate: end };

      case '3months':
        start.setMonth(start.getMonth() - 3);
        return { startDate: start, endDate: end };

      case '6months':
        start.setMonth(start.getMonth() - 6);
        return { startDate: start, endDate: end };

      case 'year':
        // Ano atual: 1º de janeiro até hoje
        start.setMonth(0, 1);
        return { startDate: start, endDate: end };

      case 'all':
        return { startDate: undefined, endDate: undefined };

      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [period]);

  // Combinar filtro global com filtro de período: usar o mais restritivo
  const { startDate, endDate } = useMemo(() => {
    const globalStart = queryParams.startDate ? new Date(queryParams.startDate) : null;
    const globalEnd = queryParams.endDate ? new Date(queryParams.endDate) : null;
    const periodStart = periodRange.startDate ? new Date(periodRange.startDate) : null;
    const periodEnd = periodRange.endDate ? new Date(periodRange.endDate) : null;
    
    // Encontrar a intersecção dos ranges
    let finalStart: Date | null = null;
    let finalEnd: Date | null = null;
    
    if (globalStart && periodStart) {
      finalStart = globalStart > periodStart ? globalStart : periodStart;
    } else {
      finalStart = globalStart || periodStart;
    }
    
    if (globalEnd && periodEnd) {
      finalEnd = globalEnd < periodEnd ? globalEnd : periodEnd;
    } else {
      finalEnd = globalEnd || periodEnd;
    }
    
    return {
      startDate: finalStart ? toLocalISOString(finalStart) : undefined,
      endDate: finalEnd ? toLocalISOString(finalEnd) : undefined,
    };
  }, [periodRange, queryParams]);

  // Buscar vendas - usar endpoint correto baseado no role (com filtros do backend)
  const { data: salesData, isLoading, refetch } = useQuery({
    queryKey: ['sales-history', queryKeyPart, isSeller, period, page, limit, startDate, endDate, filterClient, filterSeller, filterPayment],
    queryFn: async () => {
      const params: any = { page, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Adicionar novos filtros
      if (filterClient.trim()) {
        params.clientName = filterClient.trim();
        params.clientCpfCnpj = filterClient.trim();
      }
      if (filterSeller.trim()) {
        params.sellerId = filterSeller.trim();
      }
      if (filterPayment.trim()) {
        params.paymentMethod = filterPayment.trim();
      }

      // Se for vendedor, usar endpoint my-sales, senão usar endpoint geral
      const endpoint = isSeller ? '/sale/my-sales' : '/sale';
      const response = await api.get(endpoint, { params });
      return response.data;
    },
    enabled: !!user,
  });

  // Buscar estatísticas - usar endpoint correto baseado no role (com TODOS os filtros)
  const { data: statsData } = useQuery({
    queryKey: ['sales-stats', queryKeyPart, isSeller, period, startDate, endDate, filterClient, filterSeller, filterPayment],
    queryFn: async () => {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Adicionar novos filtros
      if (filterClient.trim()) {
        params.clientName = filterClient.trim();
        params.clientCpfCnpj = filterClient.trim();
      }
      if (filterSeller.trim()) {
        params.sellerId = filterSeller.trim();
      }
      if (filterPayment.trim()) {
        params.paymentMethod = filterPayment.trim();
      }

      // Se for vendedor, usar endpoint my-stats, senão usar endpoint stats
      const endpoint = isSeller ? '/sale/my-stats' : '/sale/stats';
      const response = await api.get(endpoint, { params });
      return response.data;
    },
    enabled: !!user,
  });

  // Buscar lucro líquido (SOMENTE com filtros de data)
  const { data: netProfitData } = useQuery({
    queryKey: ['net-profit', queryKeyPart, period, startDate, endDate],
    queryFn: async () => {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get('/sale/net-profit', { params });
      return response.data;
    },
    enabled: !!user && !isSeller, // Apenas para empresas
  });

  const sales = salesData?.sales || salesData?.data || [];
  const total = salesData?.total || 0;
  const totalPages = salesData?.totalPages || Math.ceil(total / limit);

  const stats = {
    totalSales: statsData?.totalSales || 0,
    totalRevenue: statsData?.totalRevenue || statsData?.totalValue || 0,
    averageTicket: statsData?.averageTicket || 0,
    totalCostOfGoods: statsData?.totalCostOfGoods || 0,
  };

  // Lucro líquido vem diretamente do endpoint (apenas para empresas)
  const netProfit = !isSeller ? (netProfitData?.netProfit ?? 0) : null;

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

      // Adicionar filtros aplicados
      if (filterClient.trim()) {
        params.clientName = filterClient.trim();
        params.clientCpfCnpj = filterClient.trim();
      }
      if (filterSeller.trim()) {
        params.sellerId = filterSeller.trim();
      }
      if (filterPayment.trim()) {
        params.paymentMethod = filterPayment.trim();
      }

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
        <div className="flex items-center gap-2">
          <Button onClick={handleExportSales} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" size="icon" onClick={() => setHelpOpen(true)} aria-label="Ajuda" className="shrink-0 hover:scale-105 transition-transform">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
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

      {/* Estatísticas - apenas para empresas */}
      {!isSeller && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          {netProfit !== null && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Lucro Líquido</p>
                  <p className={`text-2xl font-bold mt-2 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Receita - COGS - Contas - Perdas - Juros</p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${netProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <Wallet className={`h-6 w-6 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

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

      <PageHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={salesHistoryHelpTitle}
        description={salesHistoryHelpDescription}
        icon={salesHistoryHelpIcon}
        tabs={getSalesHistoryHelpTabs()}
      />
    </div>
  );
}
