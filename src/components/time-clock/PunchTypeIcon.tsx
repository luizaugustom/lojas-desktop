'use client';

import { LogIn, LogOut, Coffee, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeClockType } from '@/types';

const TYPE_MAP: Record<
  TimeClockType,
  { label: string; Icon: typeof LogIn; tone: string }
> = {
  ENTRY: {
    label: 'Entrada',
    Icon: LogIn,
    tone: 'bg-emerald-100 text-emerald-700',
  },
  LUNCH_OUT: {
    label: 'Saída Almoço',
    Icon: Coffee,
    tone: 'bg-amber-100 text-amber-700',
  },
  LUNCH_IN: {
    label: 'Volta Almoço',
    Icon: Coffee,
    tone: 'bg-blue-100 text-blue-700',
  },
  EXIT: {
    label: 'Saída',
    Icon: Home,
    tone: 'bg-slate-100 text-slate-700',
  },
};

interface Props {
  type: TimeClockType;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PunchTypeIcon({ type, className, showLabel, size = 'md' }: Props) {
  const cfg = TYPE_MAP[type];
  const Icon = cfg.Icon;
  const sizeClass = {
    sm: 'h-6 w-6',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  }[size];
  const iconSize = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-6 w-6' }[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center shrink-0',
          sizeClass,
          cfg.tone,
        )}
      >
        <Icon className={iconSize} />
      </div>
      {showLabel && <span className="text-sm font-medium">{cfg.label}</span>}
    </div>
  );
}

export const PUNCH_TYPE_LABELS: Record<TimeClockType, string> = Object.fromEntries(
  Object.entries(TYPE_MAP).map(([k, v]) => [k, v.label]),
) as Record<TimeClockType, string>;
