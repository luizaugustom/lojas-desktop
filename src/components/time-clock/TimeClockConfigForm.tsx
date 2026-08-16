'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, RotateCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  timeClockConfigSchema,
  type TimeClockConfigFormData,
} from '@/lib/validations';
import {
  useRegenerateQr,
  useTimeClockConfig,
  useUpdateTimeClockConfig,
} from '@/hooks/useTimeClock';

interface Props {
  companyId?: string;
  onSaved?: () => void;
}

export function TimeClockConfigForm({ companyId, onSaved }: Props) {
  const { data, isLoading } = useTimeClockConfig(companyId);
  const update = useUpdateTimeClockConfig();
  const regen = useRegenerateQr();

  const form = useForm<TimeClockConfigFormData>({
    resolver: zodResolver(timeClockConfigSchema),
    defaultValues: {
      latitude: undefined,
      longitude: undefined,
      radiusMeters: 100,
      requireQrCode: false,
      requireLocation: true,
      notifyOnEntryTime: '',
      notifyOnLunchOutTime: '',
      notifyOnLunchInTime: '',
      notifyOnExitTime: '',
      notificationsEnabled: true,
      lateToleranceMinutes: 10,
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        radiusMeters: data.radiusMeters,
        requireQrCode: data.requireQrCode,
        requireLocation: data.requireLocation,
        notifyOnEntryTime: data.notifyOnEntryTime ?? '',
        notifyOnLunchOutTime: data.notifyOnLunchOutTime ?? '',
        notifyOnLunchInTime: data.notifyOnLunchInTime ?? '',
        notifyOnExitTime: data.notifyOnExitTime ?? '',
        notificationsEnabled: data.notificationsEnabled,
        lateToleranceMinutes: data.lateToleranceMinutes,
      });
    }
  }, [data, form]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuração de ponto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = (values: TimeClockConfigFormData) => {
    const payload: any = {
      ...values,
      // normaliza strings vazias em null para campos opcionais
      notifyOnEntryTime: values.notifyOnEntryTime || null,
      notifyOnLunchOutTime: values.notifyOnLunchOutTime || null,
      notifyOnLunchInTime: values.notifyOnLunchInTime || null,
      notifyOnExitTime: values.notifyOnExitTime || null,
    };
    update.mutate(payload, { onSuccess: () => onSaved?.() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de ponto</CardTitle>
        <CardDescription>
          Defina o local da loja, raio de tolerância e regras de notificação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.0000001"
                {...form.register('latitude', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.0000001"
                {...form.register('longitude', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="radiusMeters">Raio (metros)</Label>
              <Input
                id="radiusMeters"
                type="number"
                min={10}
                max={5000}
                {...form.register('radiusMeters', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Controller
              control={form.control}
              name="requireLocation"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                  Exigir geolocalização
                </label>
              )}
            />
            <Controller
              control={form.control}
              name="requireQrCode"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Exigir leitura do QR Code</p>
                    <p className="text-xs text-muted-foreground">
                      Se ativo, o vendedor precisa ler o QR da loja para bater o ponto.
                    </p>
                  </div>
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Exigir leitura do QR Code para bater ponto"
                  />
                </div>
              )}
            />
          </div>

          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2">Notificações de ponto</h4>
            <Controller
              control={form.control}
              name="notificationsEnabled"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                  Lembretes automáticos de marcação
                </label>
              )}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <TimeField
                id="notifyOnEntryTime"
                label="Entrada"
                register={form.register}
              />
              <TimeField
                id="notifyOnLunchOutTime"
                label="Saída Almoço"
                register={form.register}
              />
              <TimeField
                id="notifyOnLunchInTime"
                label="Volta Almoço"
                register={form.register}
              />
              <TimeField
                id="notifyOnExitTime"
                label="Saída"
                register={form.register}
              />
            </div>
          </div>

          <div className="space-y-1 max-w-xs">
            <Label htmlFor="lateToleranceMinutes">Tolerância atraso (min)</Label>
            <Input
              id="lateToleranceMinutes"
              type="number"
              min={0}
              max={120}
              {...form.register('lateToleranceMinutes', { valueAsNumber: true })}
            />
            <p className="text-[11px] text-muted-foreground">
              Minutos após o horário de entrada que não contam como atraso.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar configuração
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => regen.mutate()}
              disabled={regen.isPending}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Rotacionar QR Code
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TimeField({
  id,
  label,
  register,
}: {
  id: Extract<keyof TimeClockConfigFormData, string>;
  label: string;
  register: ReturnType<typeof useForm<TimeClockConfigFormData>>['register'];
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} type="time" {...register(id)} />
    </div>
  );
}
