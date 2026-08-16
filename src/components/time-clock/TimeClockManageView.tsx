import { useState } from 'react';
import { format } from 'date-fns';
import { Edit3, ListChecks } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
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
import { TimeClockStatsCard } from './TimeClockStatsCard';
import { TimeClockReportForm } from './TimeClockReportForm';
import { PendingApprovalsList } from './PendingApprovalsList';
import { AdjustPunchDialog } from './AdjustPunchDialog';
import { formatDistance } from './format';
import { parseTimeClockListResponse } from './parse-time-clock-list';
import { useTimeClockList, useTimeClockStats } from '../../hooks/useTimeClock';
import { sellerApi } from '../../lib/api-endpoints';
import { useAuth } from '../../contexts/AuthContext';
import type { TimeClock, TimeClockStatus, TimeClockType } from '../../types';

const STATUS_FILTERS: Array<{ value: TimeClockStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALID', label: 'Válidos' },
  { value: 'PENDING_REVIEW', label: 'Pendentes' },
  { value: 'REJECTED', label: 'Rejeitados' },
  { value: 'ADJUSTED', label: 'Ajustados' },
];

export function TimeClockManageView() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(format(firstDayOfMonth(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sellerFilter, setSellerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<TimeClockStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<TimeClockType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 25;
  const [adjustTarget, setAdjustTarget] = useState<TimeClock | null>(null);

  const { data: sellersResp } = useQuery({
    queryKey: ['sellers', 'time-clock-manage'],
    queryFn: async () =>
      (await sellerApi.list({ companyId: user?.companyId || undefined })).data,
    enabled: !!user?.companyId,
    staleTime: 60_000,
  });
  const sellers: Array<{ id: string; name: string }> = Array.isArray(sellersResp)
    ? sellersResp
    : sellersResp?.data ?? [];

  const filter = {
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(`${endDate}T23:59:59`).toISOString(),
    sellerId: sellerFilter === 'ALL' ? undefined : sellerFilter,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    page,
    limit,
  };

  const { data, isLoading } = useTimeClockList(filter);
  const { data: stats, isLoading: loadingStats } = useTimeClockStats();

  const parsed = parseTimeClockListResponse(data);
  const items = parsed.items as TimeClock[];
  const total = parsed.total;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <TimeClockStatsCard stats={stats} loading={loadingStats} />
      <PendingApprovalsList />
      <TimeClockReportForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Todas as marcações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
              <Label className="text-xs">Funcionário</Label>
              <Select value={sellerFilter} onValueChange={(v) => { setSellerFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as TimeClockType | 'ALL'); setPage(1); }}>
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
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as TimeClockStatus | 'ALL'); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma marcação com esses filtros.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Data/Hora</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Distância</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(p.timestamp), 'dd/MM HH:mm')}
                      </TableCell>
                      <TableCell>{p.seller?.name ?? '—'}</TableCell>
                      <TableCell>
                        <PunchTypeIcon type={p.type} size="sm" showLabel />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {typeof p.distanceMeters === 'number' ? formatDistance(p.distanceMeters) : '—'}
                      </TableCell>
                      <TableCell>
                        <PunchStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setAdjustTarget(p)} aria-label="Ajustar marcação">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AdjustPunchDialog punch={adjustTarget} onClose={() => setAdjustTarget(null)} />
    </div>
  );
}

function firstDayOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
