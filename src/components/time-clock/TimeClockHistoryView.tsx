import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { PaginationControls } from '../ui/pagination-controls';
import { PunchTypeIcon, PUNCH_TYPE_LABELS } from './PunchTypeIcon';
import { PunchStatusBadge } from './PunchStatusBadge';
import { parseTimeClockListResponse } from './parse-time-clock-list';
import { useMyHistory } from '../../hooks/useTimeClock';
import type { TimeClockStatus, TimeClockType } from '../../types';

const STATUS_FILTERS: Array<{ value: TimeClockStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'VALID', label: 'Válidos' },
  { value: 'PENDING_REVIEW', label: 'Pendentes' },
  { value: 'REJECTED', label: 'Rejeitados' },
  { value: 'ADJUSTED', label: 'Ajustados' },
];

export function TimeClockHistoryView() {
  const [startDate, setStartDate] = useState(format(firstDayOfMonth(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<TimeClockType | 'ALL'>('ALL');
  const [status, setStatus] = useState<TimeClockStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useMyHistory({
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(`${endDate}T23:59:59`).toISOString(),
    type: type === 'ALL' ? undefined : type,
    status: status === 'ALL' ? undefined : status,
    page,
    limit,
  });

  const { items, total } = parseTimeClockListResponse(data);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="start" className="text-xs">De</Label>
              <Input id="start" type="date" value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end" className="text-xs">Até</Label>
              <Input id="end" type="date" value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={type} onValueChange={(v) => { setType(v as TimeClockType | 'ALL'); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {(Object.keys(PUNCH_TYPE_LABELS) as TimeClockType[]).map((t) => (
                    <SelectItem key={t} value={t}>{PUNCH_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v as TimeClockStatus | 'ALL'); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isLoading ? 'Carregando...' : `${total} marcações`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma marcação no período.
            </p>
          ) : (
            <>
              <ul className="divide-y">
                {items.map((p) => (
                  <li key={p.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PunchTypeIcon type={p.type} size="sm" />
                      <span className="text-sm">
                        {format(new Date(p.timestamp), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    <PunchStatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="pt-3">
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function firstDayOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
