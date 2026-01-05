import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { useDateRangeStore } from '@/store/date-range-store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DateRangeModal({ open, onOpenChange }: DateRangeModalProps) {
  const { startDate, endDate, setDateRange, resetToDefault, clearDateRange, isActive } = useDateRangeStore();
  
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(startDate ?? undefined);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate ?? undefined);
  const [error, setError] = useState<string | null>(null);

  // Atualiza os valores locais quando o modal abre
  useEffect(() => {
    if (open) {
      setLocalStartDate(startDate ?? undefined);
      setLocalEndDate(endDate ?? undefined);
      setError(null);
    }
  }, [open, startDate, endDate]);

  const handleApply = () => {
    // Validação
    if (localStartDate && localEndDate && localStartDate > localEndDate) {
      setError('A data inicial deve ser anterior ou igual à data final');
      return;
    }

    setError(null);
    setDateRange(localStartDate ?? null, localEndDate ?? null);
    onOpenChange(false);
  };

  const handleReset = () => {
    resetToDefault();
    const defaultRange = useDateRangeStore.getState();
    setLocalStartDate(defaultRange.startDate ?? undefined);
    setLocalEndDate(defaultRange.endDate ?? undefined);
    setError(null);
  };

  const handleClear = () => {
    clearDateRange();
    setLocalStartDate(undefined);
    setLocalEndDate(undefined);
    setError(null);
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return null;
    return `${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtro de Período
          </DialogTitle>
          <DialogDescription>
            Defina o período de datas para filtrar os dados em todas as páginas da aplicação.
            {isActive && startDate && endDate && (
              <span className="block mt-2 text-primary font-medium">
                Atual: {formatDateRange()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Data Inicial</Label>
            <DatePicker
              date={localStartDate}
              onSelect={(date) => {
                setLocalStartDate(date);
                if (error) setError(null);
              }}
              placeholder="Selecione a data inicial"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">Data Final</Label>
            <DatePicker
              date={localEndDate}
              onSelect={(date) => {
                setLocalEndDate(date);
                if (error) setError(null);
              }}
              placeholder="Selecione a data final"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            className="w-full sm:w-auto"
          >
            Limpar
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            Padrão (3 meses)
          </Button>
          <Button
            onClick={handleApply}
            className="w-full sm:w-auto"
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

