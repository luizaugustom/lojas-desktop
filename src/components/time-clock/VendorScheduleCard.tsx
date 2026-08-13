'use client';

import { Clock4, Coffee, LogIn, LogOut, Home } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';
import { PunchTypeIcon, PUNCH_TYPE_LABELS } from './PunchTypeIcon';
import type { TodaySchedule, TimeClockType } from '../../types';

interface Props {
  today?: TodaySchedule | null;
  nextExpected: TimeClockType | null;
  loading?: boolean;
  /** true quando my-today já retornou (evita marcar tudo como feito sem dados) */
  punchesReady?: boolean;
  className?: string;
}

const ROW_META: Record<TimeClockType, { Icon: typeof LogIn; tone: string }> = {
  ENTRY: { Icon: LogIn, tone: 'bg-emerald-100 text-emerald-700' },
  LUNCH_OUT: { Icon: Coffee, tone: 'bg-amber-100 text-amber-700' },
  LUNCH_IN: { Icon: Coffee, tone: 'bg-blue-100 text-blue-700' },
  EXIT: { Icon: Home, tone: 'bg-slate-200 text-slate-700' },
};

const ORDER: TimeClockType[] = ['ENTRY', 'LUNCH_OUT', 'LUNCH_IN', 'EXIT'];

const KEY_BY_TYPE: Record<keyof TodaySchedule, TimeClockType | null> = {
  entry: 'ENTRY',
  lunchOut: 'LUNCH_OUT',
  lunchIn: 'LUNCH_IN',
  exit: 'EXIT',
  isWorkDay: null,
  source: null,
} as unknown as Record<keyof TodaySchedule, TimeClockType | null>;

export function VendorScheduleCard({ today, nextExpected, loading, punchesReady = false, className }: Props) {
  if (loading && !today) {
    return (
      <Card className={className}>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!today) return null;

  // Caso 1: vendedor de folga hoje
  if (!today.isWorkDay) {
    return (
      <Card className={cn('border-emerald-200 bg-emerald-50/50', className)}>
        <CardContent className="p-5 sm:p-6 flex items-center gap-4">
          <div className="rounded-full p-3 bg-emerald-100 text-emerald-700 shrink-0">
            <Clock4 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-emerald-900">Hoje é seu dia de folga</p>
            <p className="text-xs text-emerald-700">
              Nenhuma marcação é esperada para hoje.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 sm:p-6 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-semibold">Sua jornada hoje</h3>
          <span className="text-xs text-muted-foreground">
            {today.source === 'seller' ? 'Jornada individual' : 'Jornada da empresa'}
          </span>
        </div>
        <div className="space-y-2">
          {ORDER.map((type) => {
            const key = Object.entries(KEY_BY_TYPE).find(([, v]) => v === type)?.[0] as
              | keyof TodaySchedule
              | undefined;
            const time = key ? (today[key] as string | null) : null;
            const meta = ROW_META[type];
            const Icon = meta.Icon;
            const isNext = nextExpected === type;
            const journeyComplete = punchesReady && nextExpected === null;
            const isDone =
              journeyComplete ||
              (nextExpected !== null &&
                ORDER.indexOf(type) < ORDER.indexOf(nextExpected));

            return (
              <div
                key={type}
                className={cn(
                  'flex items-center gap-3 rounded-lg p-3 border transition-colors',
                  isNext
                    ? 'border-blue-300 bg-blue-50/60 ring-2 ring-blue-200 dark:bg-blue-950/30 dark:border-blue-800 dark:ring-blue-900'
                    : isDone
                      ? 'border-transparent bg-slate-50/60 opacity-60 dark:bg-slate-900/40'
                      : 'border-slate-200 dark:border-slate-800',
                )}
              >
                <div
                  className={cn(
                    'rounded-full flex items-center justify-center h-10 w-10 shrink-0',
                    meta.tone,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', isDone && 'line-through')}>
                    {PUNCH_TYPE_LABELS[type]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isNext ? 'Próxima marcação' : isDone ? 'Registrada' : ''}
                  </p>
                </div>
                <div
                  className={cn(
                    'font-mono text-base font-semibold tabular-nums',
                    !time && 'text-muted-foreground',
                  )}
                >
                  {time ?? '—'}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
