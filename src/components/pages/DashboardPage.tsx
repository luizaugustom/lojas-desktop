import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Package, Users, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { useDateRange } from '../../hooks/useDateRange';
import { handleApiError } from '../../lib/handleApiError';
import { formatCurrency, formatDate, toLocalISOString } from '../../lib/utils';
import { ProductImage } from '../products/ProductImage';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { companyApi, customerApi } from '../../lib/api-endpoints';
import { useDevices } from '../../contexts/DeviceContext';
// PrinterDriverSetup removido - funcionalidades de impressão removidas
import { PlanWarningBanner } from '../plan-limits/plan-warning-banner';
import { PlanUsageCard } from '../plan-limits/plan-usage-card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, change, icon: Icon, trend = 'neutral' }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
            <span className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : ''}>
              {change > 0 ? '+' : ''}{change}%
            </span>
            <span>vs. mês anterior</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface Sale {
  id: string;
  total: number;
  change: number;
  createdAt: string;
  items?: Array<{
    productId?: string;
    product?: any;
    quantity: number;
    subtotal: number;
    unitPrice: number;
  }>;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stockQuantity?: number;
  lowStockAlertThreshold?: number;
  expirationDate?: string;
  photos?: string[];
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const { api, isAuthenticated, user } = useAuth();
  const { queryParams, queryKeyPart, dateRange } = useDateRange();
  const { printers, scales } = useDevices();
  // Variáveis de impressora removidas - funcionalidades de impressão removidas

  // Sales com filtro global de data
  const { data: salesData, isLoading: isSalesLoading, error: salesError } = useQuery({
    queryKey: ['sales', 'dashboard', queryKeyPart],
    queryFn: async () => {
      const params: any = { limit: 1000 };
      if (queryParams.startDate) params.startDate = queryParams.startDate;
      if (queryParams.endDate) params.endDate = queryParams.endDate;
      return (await api.get('/sale', { params })).data;
    },
    enabled: isAuthenticated,
  });

  const normalizeList = <T,>(raw: any, key?: string): T[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as T[];
    if (key && Array.isArray(raw[key])) return raw[key] as T[];
    if (Array.isArray(raw.data)) return raw.data as T[];
    if (Array.isArray(raw.items)) return raw.items as T[];
    return [];
  };

  // Sales last 7 days (for chart) - usa filtro global se disponível
  const now = new Date();
  const chartStartDate = dateRange.startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
  const chartEndDate = dateRange.endDate || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  // Para o gráfico, sempre mostra os últimos 7 dias dentro do período filtrado ou últimos 7 dias globais
  const start7 = new Date(Math.max(
    chartEndDate.getTime() - 6 * 24 * 60 * 60 * 1000,
    chartStartDate?.getTime() || 0
  ));
  start7.setHours(0, 0, 0, 0);
  const end7 = chartEndDate;
  end7.setHours(23, 59, 59, 999);
  const start7Iso = toLocalISOString(start7);
  const end7Iso = toLocalISOString(end7);
  
  const { data: last7SalesRaw } = useQuery({
    queryKey: ['sales', 'last7', queryKeyPart, start7Iso, end7Iso],
    queryFn: async () => (await api.get('/sale', { params: { startDate: start7Iso, endDate: end7Iso, limit: 1000 } })).data,
    enabled: isAuthenticated,
  });

  const last7Sales: Sale[] = normalizeList<Sale>(last7SalesRaw, 'sales');
  // Aggregate by day
  const salesByDayMap: Record<string, { total: number; count: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(start7.getTime() + i * 24 * 60 * 60 * 1000);
    const key = toLocalISOString(d).slice(0, 10);
    salesByDayMap[key] = { total: 0, count: 0 };
  }
  last7Sales.forEach((s) => {
    const dateKey = (s.createdAt ? toLocalISOString(new Date(s.createdAt)).slice(0, 10) : '').toString();
    if (!dateKey) return;
    if (!salesByDayMap[dateKey]) salesByDayMap[dateKey] = { total: 0, count: 0 };
    const revenue = Number(s.total || 0) - Number(s.change || 0);
    salesByDayMap[dateKey].total += revenue;
    salesByDayMap[dateKey].count += 1;
  });

  const salesByPeriod = Object.keys(salesByDayMap)
    .sort()
    .map((k) => {
      const d = new Date(k + 'T00:00:00');
      return {
        date: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
        total: Number(salesByDayMap[k].total.toFixed(2)),
        count: salesByDayMap[k].count,
      };
    });

  // Products for this company
  const { data: productsData, isLoading: isProductsLoading, error: productsError } = useQuery({
    queryKey: ['products', 'company', queryKeyPart],
    queryFn: async () => {
      const response = (await api.get('/product', { params: { page: 1, limit: 1000 } })).data;
      return response;
    },
    enabled: isAuthenticated,
  });

  // Customers for this company
  const { data: customersData, isLoading: isCustomersLoading, error: customersError } = useQuery({
    queryKey: ['customers', 'company', queryKeyPart, user?.companyId],
    queryFn: async () => {
      const response = await customerApi.list({ 
        page: 1, 
        limit: 1000,
        companyId: user?.companyId || undefined
      });
      return response.data || response;
    },
    enabled: isAuthenticated && !!user?.companyId,
  });

  // Companies data (only for admin)
  const { data: companiesData, isLoading: isCompaniesLoading, error: companiesError } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await companyApi.list();
      return response.data || response || [];
    },
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Clientes com dívidas a prazo em atraso (> 30 dias)
  const { data: overdueCustomers } = useQuery({
    queryKey: ['customers-overdue', customersData],
    enabled: isAuthenticated && !!customersData,
    queryFn: async () => {
      const list = normalizeList<Customer>(customersData, 'customers');
      const results: Array<{ customer: Customer; overdueCount: number; overdueTotal: number; oldestDueDate?: string }> = [];
      const nowTs = Date.now();
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

      const batchSize = 10;
      for (let i = 0; i < list.length; i += batchSize) {
        const batch = list.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (c) => {
            try {
              const resp = await api.get(`/customer/${c.id}/installments`);
              const installments = normalizeList<any>(resp.data, 'installments');
              let overdueCount = 0;
              let overdueTotal = 0;
              let oldest: string | undefined;
              installments.forEach((ins: any) => {
                const due = ins.dueDate ? new Date(ins.dueDate).getTime() : NaN;
                const isPaid = !!ins.isPaid || !!ins.paidAt;
                const amount = Number(ins.amount || ins.value || 0);
                if (!isPaid && !isNaN(due)) {
                  const overdueMs = nowTs - due;
                  if (overdueMs > THIRTY_DAYS) {
                    overdueCount += 1;
                    overdueTotal += amount;
                    if (!oldest || new Date(ins.dueDate) < new Date(oldest)) oldest = ins.dueDate;
                  }
                }
              });
              if (overdueCount > 0) {
                return { customer: c, overdueCount, overdueTotal, oldestDueDate: oldest };
              }
              return null;
            } catch {
              return null;
            }
          })
        );
        batchResults.forEach((r) => r && results.push(r));
      }

      results.sort((a, b) => b.overdueTotal - a.overdueTotal);
      return results;
    },
  });

  useEffect(() => {
    const err = salesError || productsError || customersError || companiesError;
    if (err) handleApiError(err);
  }, [salesError, productsError, customersError, companiesError]);

  // Compute sales metrics for month
  const sales: Sale[] = normalizeList<Sale>(salesData, 'sales');
  const totalSalesCount = sales.length;
  const revenueTotal = sales.reduce((acc, s) => acc + Number(s.total || 0) - Number(s.change || 0), 0);

  const products: Product[] = normalizeList<Product>(productsData, 'products');
  const customers: Customer[] = normalizeList<Customer>(customersData, 'customers');

  // Produtos vencidos ou a vencer em 5 dias
  const nowDate = new Date();
  const fiveDaysFromNow = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 5, 23, 59, 59);
  const expiringProducts: Product[] = (products || [])
    .filter((p) => !!p.expirationDate)
    .filter((p) => {
      const d = new Date(p.expirationDate as string);
      if (isNaN(d.getTime())) return false;
      return d <= fiveDaysFromNow;
    })
    .sort((a, b) => {
      const da = new Date(a.expirationDate as string).getTime();
      const db = new Date(b.expirationDate as string).getTime();
      return da - db;
    });

  // Estoque baixo (stockQuantity <= lowStockAlertThreshold do produto, default 3)
  const lowStockList: Product[] = (products || []).filter((p) => {
    const stock = Number(p.stockQuantity ?? 0);
    if (Number.isNaN(stock)) return false;
    const threshold = p.lowStockAlertThreshold ?? 3;
    return stock <= threshold;
  });
  const lowStockCount = lowStockList.length;
  const lowStockPreview = lowStockList.slice(0, 5);

  // Compute top products from sales (this month)
  const productMap: Record<string, { product?: Product | null; quantity: number; revenue: number }> = {};
  sales.forEach((s) => {
    (s.items || []).forEach((it) => {
      const pid = it.productId || (it.product && it.product.id) || 'unknown';
      if (!productMap[pid]) productMap[pid] = { product: it.product || null, quantity: 0, revenue: 0 };
      productMap[pid].quantity += it.quantity || 0;
      productMap[pid].revenue += Number(it.subtotal != null ? it.subtotal : (Number(it.unitPrice || 0) * (it.quantity || 0)));
    });
  });

  const computedTopProducts = Object.keys(productMap)
    .map((k) => ({ 
      product: productMap[k].product || { 
        id: k, 
        name: 'Produto desconhecido', 
        barcode: '', 
        price: productMap[k].revenue, 
        companyId: '', 
        createdAt: '', 
        updatedAt: '' 
      }, 
      quantity: productMap[k].quantity, 
      revenue: productMap[k].revenue 
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Different loading states for admin vs company
  const isAdmin = user?.role === 'admin';
  const loading = isAdmin 
    ? isCompaniesLoading 
    : isSalesLoading || isProductsLoading || isCustomersLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(isAdmin ? 2 : 4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Admin Dashboard - Simple view with company count
  if (isAdmin) {
    const companies = Array.isArray(companiesData) ? companiesData : [];
    
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas Registradas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companies.length}</div>
              <p className="text-xs text-muted-foreground">
                Total de empresas cadastradas no sistema
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Empresas Ativas</CardTitle>
              <CardDescription>Empresas com status ativo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {companies.filter((c: any) => c.isActive).length}
              </div>
              <p className="text-sm text-muted-foreground">
                de {companies.length} empresas cadastradas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      {/* Plan Warnings */}
      {user?.role === 'empresa' && <PlanWarningBanner />}

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Vendas (mês)"
          value={totalSalesCount}
          icon={ShoppingCart}
        />
        <MetricCard
          title="Receita (mês)"
          value={formatCurrency(revenueTotal || 0)}
          icon={DollarSign}
        />
        <MetricCard
          title="Produtos"
          value={products.length}
          icon={Package}
        />
        <MetricCard
          title="Clientes"
          value={customers.length}
          icon={Users}
        />
      </div>

      {/* Plan Usage Card - apenas para empresas */}
      {user?.role === 'empresa' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PlanUsageCard />
        </div>
      )}

      {/* Alerta local: Estoque Baixo */}
      {lowStockCount > 0 && (
        <div className="grid gap-4 md:grid-cols-1">
          <Card className="border-orange-500">
            <CardHeader className="flex flex-row items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <CardTitle>Estoque Baixo</CardTitle>
                <CardDescription>
                  {lowStockCount} produto(s) com estoque baixo
                </CardDescription>
              </div>
            </CardHeader>
            {lowStockPreview.length > 0 && (
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {lowStockPreview.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b py-2">
                      <div className="flex items-center gap-3">
                        <ProductImage 
                          photos={p.photos} 
                          name={p.name} 
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.barcode || '-'}</div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">{p.stockQuantity} unidades</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Período</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesByPeriod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Top 5 produtos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={computedTopProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product.name" />
                <YAxis />
                <Tooltip formatter={(value: any) => [value, 'Quantidade']} />
                <Bar dataKey="quantity" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Products & Customers lists */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos com validade</CardTitle>
            <CardDescription>Vencidos ou que vencem nos próximos 5 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {expiringProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum produto vencido ou a vencer</p>
              ) : (
                expiringProducts.map((p) => {
                  const d = p.expirationDate ? new Date(p.expirationDate) : null;
                  const expired = !!d && d.getTime() < nowDate.getTime();
                  const diffDays = d ? Math.ceil((d.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between border-b py-2">
                      <div className="flex items-center gap-3">
                        <ProductImage 
                          photos={p.photos} 
                          name={p.name} 
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">Validade: {p.expirationDate ? formatDate(p.expirationDate) : '-'}</div>
                        </div>
                      </div>
                      <div className={"text-xs font-medium " + (expired ? 'text-red-600' : 'text-orange-600')}>
                        {expired ? 'Vencido' : `Vence em ${diffDays}d`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes em Atraso</CardTitle>
            <CardDescription>Parcelas vencidas há mais de 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {!overdueCustomers || overdueCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum cliente em atraso</p>
              ) : (
                overdueCustomers.map((item) => (
                  <div key={item.customer.id} className="flex items-center justify-between border-b py-2">
                    <div>
                      <div className="font-medium">{item.customer.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.overdueCount} parcela(s) em atraso{item.oldestDueDate ? ` • mais antiga: ${formatDate(item.oldestDueDate)}` : ''}
                      </div>
                    </div>
                    <div className="text-sm font-medium">{formatCurrency(item.overdueTotal)}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dispositivos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Impressoras</CardTitle>
            <CardDescription>{printers.length} impressora(s) detectada(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {printers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma impressora encontrada</p>
              ) : (
                printers.slice(0, 3).map((printer, index) => (
                  <div key={index} className="p-3 bg-muted rounded flex items-center justify-between">
                    <div>
                      <p className="font-medium">{printer.name}</p>
                      <p className="text-sm text-muted-foreground">{printer.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balanças</CardTitle>
            <CardDescription>{scales.length} balança(s) detectada(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scales.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma balança encontrada</p>
              ) : (
                scales.slice(0, 3).map((scale, index) => (
                  <div key={index} className="p-3 bg-muted rounded">
                    <p className="font-medium">{scale.Name}</p>
                    <p className="text-sm text-muted-foreground">{scale.Description}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PrinterDriverSetup removido - funcionalidades de impressão removidas */}
    </div>
  );
}
