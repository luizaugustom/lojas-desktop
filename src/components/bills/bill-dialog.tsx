import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
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
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { DatePicker } from '../ui/date-picker';
import { useAuth } from '../../hooks/useAuth';
import { handleApiError } from '../../lib/handleApiError';
import { billSchema } from '../../lib/validations';
import { handleNumberInputChange } from '../../lib/utils-clean';
import type { CreateBillDto, BillRecurrenceType } from '../../types';

const RECURRENCE_OPTIONS: { value: BillRecurrenceType; label: string }[] = [
  { value: 'WEEKLY', label: '1 vez por semana' },
  { value: 'BIWEEKLY', label: '1 vez a cada 15 dias' },
  { value: 'MONTHLY', label: '1 vez por mês' },
];

interface BillDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BillDialog({ open, onClose }: BillDialogProps) {
  const [loading, setLoading] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [enableRecurrence, setEnableRecurrence] = useState(false);
  const { api } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<CreateBillDto>({
    resolver: zodResolver(billSchema),
  });

  // Resetar quando o modal fechar
  useEffect(() => {
    if (!open) {
      setAmountInput('');
      setEnableRecurrence(false);
    }
  }, [open]);

  const onSubmit = async (data: CreateBillDto) => {
    const payload: CreateBillDto = {
      title: data.title,
      amount: data.amount,
      dueDate: data.dueDate,
      barcode: data.barcode,
      paymentInfo: data.paymentInfo,
    };
    if (enableRecurrence) {
      if (!data.recurrenceType) {
        toast.error('Selecione a frequência da recorrência');
        return;
      }
      payload.recurrenceType = data.recurrenceType;
      if (data.recurrenceEndDate) payload.recurrenceEndDate = data.recurrenceEndDate;
    }
    setLoading(true);
    try {
      await api.post('/bill-to-pay', payload);
      toast.success('Conta criada com sucesso!');
      reset();
      setAmountInput('');
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nova Conta a Pagar</DialogTitle>
          <DialogDescription className="text-muted-foreground">Preencha os dados da nova conta</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Título *</Label>
            <Input id="title" {...register('title')} disabled={loading} className="text-foreground" />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">Valor *</Label>
            <Input
              id="amount"
              type="text"
              value={amountInput}
              onChange={(e) => handleNumberInputChange(e, (value) => {
                setAmountInput(value);
                const numericValue = value === '' ? 0 : parseFloat(value) || 0;
                setValue('amount', numericValue, { shouldValidate: false, shouldDirty: true });
              })}
              onBlur={() => {
                const numericValue = amountInput === '' ? 0 : parseFloat(amountInput) || 0;
                setValue('amount', numericValue, { shouldValidate: true });
              }}
              disabled={loading}
              className="no-spinner text-foreground"
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-foreground">Data de Vencimento *</Label>
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  date={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date?.toISOString().split('T')[0] || '')}
                  placeholder="Selecione a data de vencimento"
                  disabled={loading}
                />
              )}
            />
            {errors.dueDate && (
              <p className="text-sm text-destructive">{errors.dueDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode" className="text-foreground">Código de Barras</Label>
            <Input id="barcode" {...register('barcode')} disabled={loading} className="text-foreground" />
            {errors.barcode && (
              <p className="text-sm text-destructive">{errors.barcode.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentInfo" className="text-foreground">Informações de Pagamento</Label>
            <Input
              id="paymentInfo"
              placeholder="Ex: Banco XYZ, Conta 12345"
              {...register('paymentInfo')}
              disabled={loading}
              className="text-foreground"
            />
            {errors.paymentInfo && (
              <p className="text-sm text-destructive">{errors.paymentInfo.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableRecurrence"
              checked={enableRecurrence}
              onCheckedChange={(checked) => setEnableRecurrence(checked === true)}
              disabled={loading}
            />
            <Label htmlFor="enableRecurrence" className="text-foreground cursor-pointer font-normal">
              Repetir esta conta
            </Label>
          </div>

          {enableRecurrence && (
            <>
              <div className="space-y-2">
                <Label className="text-foreground">Frequência</Label>
                <Controller
                  name="recurrenceType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={loading}
                    >
                      <SelectTrigger className="text-foreground">
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Repetir até (opcional)</Label>
                <Controller
                  name="recurrenceEndDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      date={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString().split('T')[0] ?? '')}
                      placeholder="Sem data de fim"
                      disabled={loading}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">Deixe em branco para repetir sem data de fim.</p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="text-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

