import { useEffect, useState } from 'react';
import { Save, Trash2, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ConfirmationModal } from '../ui/confirmation-modal';
import {
  useSellerSchedule,
  useUpsertSellerSchedule,
  useDeleteSellerSchedule,
} from '../../hooks/useSellerSchedule';
import { handleApiError } from '../../lib/handleApiError';
import type { SellerDayConfig, UpdateSellerScheduleDto } from '../../types';

interface SellerScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
}

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

const EMPTY_DAY: SellerDayConfig = {
  entryTime: '',
  lunchOutTime: '',
  lunchInTime: '',
  exitTime: '',
};

function isValidHHMM(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function SellerScheduleDialog({
  open,
  onClose,
  sellerId,
  sellerName,
}: SellerScheduleDialogProps) {
  const { data: scheduleResp, isLoading } = useSellerSchedule(open ? sellerId : null);
  const upsert = useUpsertSellerSchedule(sellerId);
  const remove = useDeleteSellerSchedule(sellerId);

  const currentSchedule = scheduleResp?.schedule ?? null;

  const [workDays, setWorkDays] = useState<number[]>(DEFAULT_WORK_DAYS);
  const [defaultEntryTime, setDefaultEntryTime] = useState('');
  const [defaultLunchOutTime, setDefaultLunchOutTime] = useState('');
  const [defaultLunchInTime, setDefaultLunchInTime] = useState('');
  const [defaultExitTime, setDefaultExitTime] = useState('');
  const [lateToleranceMinutes, setLateToleranceMinutes] = useState('');
  const [entryToleranceMinutes, setEntryToleranceMinutes] = useState('');
  const [overrides, setOverrides] = useState<Record<string, SellerDayConfig>>({});
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  // Hidrata o form quando a jornada carrega
  useEffect(() => {
    if (!open) return;
    if (!currentSchedule) {
      setWorkDays(DEFAULT_WORK_DAYS);
      setDefaultEntryTime('');
      setDefaultLunchOutTime('');
      setDefaultLunchInTime('');
      setDefaultExitTime('');
      setLateToleranceMinutes('');
      setEntryToleranceMinutes('');
      setOverrides({});
      return;
    }
    setWorkDays(currentSchedule.workDays?.length ? currentSchedule.workDays : DEFAULT_WORK_DAYS);
    setDefaultEntryTime(currentSchedule.defaultEntryTime ?? '');
    setDefaultLunchOutTime(currentSchedule.defaultLunchOutTime ?? '');
    setDefaultLunchInTime(currentSchedule.defaultLunchInTime ?? '');
    setDefaultExitTime(currentSchedule.defaultExitTime ?? '');
    setLateToleranceMinutes(
      currentSchedule.lateToleranceMinutes !== null && currentSchedule.lateToleranceMinutes !== undefined
        ? String(currentSchedule.lateToleranceMinutes)
        : '',
    );
    setEntryToleranceMinutes(
      currentSchedule.entryToleranceMinutes !== null && currentSchedule.entryToleranceMinutes !== undefined
        ? String(currentSchedule.entryToleranceMinutes)
        : '',
    );
    setOverrides(currentSchedule.overrides ?? {});
  }, [currentSchedule, open]);

  const toggleWorkDay = (d: number) => {
    setWorkDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  };

  const updateOverride = (day: number, key: keyof SellerDayConfig, value: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      const current: SellerDayConfig = next[String(day)] ?? { ...EMPTY_DAY };
      const updated: SellerDayConfig = { ...current, [key]: value };
      const allEmpty =
        !updated.entryTime && !updated.lunchOutTime && !updated.lunchInTime && !updated.exitTime;
      if (allEmpty) {
        delete next[String(day)];
      } else {
        next[String(day)] = updated;
      }
      return next;
    });
  };

  const getOverride = (day: number): SellerDayConfig =>
    overrides[String(day)] ?? { ...EMPTY_DAY };

  const handleSave = async () => {
    const dto: UpdateSellerScheduleDto = {
      workDays,
      defaultEntryTime: defaultEntryTime || null,
      defaultLunchOutTime: defaultLunchOutTime || null,
      defaultLunchInTime: defaultLunchInTime || null,
      defaultExitTime: defaultExitTime || null,
      lateToleranceMinutes: lateToleranceMinutes ? Number(lateToleranceMinutes) : null,
      entryToleranceMinutes: entryToleranceMinutes ? Number(entryToleranceMinutes) : null,
      overrides,
    };

    try {
      await upsert.mutateAsync(dto as any);
      onClose();
    } catch (e) {
      handleApiError(e);
    }
  };

  const handleRemove = async () => {
    setConfirmRemoveOpen(false);
    try {
      await remove.mutateAsync();
      onClose();
    } catch (e) {
      handleApiError(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Jornada de {sellerName}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Configure dias e horários individuais. Sem nada configurado, o vendedor usa a jornada da empresa.
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* Dias da semana */}
              <section className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">Dias de trabalho</Label>
                  <p className="text-xs text-muted-foreground">
                    Marque os dias em que este vendedor trabalha.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((d) => (
                    <label
                      key={d}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                        workDays.includes(d)
                          ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Checkbox
                        checked={workDays.includes(d)}
                        onCheckedChange={() => toggleWorkDay(d)}
                      />
                      <span className="text-sm font-medium">{DAY_LABELS[d]}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Horários padrão */}
              <section className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">Horários padrão</Label>
                  <p className="text-xs text-muted-foreground">
                    Aplicam-se a todos os dias marcados acima, salvo override.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <TimeField label="Entrada" value={defaultEntryTime} onChange={setDefaultEntryTime} />
                  <TimeField label="Saída Almoço" value={defaultLunchOutTime} onChange={setDefaultLunchOutTime} />
                  <TimeField label="Volta Almoço" value={defaultLunchInTime} onChange={setDefaultLunchInTime} />
                  <TimeField label="Saída" value={defaultExitTime} onChange={setDefaultExitTime} />
                </div>
              </section>

              {/* Tolerâncias */}
              <section className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">Tolerâncias (opcional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para usar os valores configurados na empresa.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="entryTol">Tolerância de entrada (min)</Label>
                    <Input
                      id="entryTol"
                      type="number"
                      min={0}
                      max={60}
                      value={entryToleranceMinutes}
                      onChange={(e) => setEntryToleranceMinutes(e.target.value)}
                      placeholder="ex: 5"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lateTol">Tolerância de atraso (min)</Label>
                    <Input
                      id="lateTol"
                      type="number"
                      min={0}
                      max={120}
                      value={lateToleranceMinutes}
                      onChange={(e) => setLateToleranceMinutes(e.target.value)}
                      placeholder="ex: 10"
                    />
                  </div>
                </div>
              </section>

              {/* Overrides por dia */}
              <section className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">Override por dia</Label>
                  <p className="text-xs text-muted-foreground">
                    Personalize horários específicos para determinados dias (opcional).
                  </p>
                </div>
                <div className="space-y-2">
                  {ALL_DAYS.map((d) => {
                    const ov = getOverride(d);
                    const hasOverride = Object.values(ov).some((v) => !!v);
                    const isOpen = openDay === d;
                    return (
                      <div
                        key={d}
                        className="border rounded-md overflow-hidden border-slate-200 dark:border-slate-800"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenDay(isOpen ? null : d)}
                          className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                        >
                          <div className="flex items-center gap-2">
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium text-sm">{DAY_LABELS[d]}</span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              hasOverride
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                            }`}
                          >
                            {hasOverride ? 'Customizado' : 'Padrão'}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <TimeField
                                label="Entrada"
                                value={ov.entryTime ?? ''}
                                onChange={(v) => updateOverride(d, 'entryTime', v)}
                              />
                              <TimeField
                                label="Saída Almoço"
                                value={ov.lunchOutTime ?? ''}
                                onChange={(v) => updateOverride(d, 'lunchOutTime', v)}
                              />
                              <TimeField
                                label="Volta Almoço"
                                value={ov.lunchInTime ?? ''}
                                onChange={(v) => updateOverride(d, 'lunchInTime', v)}
                              />
                              <TimeField
                                label="Saída"
                                value={ov.exitTime ?? ''}
                                onChange={(v) => updateOverride(d, 'exitTime', v)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Deixe em branco para usar o horário padrão deste dia.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setConfirmRemoveOpen(true)}
                  disabled={!currentSchedule || remove.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover jornada do vendedor
                </Button>
                <Button onClick={handleSave} disabled={upsert.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {upsert.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <ConfirmationModal
          open={confirmRemoveOpen}
          onClose={() => setConfirmRemoveOpen(false)}
          onConfirm={handleRemove}
          title="Remover jornada deste vendedor?"
          description="A jornada individual será apagada. O vendedor voltará a usar a jornada configurada para a empresa."
          confirmText="Sim, remover"
          cancelText="Cancelar"
          variant="destructive"
        />
      </DialogContent>
    </Dialog>
  );
}

interface TimeFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function TimeField({ label, value, onChange }: TimeFieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={isValidHHMM(value) || !value ? '' : 'border-red-400'}
      />
    </div>
  );
}
