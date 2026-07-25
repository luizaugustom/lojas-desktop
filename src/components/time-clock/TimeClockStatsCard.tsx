'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, TrendingUp, AlertTriangle, CalendarCheck } from 'lucide-react';
import { formatMinutesLong } from './format';
import type { TimeClockStats } from '@/types';

interface Props {
  stats?: TimeClockStats;
  loading?: boolean;
  title?: string;
}

export function TimeClockStatsCard({ stats, loading, title = 'Estatísticas do Mês' }: Props) {
  if (loading || !stats) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatItem
            Icon={Clock}
            label="Horas no mês"
            value={formatMinutesLong(stats.totalWorkedMinutes)}
            tone="text-blue-700"
          />
          <StatItem
            Icon={CalendarCheck}
            label="Dias trabalhados"
            value={`${stats.workedDays}/${stats.totalDays}`}
            tone="text-emerald-700"
          />
          <StatItem
            Icon={TrendingUp}
            label="Horas extras"
            value={formatMinutesLong(stats.totalOvertimeMinutes)}
            tone="text-purple-700"
          />
          <StatItem
            Icon={AlertTriangle}
            label="Atrasos"
            value={formatMinutesLong(stats.totalLateMinutes)}
            tone="text-amber-700"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: typeof Clock;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone}`} />
        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
