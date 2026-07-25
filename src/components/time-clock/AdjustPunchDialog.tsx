'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  adjustTimeClockSchema,
  type AdjustTimeClockFormData,
} from '@/lib/validations';
import { PUNCH_TYPE_LABELS } from './PunchTypeIcon';
import { useAdjustTimeClock } from '@/hooks/useTimeClock';
import type { TimeClock, TimeClockType } from '@/types';

interface Props {
  punch: TimeClock | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdjustPunchDialog({ punch, onClose, onSuccess }: Props) {
  const adjust = useAdjustTimeClock();
  const form = useForm<AdjustTimeClockFormData>({
    resolver: zodResolver(adjustTimeClockSchema),
    defaultValues: {
      type: undefined,
      timestamp: '',
      reason: '',
    },
  });

  useEffect(() => {
    if (punch) {
      form.reset({
        type: punch.type,
        timestamp: format(new Date(punch.timestamp), "yyyy-MM-dd'T'HH:mm"),
        reason: '',
      });
    }
  }, [punch, form]);

  const onSubmit = (data: AdjustTimeClockFormData) => {
    if (!punch) return;
    adjust.mutate(
      {
        id: punch.id,
        data: {
          type: data.type,
          timestamp: data.timestamp
            ? new Date(data.timestamp).toISOString()
            : undefined,
          reason: data.reason,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={!!punch} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Ajustar marcação
          </DialogTitle>
          <DialogDescription>
            Corrija o tipo, horário ou coordenadas. A alteração será registrada
            em log de auditoria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(v) =>
                form.setValue('type', v as TimeClockType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PUNCH_TYPE_LABELS) as TimeClockType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {PUNCH_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="timestamp">Data/hora</Label>
            <Input
              id="timestamp"
              type="datetime-local"
              {...form.register('timestamp')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason">
              Motivo <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Ex: GPS impreciso no momento do registro."
              {...form.register('reason')}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-red-600">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={adjust.isPending}>
              {adjust.isPending ? 'Salvando...' : 'Salvar ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
