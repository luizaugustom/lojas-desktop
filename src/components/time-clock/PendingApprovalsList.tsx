'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, Edit3, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PunchTypeIcon } from './PunchTypeIcon';
import { PunchStatusBadge } from './PunchStatusBadge';
import { formatDistance } from './format';
import {
  useApproveTimeClock,
  usePendingTimeClocks,
  useRejectTimeClock,
} from '@/hooks/useTimeClock';
import type { TimeClock } from '@/types';

export function PendingApprovalsList() {
  const { data, isLoading, refetch } = usePendingTimeClocks();
  const approve = useApproveTimeClock();
  const reject = useRejectTimeClock();
  const [rejectTarget, setRejectTarget] = useState<TimeClock | null>(null);
  const [reason, setReason] = useState('');

  const items: TimeClock[] = Array.isArray(data) ? data : data?.data ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pontos pendentes de aprovação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pontos pendentes de aprovação</span>
            <span className="text-xs text-muted-foreground font-normal">
              {items.length} aguardando
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum ponto aguardando aprovação. 🎉
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <PunchTypeIcon type={item.type} size="sm" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {item.seller?.name ?? 'Funcionário'}
                        </span>
                        <PunchStatusBadge status={item.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {typeof item.distanceMeters === 'number' && (
                        <p className="text-xs text-amber-700 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {formatDistance(item.distanceMeters)} da loja
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => approve.mutate(item.id, { onSuccess: () => refetch() })}
                      disabled={approve.isPending}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectTarget(item);
                        setReason('');
                      }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar marcação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O vendedor será notificado.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: ponto registrado em local incompatível com a jornada."
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={reason.length < 3 || reject.isPending}
              onClick={() => {
                if (!rejectTarget) return;
                reject.mutate(
                  { id: rejectTarget.id, data: { reason } },
                  {
                    onSuccess: () => {
                      setRejectTarget(null);
                      setReason('');
                      refetch();
                    },
                  },
                );
              }}
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
