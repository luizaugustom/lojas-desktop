import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Download, FileText, Package, ShoppingCart, FileBarChart, Users, DollarSign, Info, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { DatePicker } from '../ui/date-picker';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../hooks/useAuth';
import { useDateRange } from '../../hooks/useDateRange';
import { handleApiError } from '../../lib/handleApiError';
import { reportSchema } from '../../lib/validations';
import { downloadFile, getFileExtension } from '../../lib/utils';
import type { GenerateReportDto, Seller } from '../../types';

const reportTypes = [
  { value: 'sales', label: 'Relatório de Vendas', icon: ShoppingCart },
  { value: 'cancelled_sales', label: 'Relatório de Vendas Canceladas', icon: XCircle },
  { value: 'products', label: 'Relatório de Produtos', icon: Package },
  { value: 'invoices', label: 'Relatório de Notas Fiscais', icon: FileText },
  { value: 'complete', label: 'Relatório Completo', icon: FileBarChart },
];

const formats = [
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'xml', label: 'XML' },
  { value: 'json', label: 'JSON' },
];

export default function ReportsPage() {
  const { api, user } = useAuth();
  const { queryKeyPart } = useDateRange();
  const [loading, setLoading] = useState(false);

  const { data: sellersData } = useQuery({
    queryKey: ['sellers', queryKeyPart],
    queryFn: async () => (await api.get('/seller')).data,
    enabled: user?.role === 'empresa',
  });

  const sellers: Seller[] = sellersData || [];

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    control,
    watch,
  } = useForm<GenerateReportDto>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportType: 'complete',
      format: 'excel',
      includeDocuments: false,
      sellerId: 'all',
    },
  });

  const reportTypeValue = watch('reportType', 'complete') || 'complete';

  const onSubmit = async (data: GenerateReportDto) => {
    setLoading(true);
    try {
      const includeDocuments = data.includeDocuments === true;
      const payload = {
        ...data,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        sellerId: data.sellerId === 'all' ? undefined : data.sellerId || undefined,
        includeDocuments,
      };

      const response = await api.post('/reports/generate', payload, {
        responseType: 'blob',
      });

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: response.headers['content-type'] || 'application/octet-stream',
            });

      const extractFilename = (contentDisposition?: string): string | null => {
        if (!contentDisposition) return null;
        const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (encodedMatch?.[1]) {
          try {
            return decodeURIComponent(encodedMatch[1]);
          } catch {
            return encodedMatch[1];
          }
        }
        const regularMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
        return regularMatch?.[1]?.trim() ?? null;
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fallbackExtension = includeDocuments ? 'zip' : getFileExtension(data.format);
      const fallbackFilename = `relatorio-${data.reportType}-${timestamp}.${fallbackExtension}`;
      const contentDisposition = response.headers['content-disposition'] as string | undefined;
      const filename = extractFilename(contentDisposition) || fallbackFilename;

      downloadFile(blob, filename);

      toast.success('Relatório gerado e baixado com sucesso!');

    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);

      // Tratamento especial para erros de blob
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          toast.error(errorData.message || 'Erro ao gerar relatório');
        } catch {
          toast.error('Erro ao gerar relatório');
        }
      } else {
        handleApiError(error);
      }
    } finally {
      setLoading(false);
    }
  };


  if (!user) {
    return null;
  }

  if (user.role !== 'empresa') {
    return (
      <Card className="p-6 text-center">
        <CardTitle className="text-xl font-semibold text-destructive">Acesso não permitido</CardTitle>
        <CardDescription className="mt-2">
          Apenas contas do tipo <strong>empresa</strong> podem gerar relatórios contábeis.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="min-h-0">
      <div className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios Contábeis</h1>
        <p className="text-muted-foreground">
          Gere relatórios completos para envio à contabilidade
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full mb-2 items-start">
        {/* Form Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Gerar Novo Relatório
            </CardTitle>
            <CardDescription>
              Selecione o tipo de relatório e o formato desejado
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
              <div className="space-y-2">
                <Label>Tipo de Relatório</Label>
                <Controller
                  name="reportType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'complete'}
                      onValueChange={(value) => field.onChange(value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de relatório" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.reportType && (
                  <p className="text-sm text-destructive">{errors.reportType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Controller
                  name="format"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'excel'}
                      onValueChange={(value) => field.onChange(value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o formato" />
                      </SelectTrigger>
                      <SelectContent>
                        {formats.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.format && (
                  <p className="text-sm text-destructive">{errors.format.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Inicial</Label>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date?.toISOString().split('T')[0] || '')}
                        placeholder="Selecione a data inicial"
                        disabled={loading}
                      />
                    )}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-destructive">{errors.startDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Final</Label>
                  <Controller
                    name="endDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date?.toISOString().split('T')[0] || '')}
                        placeholder="Selecione a data final"
                        disabled={loading}
                      />
                    )}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-destructive">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Filtrar por Vendedor (Opcional)
                </Label>
                <Controller
                  name="sellerId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'all'}
                      onValueChange={(value) => field.onChange(value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os vendedores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os vendedores</SelectItem>
                        {sellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.name} {seller.commissionRate && seller.commissionRate > 0 ? `(${seller.commissionRate}%)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para incluir todos os vendedores
                </p>
              </div>

              <Controller
                name="includeDocuments"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-3">
                    <div className="space-y-1 pr-4">
                      <Label
                        htmlFor="include-documents"
                        className="text-sm font-medium leading-none"
                      >
                        Incluir arquivos das notas fiscais de entrada
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Gera um arquivo ZIP com o relatório e a pasta contendo os XMLs e PDFs das notas fiscais de entrada.
                      </p>
                    </div>
                    <Switch
                      id="include-documents"
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={loading}
                    />
                  </div>
                )}
              />

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Gerar e Baixar Relatório
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>


      {reportTypeValue === 'complete' && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-2 px-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-0.5 text-sm">
                  O Relatório Completo inclui:
                </h3>
                <ul className="space-y-0 text-xs text-blue-800 dark:text-blue-300 leading-tight">
                  <li>✓ <strong>Vendas:</strong> Todas as vendas do período com detalhes</li>
                  <li>✓ <strong>Produtos:</strong> Estoque, preços e movimentações</li>
                  <li>✓ <strong>Notas Fiscais:</strong> Documentos emitidos</li>
                  <li>✓ <strong>Contas a Pagar:</strong> Obrigações financeiras</li>
                  <li>✓ <strong>Fechamentos de Caixa:</strong> Histórico de fechamentos</li>
                  <li>✓ <strong>💰 Comissões:</strong> Cálculo detalhado por vendedor</li>
                </ul>
                <p className="mt-1 mb-0 text-xs text-blue-700 dark:text-blue-400">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Ideal para envio à contabilidade com todos os dados necessários!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
