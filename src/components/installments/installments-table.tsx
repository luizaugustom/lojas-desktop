import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { DollarSign, Calendar, AlertCircle, CheckCircle2, Search, X, ListChecks } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Skeleton } from '../ui/skeleton';
import { PaginationControls } from '../ui/pagination-controls';

interface InstallmentsTableProps {
  installments: any[];
  isLoading: boolean;
  onPayment: (installment: any) => void;
  onRefetch: () => void;
  showPayButton?: boolean;
  onManageCustomerDebt?: (customer: any) => void;
}

export function InstallmentsTable({
  installments,
  isLoading,
  onPayment,
  onRefetch,
  showPayButton = true,
  onManageCustomerDebt,
}: InstallmentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredInstallments = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return installments;
    }

    return installments.filter((installment) => {
      const customerName = installment.customer?.name?.toLowerCase() || '';
      const customerCpfCnpj = installment.customer?.cpfCnpj?.toLowerCase() || '';
      const searchLower = debouncedSearchTerm.toLowerCase();
      
      return (
        customerName.includes(searchLower) ||
        customerCpfCnpj.includes(searchLower)
      );
    });
  }, [installments, debouncedSearchTerm]);

  const totalItems = filteredInstallments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedInstallments = filteredInstallments.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, totalItems]);

  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </Card>
    );
  }

  if (!installments || installments.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-2">
          <DollarSign className="h-12 w-12 text-muted-foreground" />
          <h3 className="font-semibold text-lg">Nenhuma parcela encontrada</h3>
          <p className="text-sm text-muted-foreground">
            Não há parcelas nesta categoria no momento.
          </p>
        </div>
      </Card>
    );
  }

  if (searchTerm && debouncedSearchTerm && filteredInstallments.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-2">
          <Search className="h-12 w-12 text-muted-foreground" />
          <h3 className="font-semibold text-lg">Nenhum cliente encontrado</h3>
          <p className="text-sm text-muted-foreground">
            Não foram encontradas parcelas para o cliente "{debouncedSearchTerm}".
          </p>
          <Button variant="outline" size="sm" onClick={clearSearch} className="mt-2">
            <X className="mr-1 h-4 w-4" />
            Limpar busca
          </Button>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (installment: any) => {
    if (installment.isPaid) {
      return (
        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Pago
        </Badge>
      );
    }

    const dueDate = new Date(installment.dueDate);
    const now = new Date();
    
    if (dueDate < now) {
      return (
        <Badge variant="outline" className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
          <AlertCircle className="mr-1 h-3 w-3" />
          Vencido
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
        <Calendar className="mr-1 h-3 w-3" />
        Pendente
      </Badge>
    );
  };

  const isOverdue = (installment: any) => {
    if (installment.isPaid) return false;
    const dueDate = new Date(installment.dueDate);
    return dueDate < new Date();
  };

  return (
    <Card>
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome do cliente ou CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
            style={{ paddingLeft: '2.5rem' }}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-muted-foreground">
            {searchTerm !== debouncedSearchTerm ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                Buscando por "{searchTerm}"...
              </span>
            ) : debouncedSearchTerm ? (
              `${filteredInstallments.length} parcela(s) encontrada(s) para "${debouncedSearchTerm}"`
            ) : null}
          </div>
        )}
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Parcela</TableHead>
            <TableHead>Valor Original</TableHead>
            <TableHead>Valor Restante</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
            {showPayButton && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedInstallments.map((installment) => (
            <TableRow 
              key={installment.id}
              className={isOverdue(installment) ? 'bg-red-50/50 dark:bg-red-900/20' : ''}
            >
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{installment.customer?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {installment.customer?.cpfCnpj || 'Sem CPF/CNPJ'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {installment.installmentNumber}/{installment.totalInstallments}
                  </span>
                  {installment.description && (
                    <span className="text-xs text-muted-foreground">
                      {installment.description}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-medium">{formatCurrency(installment.amount)}</span>
              </TableCell>
              <TableCell>
                <span 
                  className={`font-medium ${
                    installment.remainingAmount < installment.amount 
                      ? 'text-blue-600' 
                      : ''
                  }`}
                >
                  {formatCurrency(installment.remainingAmount)}
                </span>
                {installment.payments && installment.payments.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {installment.payments.length} pagamento(s)
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{formatDate(installment.dueDate)}</span>
                  {isOverdue(installment) && (
                    <span className="text-xs text-red-600">
                      {Math.floor(
                        (new Date().getTime() - new Date(installment.dueDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{' '}
                      dias de atraso
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(installment)}</TableCell>
              {showPayButton && (
                <TableCell className="space-y-2">
                  {!installment.isPaid && (
                    <Button
                      size="sm"
                      variant={isOverdue(installment) ? 'destructive' : 'default'}
                      onClick={() => onPayment(installment)}
                    >
                      <DollarSign className="mr-1 h-4 w-4" />
                      Pagar
                    </Button>
                  )}
                  {onManageCustomerDebt && installment.customer && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onManageCustomerDebt(installment.customer)}
                      className="w-full"
                    >
                      <ListChecks className="mr-1 h-4 w-4" />
                      Dívidas do cliente
                    </Button>
                  )}
                  {installment.isPaid && installment.paidAt && (
                    <span className="block text-xs text-muted-foreground">
                      Pago em {formatDate(installment.paidAt)}
                    </span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        totalItems={totalItems}
      />
    </Card>
  );
}

