import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Edit,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { sellerApi } from '../../lib/api-endpoints';
import { formatDate, formatCurrency } from '../../lib/utils';
import { SellerCharts } from './seller-charts';
import { SellerScheduleDialog } from './seller-schedule-dialog';
import type { Seller, SellerStats, Sale } from '../../types';

interface SellerDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (seller: Seller) => void;
  seller: Seller | null;
}

export function SellerDetailsDialog({ isOpen, onClose, onEdit, seller }: SellerDetailsDialogProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  useEffect(() => {
    if (seller && isOpen) {
      loadSellerData();
    }
  }, [seller, isOpen]);

  const loadSellerData = async () => {
    if (!seller) return;

    setIsLoadingStats(true);
    try {
      const response = await sellerApi.stats(seller.id);
      setStats(response.data || response);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoadingStats(false);
    }

    setIsLoadingSales(true);
    try {
      const response = await sellerApi.sales(seller.id, { page: 1, limit: 5 });
      const rawSales = response.data;
      const normalizedSales = Array.isArray(rawSales)
        ? rawSales
        : Array.isArray(rawSales?.sales)
        ? rawSales.sales
        : Array.isArray(rawSales?.data)
        ? rawSales.data
        : [];
      setRecentSales(normalizedSales);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setIsLoadingSales(false);
    }
  };

  const handleClose = () => {
    setStats(null);
    setRecentSales([]);
    onClose();
  };

  const handleEdit = () => {
    if (seller) {
      onEdit(seller);
    }
  };

  const handleEditSchedule = () => {
    if (!seller) return;
    setScheduleOpen(true);
  };

  const handleScheduleDialogChange = (open: boolean) => {
    setScheduleOpen(open);
    if (!open) {
      // Mantém o details aberto após fechar o modal de jornada
    }
  };

  if (!seller) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <User className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Detalhes do Vendedor
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Informações completas e estatísticas de vendas
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSellerData}
              disabled={isLoadingStats || isLoadingSales}
            >
              <RefreshCw className={`h-4 w-4 ${(isLoadingStats || isLoadingSales) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <User className="h-5 w-5" />
              Informações Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="text-foreground">{seller.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Login</label>
                <p className="text-foreground">{seller.login}</p>
              </div>
              {seller.cpf && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    CPF
                  </label>
                  <p className="text-foreground">{seller.cpf}</p>
                </div>
              )}
              {seller.birthDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Data de Nascimento
                  </label>
                  <p className="text-foreground">{formatDate(seller.birthDate)}</p>
                </div>
              )}
              {seller.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <p className="text-foreground">{seller.email}</p>
                </div>
              )}
              {seller.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </label>
                  <p className="text-foreground">{seller.phone}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cadastrado em</label>
                <p className="text-foreground">{formatDate(seller.createdAt)}</p>
              </div>
              {seller.commissionRate && seller.commissionRate > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Comissão</label>
                  <p className="text-foreground">{seller.commissionRate}%</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <BarChart3 className="h-5 w-5" />
              Estatísticas de Vendas
            </h3>
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Carregando estatísticas...
                </div>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSales || 0}</p>
                  <p className="text-sm text-muted-foreground">Total de Vendas</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(stats.totalRevenue || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Faturamento Total</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(stats.averageSaleValue || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma estatística disponível</p>
              </div>
            )}
          </Card>

          {/* Gráficos de Estatísticas */}
          <SellerCharts stats={stats} isLoading={isLoadingStats} />

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <ShoppingCart className="h-5 w-5" />
              Vendas Recentes
            </h3>
            {isLoadingSales ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Carregando vendas...
                </div>
              </div>
            ) : recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.map((sale: any, idx: number) => {
                  const paymentMethods = Array.isArray(sale.paymentMethods) ? sale.paymentMethods : [];
                  const createdAt = sale.saleDate || sale.createdAt;
                  return (
                    <div key={sale.id ?? idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Venda #{sale.saleNumber || sale.id?.substring(0, 8) || '---'}</p>
                        <p className="text-sm text-muted-foreground">
                          {createdAt ? formatDate(createdAt) : 'Sem data'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(sale.total ?? 0)}
                        </p>
                        {paymentMethods.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {paymentMethods.map((method: any, methodIdx: number) => {
                              const value = typeof method === 'string' ? method : method?.method;
                              const label = value === 'cash' ? 'Dinheiro'
                                : value === 'credit_card' ? 'Cartão'
                                : value === 'debit_card' ? 'Débito'
                                : value === 'pix' ? 'PIX'
                                : value === 'installment' ? 'Parcelado'
                                : 'Outro';

                              return (
                                <Badge key={`${value ?? 'unknown'}-${methodIdx}`} variant="secondary" className="text-xs">
                                  {label}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma venda encontrada</p>
              </div>
            )}
          </Card>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleEditSchedule}
              className="text-foreground"
            >
              <Clock className="h-4 w-4 mr-2" />
              Editar Jornada
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              className="text-foreground"
            >
              Fechar
            </Button>
            <Button
              onClick={handleEdit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Vendedor
            </Button>
          </div>
        </div>
      </DialogContent>

      <SellerScheduleDialog
        open={scheduleOpen}
        onClose={() => handleScheduleDialogChange(false)}
        sellerId={seller.id}
        sellerName={seller.name}
      />
    </Dialog>
  );
}

