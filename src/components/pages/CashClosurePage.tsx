import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, 
  Lock, 
  Unlock, 
  ShoppingCart, 
  CreditCard, 
  Wallet,
  TrendingUp,
  Calendar,
  Printer,
  History,
  ChevronDown,
  ChevronUp,
  AlertCircle
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
import { useAuth } from '@/contexts/AuthContext';
import { printContent, getDefaultPrinter } from '@/lib/print-service';
import { cashClosureApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';

interface CashClosure {
  id: string;
  openingDate: string;
  closingDate?: string;
  openingAmount: number;
  closingAmount: number;
  totalSales: number;
  totalWithdrawals: number;
  isClosed: boolean;
  sales?: any[];
  _count?: { sales: number };
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
}

export default function CashClosurePage() {
  const { api } = useAuth();
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [closingAmount, setClosingAmount] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
  const { data: stats } = useQuery<CashStats>({
    queryKey: ['cash-stats'],
    queryFn: async () => (await api.get('/cash-closure/stats')).data,
    enabled: !!currentClosure,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Buscar histórico
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['cash-history'],
    queryFn: async () => (await api.get('/cash-closure/history')).data,
    enabled: showHistory,
  });

  const handleOpenCashClosure = async () => {
    if (openingAmount < 0) {
      toast.error('Valor de abertura não pode ser negativo');
      return;
    }

    setLoading(true);
    try {
      await api.post('/cash-closure', { openingAmount });
      toast.success('Caixa aberto com sucesso!');
      refetchCurrent();
      setOpeningAmount(0);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCashClosure = async () => {
    if (!currentClosure) return;

    if (closingAmount < 0) {
      toast.error('Valor de fechamento não pode ser negativo');
      return;
    }

    if (withdrawals < 0) {
      toast.error('Valor de saques não pode ser negativo');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/cash-closure/close', { 
        closingAmount,
        withdrawals 
      });
      toast.success('Caixa fechado com sucesso!');
      refetchCurrent();
      refetchHistory();
      setClosingAmount(0);
      setWithdrawals(0);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReprintReport = async (id: string) => {
    try {
      // Tentar obter conteúdo de impressão do backend
      let printContentData: string | null = null;
      
      try {
        const response = await cashClosureApi.getPrintContent(id);
        const responseData = response.data?.data || response.data;
        printContentData = responseData?.content || responseData?.printContent;
      } catch (printContentError) {
        // Se não houver endpoint de conteúdo, continuar com reprint
        console.log('[CashClosure] Endpoint de conteúdo não disponível, tentando reprint direto');
      }

      // Se conseguiu obter conteúdo, imprimir localmente
      if (printContentData) {
        // Obter impressora padrão configurada no computador do usuário
        let printerName: string | null = null;
        try {
          const printerResult = await getDefaultPrinter();
          if (printerResult.success && printerResult.printerName) {
            printerName = printerResult.printerName;
            console.log('[CashClosure] Impressora padrão encontrada:', printerName);
          } else {
            console.warn('[CashClosure] Nenhuma impressora padrão encontrada, tentando impressão sem especificar impressora');
          }
        } catch (printerError) {
          console.error('[CashClosure] Erro ao obter impressora padrão:', printerError);
        }

        // Imprimir localmente usando a impressora padrão
        const printResult = await printContent(printContentData, printerName);
        
        if (printResult.success) {
          toast.success('Relatório enviado para impressão!');
        } else {
          // Se falhar localmente, tentar no servidor como fallback
          toast.error(`Impressão local falhou: ${printResult.error}. Tentando impressão no servidor...`);
          try {
            await cashClosureApi.reprint(id);
            toast.success('Relatório enviado para impressão no servidor!');
          } catch (serverError) {
            console.error('[CashClosure] Erro ao imprimir no servidor:', serverError);
            handleApiError(serverError);
          }
        }
      } else {
        // Se não conseguiu conteúdo, tentar impressão no servidor diretamente
        await cashClosureApi.reprint(id);
        toast.success('Relatório enviado para impressão!');
      }
    } catch (error) {
      handleApiError(error);
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
    ? Number(currentClosure.openingAmount || 0) + Number(stats?.totalCashSales || 0) - Number(withdrawals)
    : 0;
  
  const difference = Number(closingAmount) - expectedClosing;

  return (
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
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(Number(e.target.value))}
                  onFocus={(e) => {
                    if (Number(e.target.value) === 0) {
                      e.target.value = '';
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '') {
                      setOpeningAmount(0);
                    }
                  }}
                  placeholder="0.00"
                  disabled={loading}
                  className="text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

          {/* Card de Pagamentos Digitais (não entram no caixa físico) */}
          {stats?.salesByPaymentMethod && (
            (() => {
              const digitalPayments = {
                pix: stats.salesByPaymentMethod['pix'] || 0,
                credit_card: stats.salesByPaymentMethod['credit_card'] || 0,
                debit_card: stats.salesByPaymentMethod['debit_card'] || 0,
              };
              const totalDigital = digitalPayments.pix + digitalPayments.credit_card + digitalPayments.debit_card;
              
              if (totalDigital > 0) {
                return (
                  <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        Pagamentos Digitais
                      </CardTitle>
                      <CardDescription>
                        Valores que não entram no caixa físico (direto na conta)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {digitalPayments.pix > 0 && (
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">📱</span>
                              <div>
                                <p className="font-medium">PIX</p>
                                <p className="text-xs text-muted-foreground">Transferência instantânea</p>
                              </div>
                            </div>
                            <div className="text-xl font-bold text-blue-600">
                              {formatCurrency(digitalPayments.pix)}
                            </div>
                          </div>
                        )}
                        {digitalPayments.debit_card > 0 && (
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">💳</span>
                              <div>
                                <p className="font-medium">Cartão de Débito</p>
                                <p className="text-xs text-muted-foreground">Débito em conta</p>
                              </div>
                            </div>
                            <div className="text-xl font-bold text-blue-600">
                              {formatCurrency(digitalPayments.debit_card)}
                            </div>
                          </div>
                        )}
                        {digitalPayments.credit_card > 0 && (
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">💳</span>
                              <div>
                                <p className="font-medium">Cartão de Crédito</p>
                                <p className="text-xs text-muted-foreground">Crédito parcelado ou à vista</p>
                              </div>
                            </div>
                            <div className="text-xl font-bold text-blue-600">
                              {formatCurrency(digitalPayments.credit_card)}
                            </div>
                          </div>
                        )}
                        <div className="border-t pt-3 mt-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-lg">Total Digital:</span>
                            <span className="text-2xl font-bold text-blue-600">
                              {formatCurrency(totalDigital)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })()
          )}

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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="closingAmount" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor Contado no Caixa (R$) *
                  </Label>
                  <Input
                    id="closingAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(Number(e.target.value))}
                    onFocus={(e) => {
                      if (Number(e.target.value) === 0) {
                        e.target.value = '';
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        setClosingAmount(0);
                      }
                    }}
                    placeholder="0.00"
                    disabled={loading}
                    className="text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Conte todo o dinheiro físico no caixa
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="withdrawals" className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Saques Realizados (R$)
                  </Label>
                  <Input
                    id="withdrawals"
                    type="number"
                    step="0.01"
                    min="0"
                    value={withdrawals}
                    onChange={(e) => setWithdrawals(Number(e.target.value))}
                    onFocus={(e) => {
                      if (Number(e.target.value) === 0) {
                        e.target.value = '';
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        setWithdrawals(0);
                      }
                    }}
                    placeholder="0.00"
                    disabled={loading}
                    className="text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total de saques/retiradas durante o dia
                  </p>
                </div>
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
                    <span className="font-medium">{formatCurrency(withdrawals)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Saldo Esperado:</span>
                    <span>{formatCurrency(expectedClosing)}</span>
                  </div>
                  {closingAmount > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>Valor Contado:</span>
                        <span className="font-medium">{formatCurrency(closingAmount)}</span>
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
                disabled={loading || closingAmount === 0} 
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
                    {historyData.closures.map((closure: CashClosure) => {
                      const diff = Number(closure.closingAmount || 0) - 
                                   (Number(closure.openingAmount || 0) + Number(closure.totalSales || 0) - Number(closure.totalWithdrawals || 0));
                      
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
                              className={
                                Math.abs(diff) < 0.01 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                diff > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }
                            >
                              {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {closure._count?.sales || 0} vendas
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReprintReport(closure.id)}
                              title="Reimprimir relatório"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
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
  );
}
