'use client';

import { Clock, CheckCircle2, AlertTriangle, XCircle, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TimeClockStatus } from '@/types';

const STATUS_MAP: Record<
  TimeClockStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  VALID: {
    label: 'Válido',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Icon: CheckCircle2,
  },
  PENDING_REVIEW: {
    label: 'Fora do raio',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    Icon: AlertTriangle,
  },
  REJECTED: {
    label: 'Rejeitado',
    className: 'bg-red-100 text-red-700 border-red-200',
    Icon: XCircle,
  },
  ADJUSTED: {
    label: 'Ajustado',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    Icon: Edit3,
  },
};

interface Props {
  status: TimeClockStatus;
  className?: string;
}

export function PunchStatusBadge({ status, className }: Props) {
  const cfg = STATUS_MAP[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    Icon: Clock,
  };
  const Icon = cfg.Icon;
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 border font-medium', cfg.className, className)}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}
