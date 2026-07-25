'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PunchTypeIcon } from './PunchTypeIcon';
import { PunchStatusBadge } from './PunchStatusBadge';
import { formatDistance } from './format';
import type { TimeClockType, TimeClockStatus } from '@/types';

export interface PunchItem {
  id?: string;
  type: TimeClockType;
  timestamp: string;
  status?: TimeClockStatus;
  distanceMeters?: number | null;
}

interface Props {
  punches: PunchItem[];
  loading?: boolean;
  emptyMessage?: string;
  title?: string;
}

function formatTime(iso: string) {
  try {
    return format(new Date(iso), "HH:mm 'de' dd/MM", { locale: ptBR });
  } catch {
    return iso;
  }
}

export function PunchHistoryList({
  punches,
  loading,
  emptyMessage = 'Nenhuma marcação registrada ainda.',
  title = 'Marcações do dia',
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : punches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {emptyMessage}
          </p>
        ) : (
          <ul className="divide-y">
            {punches.map((p, i) => (
              <li
                key={p.id ?? `${p.type}-${i}`}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-3">
                  <PunchTypeIcon type={p.type} size="sm" showLabel />
                  <span className="text-xs text-muted-foreground">
                    {formatTime(p.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {typeof p.distanceMeters === 'number' && (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      {formatDistance(p.distanceMeters)}
                    </span>
                  )}
                  {p.status && <PunchStatusBadge status={p.status} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
