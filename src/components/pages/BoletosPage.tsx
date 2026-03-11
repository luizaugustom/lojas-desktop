'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  Download,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageCircle,
  Upload,
  FileText,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { billetApi, companyApi, customerApi } from '@/lib/api-endpoints';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { formatCurrency, formatDate } from '@/lib/utils';
import { handleApiError } from '@/lib/handleApiError';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
  OVERDUE: 'Vencido',
};

export default function BoletosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [customerIdFilter, setCustomerIdFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cnabFile, setCnabFile] = useState<File | null>(null);
  const [cnabUploading, setCnabUploading] = useState(false);
  const [cnabResult, setCnabResult] = useState<{ markedAsPaid: number; message: string } | null>(null);
  const cnabInputRef = useRef<HTMLInputElement>(null);

  const limit = 20;
  const params = {
    page,
    limit,
    ...(statusFilter && { status: statusFilter }),
    ...(customerIdFilter && { customerId: customerIdFilter }),
    ...(startDate && { startDate: startDate + 'T00:00:00.000Z' }),
    ...(endDate && { endDate: endDate + 'T23:59:59.999Z' }),
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['boletos', params],
    queryFn: async () => {
      const res = await billetApi.list(params);
      return res.data as { data: any[]; total: number; page: number; limit: number; totalPages: number };
    },
    enabled: !!user?.companyId,
  });

  const { data: companyData } = useQuery({
    queryKey: ['my-company'],
    queryFn: async () => {
      const res = await companyApi.myCompany();
      return res.data as { boletoEnabled?: boolean };
    },
    enabled: !!user?.companyId && (user?.role === 'empresa' || user?.role === 'vendedor'),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-list-boletos', user?.companyId],
    queryFn: async () => {
      const res = await customerApi.list({ limit: 500, companyId: user?.companyId ?? undefined });
      return res.data as { data?: { id: string; name: string }[] };
    },
    enabled: !!user?.companyId,
  });

  const customers = customersData?.data ?? [];
  const boletos = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const boletoEnabled = companyData?.boletoEnabled === true;

  const handleDownloadPdf = async (id: string) => {
    setDownloadingId(id);
    try {
      const res = await billetApi.getPdf(id);
      const blob = new Blob([res.data as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boleto-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download iniciado');
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    setMarkingPaidId(id);
    try {
      await billetApi.markAsPaid(id);
      toast.success('Boleto marcado como pago');
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleCnabSubmit = async () => {
    if (!cnabFile) {
      toast.error('Selecione o arquivo CNAB de retorno');
      return;
    }
    setCnabUploading(true);
    setCnabResult(null);
    try {
      const res = await billetApi.processCnabReturn(cnabFile);
      const data = res.data as { processed?: boolean; markedAsPaid?: number; titlesInFile?: number; message?: string };
      setCnabResult({
        markedAsPaid: data.markedAsPaid ?? 0,
        message: data.message ?? (data.markedAsPaid ? `${data.markedAsPaid} boleto(s) marcado(s) como pago(s).` : 'Arquivo processado.'),
      });
      toast.success(data.message ?? 'Arquivo processado');
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      setCnabFile(null);
      if (cnabInputRef.current) cnabInputRef.current.value = '';
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setCnabUploading(false);
    }
  };

  const handleCnabFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCnabFile(file ?? null);
    setCnabResult(null);
  };

  const handleSendWhatsApp = async (id: string) => {
    setSendingWhatsAppId(id);
    try {
      const res = await billetApi.sendWhatsApp(id);
      if ((res.data as any)?.sent) toast.success('Mensagem enviada por WhatsApp');
      else toast.error('Falha ao enviar ou WhatsApp não configurado');
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await billetApi.cancel(id);
      toast.success('Boleto cancelado');
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setCancellingId(null);
    }
  };

  const copyDigitableLine = (id: string, line: string | null) => {
    if (!line) return;
    navigator.clipboard.writeText(line);
    setCopiedId(id);
    toast.success('Linha digitável copiada');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!user?.companyId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Você não tem empresa vinculada. Acesso apenas para empresa ou vendedor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-7 w-7" />
            Boletos
          </h1>
          <p className="text-muted-foreground">Gerencie todos os boletos emitidos pela sua empresa.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {user?.role === 'empresa' && !boletoEnabled && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Boletos não ativados</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Para emitir e listar boletos, ative os boletos em Configurações &gt; Boletos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>Filtre por status, cliente e período de vencimento</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={customerIdFilter || 'all'} onValueChange={(v) => setCustomerIdFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || 'Sem nome'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Vencimento de</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-2">
            <Label>até</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </CardContent>
      </Card>

      {boletoEnabled && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Conciliação CNAB (Boleto Cloud)
            </CardTitle>
            <CardDescription>
              Envie o arquivo de retorno CNAB (.ret ou .txt) baixado do Internet Banking. Os boletos com ocorrência de pagamento serão marcados como pagos automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={cnabInputRef}
              type="file"
              accept=".ret,.txt,application/octet-stream,text/plain"
              onChange={handleCnabFileChange}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cnabInputRef.current?.click()}
                disabled={cnabUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {cnabFile ? cnabFile.name : 'Selecionar arquivo'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCnabSubmit}
                disabled={!cnabFile || cnabUploading}
              >
                {cnabUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Enviar e processar'
                )}
              </Button>
            </div>
            {cnabResult && (
              <p className="text-sm text-muted-foreground">
                {cnabResult.message}
                {cnabResult.markedAsPaid > 0 && (
                  <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
                    ({cnabResult.markedAsPaid} marcado(s) como pago(s))
                  </span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Lista de boletos</CardTitle>
          <CardDescription>
            {total} boleto(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : 'Erro ao carregar boletos.'}
            </div>
          ) : !boletos.length ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum boleto encontrado com os filtros informados.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th className="text-right p-3 font-medium">Valor</th>
                      <th className="text-left p-3 font-medium">Vencimento</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Linha digitável</th>
                      <th className="text-right p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boletos.map((b: any) => (
                      <tr key={b.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <span className="font-medium">{b.customer?.name ?? '—'}</span>
                          {b.customer?.cpfCnpj && (
                            <span className="block text-xs text-muted-foreground">{b.customer.cpfCnpj}</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium">{formatCurrency(Number(b.amount ?? 0))}</td>
                        <td className="p-3">{formatDate(b.dueDate)}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              b.status === 'PAID'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : b.status === 'CANCELLED'
                                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                  : b.status === 'OVERDUE'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}
                          >
                            {b.status === 'PAID' && <CheckCircle2 className="h-3 w-3" />}
                            {b.status === 'PENDING' && <Clock className="h-3 w-3" />}
                            {b.status === 'OVERDUE' && <AlertCircle className="h-3 w-3" />}
                            {b.status === 'CANCELLED' && <XCircle className="h-3 w-3" />}
                            {STATUS_LABELS[b.status] ?? b.status}
                          </span>
                        </td>
                        <td className="p-3 max-w-[220px]">
                          {b.digitableLine ? (
                            <button
                              type="button"
                              onClick={() => copyDigitableLine(b.id, b.digitableLine)}
                              className="text-left text-xs font-mono truncate block w-full hover:text-primary hover:underline"
                              title="Copiar linha digitável"
                            >
                              {b.digitableLine}
                            </button>
                          ) : (
                            '—'
                          )}
                          {copiedId === b.id && (
                            <span className="text-xs text-green-600 dark:text-green-400 ml-1">Copiado!</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(b.status === 'PENDING' || b.status === 'OVERDUE') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsPaid(b.id)}
                                disabled={markingPaidId === b.id}
                                title="Marcar como pago (conferiu no banco)"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30"
                              >
                                {markingPaidId === b.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendWhatsApp(b.id)}
                              disabled={sendingWhatsAppId === b.id}
                              title="Enviar cobrança por WhatsApp"
                            >
                              {sendingWhatsAppId === b.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <MessageCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPdf(b.id)}
                              disabled={downloadingId === b.id}
                              title="Baixar PDF"
                            >
                              {downloadingId === b.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            {b.status === 'PENDING' && user?.role === 'empresa' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(b.id)}
                                disabled={cancellingId === b.id}
                                title="Cancelar boleto"
                                className="text-destructive hover:text-destructive"
                              >
                                {cancellingId === b.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={limit}
                totalItems={total}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
