import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Filter, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../hooks/useAuth';
import { useDateRange } from '../../hooks/useDateRange';
import { BillsTable } from '../bills/bills-table';
import { BillDialog } from '../bills/bill-dialog';

type DateFilter = 'all' | 'this-week' | 'next-week' | 'next-month' | 'this-year';

export default function BillsPage() {
  const { api } = useAuth();
  const { queryParams, queryKeyPart, dateRange } = useDateRange();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Calcular datas baseadas no filtro da página
  const pageDateRange = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case 'this-week': {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        };
      }
      case 'next-week': {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        };
      }
      case 'next-month': {
        const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        };
      }
      case 'this-year': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        };
      }
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [dateFilter]);

  // Combinar filtro global com filtro da página
  const { startDate, endDate } = useMemo(() => {
    const globalStart = queryParams.startDate ? new Date(queryParams.startDate) : null;
    const globalEnd = queryParams.endDate ? new Date(queryParams.endDate) : null;
    const pageStart = pageDateRange.startDate ? new Date(pageDateRange.startDate) : null;
    const pageEnd = pageDateRange.endDate ? new Date(pageDateRange.endDate) : null;
    
    // Encontrar a intersecção dos ranges
    let finalStart: Date | null = null;
    let finalEnd: Date | null = null;
    
    if (globalStart && pageStart) {
      finalStart = globalStart > pageStart ? globalStart : pageStart;
    } else {
      finalStart = globalStart || pageStart;
    }
    
    if (globalEnd && pageEnd) {
      finalEnd = globalEnd < pageEnd ? globalEnd : pageEnd;
    } else {
      finalEnd = globalEnd || pageEnd;
    }
    
    return {
      startDate: finalStart?.toISOString().split('T')[0],
      endDate: finalEnd?.toISOString().split('T')[0],
    };
  }, [pageDateRange, queryParams]);

  // Construir query string
  const finalQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return params.toString();
  }, [startDate, endDate]);

  const { data: billsResponse, isLoading, refetch } = useQuery({
    queryKey: ['bills', queryKeyPart, finalQueryParams],
    queryFn: async () => {
      const url = finalQueryParams ? `/bill-to-pay?${finalQueryParams}` : '/bill-to-pay';
      return (await api.get(url)).data;
    },
  });

  const bills = billsResponse?.bills || [];

  const handleCreate = () => {
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">Gerencie suas contas e despesas</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

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
              <SelectItem value="next-week">Próxima semana</SelectItem>
              <SelectItem value="next-month">Próximo mês</SelectItem>
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

      <BillsTable bills={bills || []} isLoading={isLoading} onRefetch={refetch} />

      <BillDialog open={dialogOpen} onClose={handleClose} />
    </div>
  );
}
