import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Filter, X, HelpCircle, Repeat, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
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
import { PageHelpModal } from '../help/page-help-modal';
import { billsHelpTitle, billsHelpDescription, billsHelpIcon, getBillsHelpTabs } from '../help/contents/bills-help';
import { handleApiError } from '../../lib/handleApiError';
import { formatCurrency } from '../../lib/utils-clean';
import { formatDate } from '../../lib/utils';
import { ConfirmationModal } from '../ui/confirmation-modal';
import type { BillRecurrence, BillToPay } from '../../types';

const RECURRENCE_LABELS: Record<string, string> = {
  WEEKLY: '1 vez por semana',
  BIWEEKLY: '1 vez a cada 15 dias',
  MONTHLY: '1 vez por mês',
};

type DateFilter = 'all' | 'this-week' | 'this-month' | 'next-week' | 'next-month' | 'this-year';

export default function BillsPage() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const { queryParams, queryKeyPart } = useDateRange();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [recurrenceToRemove, setRecurrenceToRemove] = useState<BillRecurrence | null>(null);

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
      case 'this-month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // último dia do mês
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

  const { data: recurrences = [], refetch: refetchRecurrences } = useQuery({
    queryKey: ['bills-recurrences'],
    queryFn: async () => {
      const { data } = await api.get<BillRecurrence[]>('/bill-to-pay/recurrences');
      return Array.isArray(data) ? data : [];
    },
  });

  const removeRecurrenceMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bill-to-pay/recurrences/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills-recurrences'] });
      refetchRecurrences();
      refetch();
      setRecurrenceToRemove(null);
      toast.success('Recorrência cancelada.');
    },
    onError: (err) => handleApiError(err),
  });

  const bills = billsResponse?.bills || [];

  const totalAmount = useMemo(
    () => (bills as BillToPay[]).reduce((sum: number, b: BillToPay) => sum + Number(b?.amount ?? 0), 0),
    [bills]
  );

  const handleCreate = () => {
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    refetch();
    refetchRecurrences();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas e Gastos</h1>
          <p className="text-muted-foreground">Gerencie suas contas e despesas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Conta
          </Button>
          <Button variant="outline" size="icon" onClick={() => setHelpOpen(true)} aria-label="Ajuda" className="shrink-0 hover:scale-105 transition-transform">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
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
              <SelectItem value="this-month">Este mês</SelectItem>
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
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Total:</span>
            <span className="text-lg font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </Card>

      {recurrences.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Repeat className="h-4 w-4" />
            Recorrências ativas
          </h2>
          <ul className="space-y-2">
            {recurrences.map((rec) => (
              <li
                key={rec.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0"
              >
                <div>
                  <span className="font-medium">{rec.title}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    {RECURRENCE_LABELS[rec.recurrenceType] ?? rec.recurrenceType} · Próxima: {formatDate(rec.nextDueDate)}
                    {rec.endDate ? ` · Até ${formatDate(rec.endDate)}` : ''}
                  </span>
                  <span className="text-muted-foreground text-sm block">
                    {formatCurrency(Number(rec.amount))}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecurrenceToRemove(rec)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Cancelar recorrência
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <BillsTable bills={bills || []} isLoading={isLoading} onRefetch={refetch} />

      <BillDialog open={dialogOpen} onClose={handleClose} />

      <ConfirmationModal
        open={!!recurrenceToRemove}
        onClose={() => setRecurrenceToRemove(null)}
        onConfirm={() => recurrenceToRemove && removeRecurrenceMutation.mutate(recurrenceToRemove.id)}
        title="Cancelar recorrência"
        description={
          recurrenceToRemove
            ? `Deseja cancelar a recorrência "${recurrenceToRemove.title}"? As contas já geradas permanecem; apenas não serão criadas novas ocorrências.`
            : ''
        }
        confirmText="Cancelar recorrência"
        variant="destructive"
        loading={removeRecurrenceMutation.isPending}
      />

      <PageHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={billsHelpTitle}
        description={billsHelpDescription}
        icon={billsHelpIcon}
        tabs={getBillsHelpTabs()}
      />
    </div>
  );
}
