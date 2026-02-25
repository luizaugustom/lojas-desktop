import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardApi, managerApi } from '../../lib/api-endpoints';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';

type PeriodKey = '7d' | '30d' | '90d';

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
];

function getPeriodDateRange(period: PeriodKey): { startDate: string; endDate: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, change, icon: Icon, trend = 'neutral' }: MetricCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-xl font-bold mt-1 truncate">{value}</p>
          {change !== undefined && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />}
              <span className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : ''}>
                {change > 0 ? '+' : ''}{change}%
              </span>
              <span>vs. mês anterior</span>
            </p>
          )}
        </div>
        <div className="h-9 w-9 shrink-0 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

export default function MetricsPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('30d');

  const dateRange = useMemo(() => getPeriodDateRange(period), [period]);

  const { data: companiesData } = useQuery({
    queryKey: ['manager', 'my-companies'],
    queryFn: () => managerApi.myCompanies().then((r) => r.data),
    enabled: user?.role === 'gestor',
  });
  const gestorCompanies = Array.isArray(companiesData) ? companiesData : [];

  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['dashboard', 'metrics', 'gestor', companyId],
    queryFn: () => dashboardApi.metrics(companyId || undefined).then((r) => r.data),
    enabled: user?.role === 'gestor',
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard', 'metrics', 'trends', companyId, period],
    queryFn: () =>
      dashboardApi.trends({ companyId: companyId || undefined, period }).then((r) => r.data),
    enabled: user?.role === 'gestor',
  });

  const { data: byStoreData, isLoading: byStoreLoading } = useQuery({
    queryKey: ['dashboard', 'metrics', 'by-store', dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      dashboardApi.metricsByStore({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }).then((r) => r.data),
    enabled: user?.role === 'gestor',
  });

  const handleNavigate = (route: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { route } }));
  };

  if (user?.role !== 'gestor') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Acesso restrito ao perfil Gestor.</p>
        <Button variant="link" className="mt-4 px-0" onClick={() => handleNavigate('dashboard')}>
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  const m = metrics as any;
  const salesTrend = (trendsData as any)?.salesTrend ?? [];
  const byStore = Array.isArray(byStoreData) ? byStoreData : [];

  const chartData = salesTrend.map((d: { date: string; value: number; count: number }) => {
    const dt = new Date(d.date + 'T00:00:00');
    return {
      date: `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`,
      value: d.value,
      count: d.count,
    };
  });

  const showByStoreChart = byStore.length > 0 && (companyId === '' || byStore.length > 1);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas</h1>
          <p className="text-muted-foreground">Análise das lojas que você gerencia</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="metrics-company" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Loja:
            </label>
            <select
              id="metrics-company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[200px]"
            >
              <option value="">Todas as lojas</option>
              {gestorCompanies.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.fantasyName || c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Período:</span>
            <div className="flex rounded-md border border-input bg-background overflow-hidden">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriod(opt.value)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    period === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {metricsError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar métricas. Tente novamente.
        </div>
      )}

      {metricsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : m ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total de vendas (valor)"
              value={formatCurrency(m.financial?.totalSalesValue ?? 0)}
              icon={DollarSign}
            />
            <MetricCard
              title="Quantidade de vendas"
              value={m.counts?.sales ?? 0}
              icon={ShoppingCart}
            />
            <MetricCard
              title="Vendas este mês"
              value={formatCurrency(m.sales?.thisMonth?.value ?? 0)}
              change={m.sales?.growth?.valuePercentage}
              trend={m.sales?.growth?.valuePercentage >= 0 ? 'up' : 'down'}
              icon={TrendingUp}
            />
            <MetricCard
              title="Lucro líquido"
              value={formatCurrency(m.financial?.netProfit ?? 0)}
              icon={BarChart3}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Receita líquida"
              value={formatCurrency(m.financial?.netRevenue ?? 0)}
              icon={DollarSign}
            />
            <MetricCard
              title="Contas a pagar"
              value={formatCurrency(m.financial?.pendingBillsValue ?? 0)}
              icon={DollarSign}
            />
            <MetricCard title="Produtos" value={m.counts?.products ?? 0} icon={Package} />
            <MetricCard title="Clientes" value={m.counts?.customers ?? 0} icon={Users} />
          </div>
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Evolução de vendas</CardTitle>
          <CardDescription>
            Valor das vendas por dia no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <Skeleton className="h-[300px] w-full rounded-lg" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} name="Valor" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">Nenhum dado de vendas no período.</p>
          )}
        </CardContent>
      </Card>

      {showByStoreChart && (
        <Card>
          <CardHeader>
            <CardTitle>Vendas por loja</CardTitle>
            <CardDescription>Comparativo no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {byStoreLoading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : byStore.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={byStore.map((s: any) => ({ name: s.companyName || s.companyId, value: s.totalValue }))}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" name="Valor" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">Nenhum dado por loja no período.</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {m?.rankings?.topProducts?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Produtos mais vendidos</CardTitle>
              <CardDescription>Ranking geral (todas as vendas)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {m.rankings.topProducts.slice(0, 5).map((p: any) => (
                  <li key={p.id} className="flex justify-between text-sm">
                    <span className="truncate mr-2">{p.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {p.salesCount} un. · {formatCurrency(p.totalValue ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {m?.rankings?.topSellers?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top vendedores</CardTitle>
              <CardDescription>Por valor vendido</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {m.rankings.topSellers.slice(0, 5).map((s: any) => (
                  <li key={s.id} className="flex justify-between text-sm">
                    <span className="truncate mr-2">{s.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {s.salesCount} vendas · {formatCurrency(s.totalValue ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {byStore.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo por loja</CardTitle>
            <CardDescription>Período: {PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-right">Vendas (R$)</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byStore.map((s: any) => (
                  <TableRow key={s.companyId}>
                    <TableCell className="font-medium">{s.companyName}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.totalValue ?? 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.totalCount ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
