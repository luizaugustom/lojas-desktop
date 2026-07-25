'use client';

import { Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PunchTypeIcon, PUNCH_TYPE_LABELS } from './PunchTypeIcon';
import type { TimeClockType } from '@/types';

interface Props {
  nextType: TimeClockType | null;
  scheduledTime?: string | null;
  /** Todos os 4 tipos do dia, na ordem */
  order?: TimeClockType[];
}

export function NextExpectedPunch({ nextType, scheduledTime, order }: Props) {
  if (!nextType) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-emerald-700" />
          <div>
            <p className="text-sm font-medium text-emerald-900">
              Jornada completa
            </p>
            <p className="text-xs text-emerald-700">
              Todas as 4 marcações do dia foram realizadas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/60">
      <CardContent className="p-4 flex items-center gap-3">
        <PunchTypeIcon type={nextType} size="md" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            Próxima: {PUNCH_TYPE_LABELS[nextType]}
          </p>
          {scheduledTime && (
            <p className="text-xs text-blue-700">Previsto para {scheduledTime}</p>
          )}
        </div>
        {order && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-blue-700">
            {order.map((t, i) => (
              <span
                key={t}
                className={`px-1.5 py-0.5 rounded ${
                  t === nextType
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-blue-100 text-blue-500'
                }`}
              >
                {i + 1}
              </span>
            ))}
          </div>
        )}
        <ArrowRight className="h-4 w-4 text-blue-700" />
      </CardContent>
    </Card>
  );
}

export const TIME_CLOCK_ORDER: TimeClockType[] = ['ENTRY', 'LUNCH_OUT', 'LUNCH_IN', 'EXIT'];
