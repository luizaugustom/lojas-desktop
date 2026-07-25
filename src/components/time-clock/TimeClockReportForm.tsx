'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { timeClockApi, sellerApi } from '@/lib/api-endpoints';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { handleApiError } from '@/lib/handleApiError';
import toast from 'react-hot-toast';

interface Props {
  defaultStartDate?: Date;
  defaultEndDate?: Date;
  className?: string;
}

export function TimeClockReportForm({
  defaultStartDate,
  defaultEndDate,
  className,
}: Props) {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(
    format(defaultStartDate ?? firstDayOfMonth(), 'yyyy-MM-dd'),
  );
  const [endDate, setEndDate] = useState(
    format(defaultEndDate ?? new Date(), 'yyyy-MM-dd'),
  );
  const [sellerId, setSellerId] = useState<string>('');
  const [loading, setLoading] = useState<'pdf' | 'csv' | null>(null);

  const { data: sellersResp } = useQuery({
    queryKey: ['sellers', 'for-time-clock'],
    queryFn: async () =>
      (await sellerApi.list({ companyId: user?.companyId || undefined })).data,
    enabled: !!user?.companyId,
    staleTime: 60_000,
  });
  const sellers: Array<{ id: string; name: string }> = Array.isArray(sellersResp)
    ? sellersResp
    : sellersResp?.data ?? [];

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const generate = async (format: 'pdf' | 'csv') => {
    setLoading(format);
    try {
      const params = {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(`${endDate}T23:59:59`).toISOString(),
        sellerId: sellerId && sellerId !== 'all' ? sellerId : undefined,
      };
      const res =
        format === 'pdf'
          ? await timeClockApi.reportPdf(params)
          : await timeClockApi.reportCsv(params);
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      const filename = `ponto-${startDate}_a_${endDate}${
        sellerId && sellerId !== 'all' ? `_${sellerId}` : ''
      }.${ext}`;
      downloadBlob(res.data as Blob, filename);
      toast.success('Relatório gerado!');
    } catch (e) {
      toast.error(handleApiError(e).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Gerar relatório de ponto</CardTitle>
        <CardDescription>
          Espelho mensal em PDF ou CSV para a folha/contábil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="startDate">Data inicial</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate">Data final</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Funcionário (opcional)</Label>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={() => generate('pdf')}
            disabled={loading !== null}
          >
            {loading === 'pdf' ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-1" />
            )}
            Baixar PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => generate('csv')}
            disabled={loading !== null}
          >
            {loading === 'csv' ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-1" />
            )}
            Baixar CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function firstDayOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
