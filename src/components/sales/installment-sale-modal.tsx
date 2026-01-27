import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Search, User, Calendar, DollarSign, RefreshCw } from 'lucide-react';
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
import { DatePicker } from '../ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { customerApi } from '../../lib/api-endpoints';
import { formatCurrency, formatDate, formatCPFCNPJ, debounce } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { installmentSaleSchema } from '../../lib/validations';
import type { Customer } from '../../types';

interface InstallmentSaleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (customerId: string, installmentData: InstallmentData, customerInfo: { name: string; cpfCnpj?: string }) => void;
  totalAmount: number;
}

interface InstallmentData {
  installments: number;
  installmentValue: number;
  firstDueDate: Date;
  description?: string;
}

interface CustomerWithDebt extends Customer {
  totalDebt?: number;
  overdueInstallments?: number;
}

export function InstallmentSaleModal({ 
  open, 
  onClose, 
  onConfirm, 
  totalAmount 
}: InstallmentSaleModalProps) {
  const { isAuthenticated, user, api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerWithDebt[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithDebt[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDebt | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [installments, setInstallments] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState<Date | null>(null);
  const [minSearchLength] = useState(3);
  const [lastSearchTerm, setLastSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [companyConfig, setCompanyConfig] = useState<{ installmentInterestRates?: Record<string, number>; maxInstallments?: number }>({
    installmentInterestRates: {},
    maxInstallments: 12,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ description?: string }>({
    resolver: zodResolver(installmentSaleSchema),
  });

  useEffect(() => {
    if (open && isAuthenticated && isInitialLoad) {
      loadCompanyConfig();
      loadCustomers();
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      const utcDate = new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), nextMonth.getDate(), 0, 0, 0, 0));
      setFirstDueDate(utcDate);
    }
  }, [open, isAuthenticated, isInitialLoad]);

  // Carregar configurações da empresa
  const loadCompanyConfig = async () => {
    try {
      const response = await api.get('/company/my-company');
      const rates = response.data?.installmentInterestRates || {};
      setCompanyConfig({
        installmentInterestRates: rates,
        maxInstallments: response.data?.maxInstallments ?? 12,
      });
    } catch (error) {
      console.error('Erro ao carregar configurações da empresa:', error);
      // Usar valores padrão em caso de erro
      setCompanyConfig({
        installmentInterestRates: {},
        maxInstallments: 12,
      });
    }
  };

  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term === lastSearchTerm) {
        return;
      }
      
      if (term.trim().length >= minSearchLength) {
        setLastSearchTerm(term);
        await loadCustomers(term);
      } else if (term.trim().length === 0) {
        if (customers.length === 0) {
          setLastSearchTerm('');
          await loadCustomers();
        }
      }
    }, 500),
    [minSearchLength, lastSearchTerm, customers.length]
  );

  useEffect(() => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.cpfCnpj?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);

    if (searchTerm.length >= minSearchLength && !isInitialLoad && searchTerm !== lastSearchTerm) {
      debouncedSearch(searchTerm);
    }
  }, [searchTerm, customers, debouncedSearch, minSearchLength, isInitialLoad, lastSearchTerm]);

  useEffect(() => {
    if (!open) {
      setSelectedCustomer(null);
      setSearchTerm('');
      setInstallments(1);
      setLastSearchTerm('');
      setIsInitialLoad(true);
      reset();
    }
  }, [open, reset]);

  const loadCustomers = async (searchTerm?: string) => {
    if (!isAuthenticated) {
      toast.error('Você precisa estar logado para acessar os clientes');
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const params: any = searchTerm 
        ? { limit: 1000, search: searchTerm }
        : { limit: 1000 };
      
      if (user?.companyId) {
        params.companyId = user.companyId;
      }
        
      const response = await customerApi.list(params);
      
      let customersList = [];
      if (response.data?.customers) {
        customersList = response.data.customers;
      } else if (response.data?.data) {
        customersList = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        customersList = response.data;
      } else if (Array.isArray(response)) {
        customersList = response;
      }
      
      const customersWithDebt = await Promise.all(
        customersList.map(async (customer: Customer) => {
          try {
            const installmentsResponse = await api.get(`/customer/${customer.id}/installments`);
            const installments = installmentsResponse.data.data || [];
            
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const unpaidInstallments = installments.filter((inst: any) => !inst.isPaid);
            const totalDebt = unpaidInstallments.reduce((sum: number, inst: any) => sum + Number(inst.amount || 0), 0);
            
            const overdueInstallments = unpaidInstallments.filter((inst: any) => {
              if (!inst.dueDate) return false;
              const dueDate = new Date(inst.dueDate);
              const dueDateNormalized = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
              return dueDateNormalized < today;
            });
            
            return {
              ...customer,
              totalDebt,
              overdueInstallments: overdueInstallments.length,
            };
          } catch (error) {
            console.error(`Erro ao carregar parcelas do cliente ${customer.id}:`, error);
            return {
              ...customer,
              totalDebt: 0,
              overdueInstallments: 0,
            };
          }
        })
      );
      
      setCustomers(customersWithDebt);
      setFilteredCustomers(customersWithDebt);
      
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
      
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      
      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
      } else {
        toast.error('Erro ao carregar lista de clientes');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateInstallmentValue = (parcelaNumber: number = 1) => {
    const interestRates = companyConfig?.installmentInterestRates || {};
    const interestRate = interestRates[parcelaNumber.toString()] ?? 0;
    const baseAmount = totalAmount / installments;
    const installmentAmountRaw = baseAmount * (1 + interestRate / 100);
    // Arredondar para 2 casas decimais
    return Math.round(installmentAmountRaw * 100) / 100;
  };

  const calculateTotalWithInterest = () => {
    const interestRates = companyConfig?.installmentInterestRates || {};
    let total = 0;
    for (let i = 1; i <= installments; i++) {
      const interestRate = interestRates[i.toString()] ?? 0;
      const baseAmount = totalAmount / installments;
      const installmentAmountRaw = baseAmount * (1 + interestRate / 100);
      // Arredondar cada parcela para 2 casas decimais
      total += Math.round(installmentAmountRaw * 100) / 100;
    }
    // Arredondar o total final para 2 casas decimais
    return Math.round(total * 100) / 100;
  };

  const calculateTotalInterest = () => {
    return calculateTotalWithInterest() - totalAmount;
  };

  const onSubmit = (data: { description?: string }) => {
    if (!selectedCustomer) {
      toast.error('Selecione um cliente!');
      return;
    }

    // Validar limite de parcelas
    const maxInstallments = companyConfig.maxInstallments ?? 12;
    if (maxInstallments === 0) {
      toast.error('Vendas a prazo estão desabilitadas para esta empresa (limite de parcelas = 0)');
      return;
    }
    if (installments < 1 || installments > maxInstallments) {
      toast.error(`Número de parcelas deve estar entre 1 e ${maxInstallments}`);
      return;
    }

    if (!firstDueDate) {
      toast.error('Selecione a data do primeiro vencimento!');
      return;
    }

    const installmentData: InstallmentData = {
      installments,
      installmentValue: calculateInstallmentValue(1), // Valor da primeira parcela (usado como referência)
      firstDueDate: firstDueDate!,
      description: data.description,
    };

    onConfirm(selectedCustomer.id, installmentData, { name: selectedCustomer.name, cpfCnpj: selectedCustomer.cpfCnpj });
  };

  const getDebtStatus = (customer: CustomerWithDebt) => {
    if (customer.totalDebt === 0) return { label: 'Em dia', variant: 'default' as const };
    if (customer.overdueInstallments && customer.overdueInstallments > 0) {
      return { label: `${customer.overdueInstallments} em atraso`, variant: 'destructive' as const };
    }
    return { label: 'Pendente', variant: 'secondary' as const };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Venda a Prazo
          </DialogTitle>
          <DialogDescription>
            Selecione um cliente e configure as parcelas para a venda de {formatCurrency(totalAmount)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {!isAuthenticated && (
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              <p>Você precisa estar logado para acessar os clientes</p>
              <p className="text-sm text-muted-foreground">Faça login para continuar</p>
            </div>
          )}

          {isAuthenticated && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Buscar cliente por nome, CPF/CNPJ ou email... (mín. ${minSearchLength} caracteres)`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                  {loading && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadCustomers()}
                  disabled={loading}
                  className="px-3"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {searchTerm && searchTerm.length < minSearchLength && (
                <div className="text-sm text-amber-600">
                  Busca local ativa - Digite {minSearchLength} caracteres para busca completa na API
                </div>
              )}

              {searchTerm && searchTerm.length >= minSearchLength && loading && (
                <div className="text-sm text-muted-foreground">
                  Buscando clientes da empresa...
                </div>
              )}

              {filteredCustomers.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} encontrado{filteredCustomers.length !== 1 ? 's' : ''}
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {loading ? (
                      <>
                        <p>Carregando clientes...</p>
                        <p className="text-sm">Buscando na base de dados da empresa</p>
                      </>
                    ) : searchTerm ? (
                      <>
                        <p>Nenhum cliente encontrado</p>
                        <p className="text-sm">
                          {searchTerm.length < minSearchLength 
                            ? `Digite pelo menos ${minSearchLength} caracteres para busca completa`
                            : 'Tente outro termo de busca'
                          }
                        </p>
                      </>
                    ) : (
                      <>
                        <p>Nenhum cliente cadastrado</p>
                        <p className="text-sm">Cadastre clientes na seção de Clientes</p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredCustomers.map((customer) => {
                    const debtStatus = getDebtStatus(customer);
                    return (
                      <Card
                        key={customer.id}
                        className={`cursor-pointer transition-colors ${
                          selectedCustomer?.id === customer.id
                            ? 'ring-2 ring-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{customer.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                {customer.cpfCnpj && (
                                  <span>{formatCPFCNPJ(customer.cpfCnpj)}</span>
                                )}
                                {customer.email && (
                                  <span>{customer.email}</span>
                                )}
                                {customer.phone && (
                                  <span>{customer.phone}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={debtStatus.variant}>
                                {debtStatus.label}
                              </Badge>
                              {customer.totalDebt && customer.totalDebt > 0 && (
                                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                  Dívida: {formatCurrency(customer.totalDebt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {isAuthenticated && selectedCustomer && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Configuração das Parcelas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installments">Número de Parcelas</Label>
                  <Select
                    value={installments.toString()}
                    onValueChange={(value) => setInstallments(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: Math.max(0, companyConfig?.maxInstallments ?? 12) }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="installmentValue">Valor da Parcela</Label>
                  <Input
                    id="installmentValue"
                    value={formatCurrency(calculateInstallmentValue())}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstDueDate">Primeiro Vencimento</Label>
                  <DatePicker
                    date={firstDueDate || undefined}
                    onSelect={(date) => setFirstDueDate(date || null)}
                    placeholder="Selecione a data do primeiro vencimento"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Input
                  id="description"
                  placeholder="Ex: Venda de produtos diversos"
                  {...register('description')}
                />
              </div>

              <div className="p-3 bg-background rounded border">
                <h4 className="font-medium mb-2">Resumo da Venda a Prazo</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <p className="font-medium">{selectedCustomer.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor Original:</span>
                    <p className="font-medium">{formatCurrency(totalAmount)}</p>
                  </div>
                  {(() => {
                    const interestRates = companyConfig?.installmentInterestRates || {};
                    const hasAnyInterest = Object.values(interestRates).some(rate => rate > 0);
                    const totalInterest = calculateTotalInterest();
                    return hasAnyInterest && totalInterest > 0 ? (
                      <>
                        <div>
                          <span className="text-muted-foreground">Total de Juros:</span>
                          <p className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(totalInterest)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total com Juros:</span>
                          <p className="font-medium text-primary">{formatCurrency(calculateTotalWithInterest())}</p>
                        </div>
                      </>
                    ) : null;
                  })()}
                  <div>
                    <span className="text-muted-foreground">Parcelas:</span>
                    <p className="font-medium">{installments}x de {formatCurrency(calculateInstallmentValue())}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Primeiro vencimento:</span>
                    <p className="font-medium">{firstDueDate ? formatDate(firstDueDate.toISOString().split('T')[0]) : 'Não selecionado'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedCustomer || !isAuthenticated}
            >
              {loading ? 'Processando...' : 'Confirmar Venda a Prazo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

