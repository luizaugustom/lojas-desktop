import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, RefreshCw, Search, Download, Upload, PlusCircle, Trash2, Pencil, Loader2, RotateCcw, FileCode2, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useDateRange } from '../../hooks/useDateRange';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input, InputWithIcon } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { formatCurrency, formatDateTime, downloadFile } from '@/lib/utils';
import { fiscalApi, productApi, billApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { PageHelpModal } from '../help/page-help-modal';
import { inboundInvoicesHelpTitle, inboundInvoicesHelpDescription, inboundInvoicesHelpIcon, getInboundInvoicesHelpTabs } from '../help/contents/inbound-invoices-help';

interface InboundDoc {
  id: string;
  supplierName?: string;
  accessKey?: string | null;
  status?: string;
  totalValue?: number | null;
  documentNumber?: string | null;
  documentType?: string | null;
  emissionDate?: string | null;
  createdAt?: string;
  pdfUrl?: string | null;
  hasXml?: boolean;
}

interface DownloadFormatOption {
  format: string;
  available: boolean;
  filename?: string;
  downloadUrl?: string;
  externalUrl?: string;
  mimetype?: string;
  size?: number;
  isExternal?: boolean;
  isGenerated?: boolean;
}

type ParsedForm = { accessKey: string; supplierName: string; totalValue: number; documentNumber?: string };
type ParsedItem = { description: string; quantity: number; unitPrice: number; ncm?: string; cfop: string; unitOfMeasure: string; barcode?: string };
type ParsedDup = { nDup: string; dVenc: string; vDup: number };
type ItemDecision = 'skip' | 'link' | 'create';
type ParsedData = { form: ParsedForm; items: ParsedItem[]; duplicatas: ParsedDup[] };

export default function InboundInvoicesPage() {
  const { api, user } = useAuth();
  const { queryKeyPart } = useDateRange();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<InboundDoc | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [emittingReturnId, setEmittingReturnId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<InboundDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [accessKey, setAccessKey] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [manualAttachment, setManualAttachment] = useState<File | null>(null);

  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [xmlPasted, setXmlPasted] = useState('');
  const [parsingXml, setParsingXml] = useState(false);
  const [xmlStringForSubmit, setXmlStringForSubmit] = useState<string | null>(null);
  const [itemDecisions, setItemDecisions] = useState<ItemDecision[]>([]);
  const [itemLinkedIds, setItemLinkedIds] = useState<string[]>([]);
  const [itemNewProductData, setItemNewProductData] = useState<Record<number, { name: string; barcode: string; costPrice: number; stockQuantity: number; ncm: string; cfop: string; unitOfMeasure: string; price: number }>>({});
  const [registerBillsFromXml, setRegisterBillsFromXml] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'empresa') {
      toast.error('Apenas empresas podem acessar esta página');
    }
  }, [user]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inbound-fiscal', search],
    queryFn: async () =>
      (
        await api.get('/fiscal', {
          params: { page: 1, limit: 100, documentType: 'inbound' },
        })
      ).data,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-link', addOpen, !!parsedData?.items?.length],
    queryFn: async () => (await productApi.list({ limit: 500 })).data,
    enabled: !!addOpen && !!parsedData?.items?.length,
  });
  const productsList: { id: string; name: string; barcode?: string; stockQuantity?: number }[] = useMemo(() => {
    const raw: any = productsData;
    const list = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
    return list.map((p: any) => ({ id: p.id, name: p.name || p.barcode || p.id, barcode: p.barcode, stockQuantity: p.stockQuantity }));
  }, [productsData]);

  const docs: InboundDoc[] = useMemo(() => {
    const raw: any = data;
    const list: any[] = Array.isArray(raw) ? raw : raw?.data || raw?.documents || raw?.items || [];

    return list.map((item) => ({
      id: item.id,
      supplierName: item.supplierName ?? item.company?.name ?? undefined,
      accessKey: item.accessKey ?? null,
      status: item.status ?? undefined,
      totalValue:
        item.totalValue != null
          ? Number(item.totalValue)
          : item.total != null
            ? Number(item.total)
            : null,
      documentNumber: item.documentNumber ?? null,
      documentType: item.documentType ?? null,
      emissionDate: item.emissionDate ?? null,
      createdAt: item.createdAt ?? undefined,
      pdfUrl: item.pdfUrl ?? null,
      hasXml: Boolean(item.xmlContent),
    }));
  }, [data]);

  const getPreferredDownloadOption = (formats: DownloadFormatOption[]) => {
    if (!Array.isArray(formats)) return null;
    const normalized = formats.filter((option) => option.available);
    const preferredOrder = ['pdf', 'xml'];
    for (const desired of preferredOrder) {
      const match = normalized.find((item) => item.format?.toLowerCase() === desired);
      if (match) return match;
    }
    return normalized[0] ?? null;
  };

  const extractFilenameFromHeader = (header?: string | null): string | null => {
    if (!header) return null;
    const encodedMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch?.[1]) {
      try {
        return decodeURIComponent(encodedMatch[1]);
      } catch {
        return encodedMatch[1];
      }
    }
    const match = header.match(/filename="?([^";]+)"?/i);
    return match?.[1]?.trim() ?? null;
  };

  const handleDownload = async (doc: InboundDoc) => {
    setDownloadingId(doc.id);
    try {
      const { data: info } = await fiscalApi.downloadInfo(doc.id);
      const option = getPreferredDownloadOption(info?.availableFormats ?? []);

      if (!option) {
        toast.error('Nenhum arquivo disponível para download desta nota.');
        return;
      }

      if (option.isExternal && option.externalUrl) {
        window.open(option.externalUrl, '_blank', 'noopener,noreferrer');
        toast.success('Arquivo aberto em nova janela.');
        return;
      }

      const format = option.format?.toLowerCase() === 'pdf'
        ? 'pdf'
        : option.format?.toLowerCase() === 'xml'
          ? 'xml'
          : null;

      if (!format) {
        toast.error('Formato de arquivo não suportado para download.');
        return;
      }

      const response = await fiscalApi.download(doc.id, format as 'pdf' | 'xml');

      const filenameFromHeader = extractFilenameFromHeader(
        response.headers?.['content-disposition'] as string | undefined,
      );

      const filename =
        filenameFromHeader ||
        option.filename ||
        `nota-entrada-${doc.documentNumber || doc.id}.${format}`;

      const contentType =
        (response.headers?.['content-type'] as string | undefined) ||
        option.mimetype ||
        (format === 'xml' ? 'application/xml' : 'application/pdf');

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: contentType });

      downloadFile(blob, filename);
      toast.success('Download iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar nota de entrada:', error);
      handleApiError(error, {
        endpoint: `/fiscal/${doc.id}/download`,
        method: 'GET',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleEmitReturn = async (doc: InboundDoc) => {
    if (!doc.hasXml || !doc.accessKey) return;
    setEmittingReturnId(doc.id);
    try {
      await fiscalApi.generateReturnNFe(doc.id);
      toast.success('NFe de devolução emitida com sucesso');
      refetch();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Falha ao emitir NFe de devolução';
      toast.error(msg);
    } finally {
      setEmittingReturnId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais de Entrada</h1>
          <p className="text-muted-foreground">Acompanhe as notas de compra/entrada (XML) recebidas</p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'empresa' && (
            <Button onClick={() => setAddOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="text-foreground">
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
          <Button variant="outline" size="icon" onClick={() => setHelpOpen(true)} aria-label="Ajuda" className="shrink-0 hover:scale-105 transition-transform">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <InputWithIcon
          placeholder="Buscar por fornecedor, chave de acesso, status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="h-4 w-4" />}
          iconPosition="left"
        />
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-foreground">Fornecedor</th>
              <th className="px-4 py-2 text-left text-foreground">Chave de Acesso</th>
              <th className="px-4 py-2 text-left text-foreground">Status</th>
              <th className="px-4 py-2 text-right text-foreground">Total</th>
              <th className="px-4 py-2 text-left text-foreground">Recebida em</th>
              <th className="px-4 py-2 text-right text-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={6}>Carregando...</td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center" colSpan={6}>
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <span>Nenhuma nota de entrada encontrada</span>
                  </div>
                </td>
              </tr>
            ) : (
              docs.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="px-4 py-2 text-foreground">{doc.supplierName || '-'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground">{doc.accessKey || '-'}</td>
                  <td className="px-4 py-2 text-foreground">{doc.status || '-'}</td>
                  <td className="px-4 py-2 text-right text-foreground">
                    {doc.totalValue != null ? formatCurrency(doc.totalValue) : '-'}
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {doc.emissionDate
                      ? formatDateTime(doc.emissionDate)
                      : doc.createdAt
                        ? formatDateTime(doc.createdAt)
                        : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                      >
                        {downloadingId === doc.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Baixando...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" /> Download
                          </>
                        )}
                      </Button>
                      {user?.role === 'empresa' && doc.hasXml && doc.accessKey && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEmitReturn(doc)}
                          disabled={emittingReturnId === doc.id}
                          title="Emitir NFe de devolução referenciando esta nota de entrada"
                        >
                          {emittingReturnId === doc.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Emitindo...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="mr-2 h-4 w-4" /> Emitir Devolução
                            </>
                          )}
                        </Button>
                      )}
                      {user?.role === 'empresa' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingDoc(doc);
                            setAccessKey(doc.accessKey || '');
                            setSupplierName(doc.supplierName || '');
                            const total = doc.totalValue ?? null;
                            setTotalValue(
                              total != null
                                ? total.toFixed(2).replace('.', ',')
                                : ''
                            );
                            setManualAttachment(null);
                            setAddOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Button>
                      )}
                      {user?.role === 'empresa' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setDeletingDoc(doc);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeletingDoc(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta nota fiscal de entrada?
            </DialogDescription>
          </DialogHeader>

          {deletingDoc && (
            <div className="space-y-2 py-4">
              <div className="text-sm">
                <span className="font-medium text-foreground">Fornecedor:</span>
                <span className="ml-2 text-muted-foreground">{deletingDoc.supplierName || '-'}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-foreground">Chave de Acesso:</span>
                <div className="mt-1 font-mono text-xs break-all text-muted-foreground">
                  {deletingDoc.accessKey || '-'}
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium text-foreground">Valor:</span>
                <span className="ml-2 text-muted-foreground">
                  {deletingDoc.totalValue != null ? formatCurrency(deletingDoc.totalValue) : '-'}
                </span>
              </div>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Esta ação não pode ser desfeita. A nota fiscal de entrada será removida permanentemente.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deletingDoc) return;
                try {
                  setDeleting(true);
                  await api.delete(`/fiscal/inbound-invoice/${deletingDoc.id}`);
                  toast.success('Nota fiscal de entrada excluída com sucesso');
                  setDeleteOpen(false);
                  setDeletingDoc(null);
                  refetch();
                } catch (error: any) {
                  console.error(error);
                  const errorMessage = error.response?.data?.message || error.message || 'Falha ao excluir nota fiscal';
                  toast.error(errorMessage);
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
            >
              {deleting ? (
                <>Excluindo...</>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setAccessKey('');
            setSupplierName('');
            setTotalValue('');
            setManualAttachment(null);
            setEditingDoc(null);
            setParsedData(null);
            setXmlPasted('');
            setParsingXml(false);
            setXmlStringForSubmit(null);
            setItemDecisions([]);
            setItemLinkedIds([]);
            setItemNewProductData({});
            setRegisterBillsFromXml(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'Editar Nota de Entrada' : 'Adicionar Nota de Entrada'}</DialogTitle>
            <DialogDescription>
              {editingDoc
                ? 'Atualize as informações da nota fiscal de entrada.'
                : 'Preencha pelo XML ou manualmente. Em seguida escolha o que fazer com os produtos e parcelas.'}
            </DialogDescription>
          </DialogHeader>

          {!editingDoc && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <FileCode2 className="h-4 w-4" />
                Preencher automaticamente pelo XML
              </div>
              <div className="grid gap-2">
                <Textarea
                  placeholder="Cole o XML da NFe aqui ou use o botão abaixo para selecionar arquivo"
                  value={xmlPasted}
                  onChange={(e) => setXmlPasted(e.target.value)}
                  rows={3}
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="file"
                    accept=".xml,application/xml,text/xml"
                    className="max-w-[220px]"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        const text = await new Promise<string>((res, rej) => {
                          const r = new FileReader();
                          r.onload = () => res(String(r.result ?? ''));
                          r.onerror = rej;
                          r.readAsText(f);
                        });
                        setXmlPasted(text);
                      } catch {
                        toast.error('Erro ao ler o arquivo');
                      }
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={parsingXml || !xmlPasted.trim()}
                    onClick={async () => {
                      const xml = xmlPasted.trim();
                      if (!xml) return;
                      setParsingXml(true);
                      try {
                        const { data: res } = await fiscalApi.parseInboundXml(xml);
                        setParsedData(res);
                        setXmlStringForSubmit(xml);
                        setAccessKey(res.form.accessKey ?? '');
                        setSupplierName(res.form.supplierName ?? '');
                        setTotalValue(String(res.form.totalValue ?? '').replace('.', ','));
                        setItemDecisions(res.items?.length ? res.items.map(() => 'skip') : []);
                        setItemLinkedIds(res.items?.length ? res.items.map(() => '') : []);
                        setItemNewProductData({});
                        const defaultData: Record<number, { name: string; barcode: string; costPrice: number; stockQuantity: number; ncm: string; cfop: string; unitOfMeasure: string; price: number }> = {};
                        (res.items ?? []).forEach((it: ParsedItem, i: number) => {
                          const barcode = (it.barcode && it.barcode.length >= 8 && it.barcode.length <= 20)
                            ? it.barcode
                            : `NFe-${Date.now().toString(36)}-${i}`;
                          defaultData[i] = {
                            name: it.description || `Item ${i + 1}`,
                            barcode: barcode.substring(0, 20),
                            costPrice: it.unitPrice ?? 0,
                            stockQuantity: it.quantity ?? 0,
                            ncm: (it.ncm ?? '99999999').replace(/\D/g, '').slice(0, 8) || '99999999',
                            cfop: (it.cfop ?? '5102').replace(/\D/g, '').slice(0, 4) || '5102',
                            unitOfMeasure: (it.unitOfMeasure ?? 'UN').slice(0, 6) || 'UN',
                            price: Math.max(it.unitPrice ?? 0, 0.01),
                          };
                        });
                        setItemNewProductData(defaultData);
                        setRegisterBillsFromXml((res.duplicatas?.length ?? 0) > 0);
                        toast.success('XML lido. Revise os dados e defina o que fazer com os produtos.');
                      } catch (err: any) {
                        const msg = err?.response?.data?.message || err?.message || 'XML inválido ou não é NFe de entrada';
                        toast.error(msg);
                      } finally {
                        setParsingXml(false);
                      }
                    }}
                  >
                    {parsingXml ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode2 className="h-4 w-4" />}
                    {' '}Ler XML e preencher
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="accessKey">Chave de Acesso (opcional)</Label>
              <Input
                id="accessKey"
                placeholder="44 dígitos da chave de acesso"
                maxLength={44}
                value={accessKey}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setAccessKey(value);
                }}
              />
              <p className="text-xs text-muted-foreground">{accessKey.length}/44 dígitos</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="supplierName">Fornecedor *</Label>
              <Input
                id="supplierName"
                placeholder="Nome do fornecedor"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="totalValue">Valor Total *</Label>
              <Input
                id="totalValue"
                placeholder="0,00"
                value={totalValue}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, '');
                  setTotalValue(value);
                }}
              />
              <p className="text-xs text-muted-foreground">Use vírgula para separar os centavos (ex: 1500,50)</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="manualAttachment">Anexo (opcional) - PDF ou XML</Label>
              <Input
                id="manualAttachment"
                type="file"
                accept=".pdf,application/pdf,.xml,application/xml,text/xml"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                    const isXml = ['application/xml', 'text/xml'].includes(file.type) || file.name.toLowerCase().endsWith('.xml');
                    if (!isPdf && !isXml) {
                      toast.error('Selecione um arquivo PDF ou XML');
                      e.currentTarget.value = '';
                      setManualAttachment(null);
                      return;
                    }
                    const maxSize = 10 * 1024 * 1024; // 10MB
                    if (file.size > maxSize) {
                      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
                      e.currentTarget.value = '';
                      setManualAttachment(null);
                      return;
                    }
                  }
                  setManualAttachment(file);
                }}
              />
              {manualAttachment && (
                <p className="text-xs text-muted-foreground">Arquivo selecionado: {manualAttachment.name}</p>
              )}
              {editingDoc?.pdfUrl && !manualAttachment && (
                <p className="text-xs text-muted-foreground">Arquivo atual disponível no anexo.</p>
              )}
            </div>

            {!editingDoc && parsedData?.items && parsedData.items.length > 0 && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <div className="font-medium text-foreground">Produtos da nota</div>
                <p className="text-xs text-muted-foreground">Para cada item, escolha: não adicionar, vincular a um produto existente ou criar novo produto.</p>
                <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                  {parsedData.items.map((item, i) => (
                    <div key={i} className="rounded border p-2 bg-background space-y-2">
                      <div className="text-sm font-medium text-foreground truncate">{item.description}</div>
                      <div className="text-xs text-muted-foreground">
                        Qtd: {item.quantity} · Valor un.: {formatCurrency(item.unitPrice)}
                        {item.ncm && ` · NCM: ${item.ncm}`}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={itemDecisions[i] ?? 'skip'}
                          onValueChange={(v) => {
                            const next = [...(itemDecisions.slice(0, i)), v as ItemDecision, ...itemDecisions.slice(i + 1)];
                            setItemDecisions(next.length > parsedData.items.length ? next.slice(0, parsedData.items.length) : next);
                            if (v === 'link') {
                              const ids = [...itemLinkedIds];
                              ids[i] = ids[i] ?? '';
                              setItemLinkedIds(ids.length > parsedData.items.length ? ids.slice(0, parsedData.items.length) : ids);
                            }
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Ação" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">Não adicionar ao estoque</SelectItem>
                            <SelectItem value="link">Vincular a produto existente</SelectItem>
                            <SelectItem value="create">Criar novo produto</SelectItem>
                          </SelectContent>
                        </Select>
                        {itemDecisions[i] === 'link' && (
                          <Select
                            value={itemLinkedIds[i] ?? ''}
                            onValueChange={(id) => {
                              const next = [...itemLinkedIds];
                              next[i] = id;
                              setItemLinkedIds(next);
                            }}
                          >
                            <SelectTrigger className="w-[220px]">
                              <SelectValue placeholder="Selecione o produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {productsList.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} {p.barcode ? `(${p.barcode})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {itemDecisions[i] === 'create' && itemNewProductData[i] != null && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t text-xs">
                          <div>
                            <Label className="text-xs">Nome</Label>
                            <Input
                              value={itemNewProductData[i].name}
                              onChange={(e) => setItemNewProductData({ ...itemNewProductData, [i]: { ...itemNewProductData[i], name: e.target.value } })}
                              placeholder="Nome"
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Cód. barras (8–20)</Label>
                            <Input
                              value={itemNewProductData[i].barcode}
                              onChange={(e) => setItemNewProductData({ ...itemNewProductData, [i]: { ...itemNewProductData[i], barcode: e.target.value.slice(0, 20) } })}
                              placeholder="8–20 caracteres"
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Custo / Preço venda</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={itemNewProductData[i].costPrice}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value) || 0;
                                setItemNewProductData({ ...itemNewProductData, [i]: { ...itemNewProductData[i], costPrice: v, price: Math.max(itemNewProductData[i].price, v) } });
                              }}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Preço venda</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={itemNewProductData[i].price}
                              onChange={(e) => setItemNewProductData({ ...itemNewProductData, [i]: { ...itemNewProductData[i], price: parseFloat(e.target.value) || 0 } })}
                              className="h-8"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!editingDoc && parsedData?.duplicatas && parsedData.duplicatas.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
                <input
                  type="checkbox"
                  id="registerBills"
                  checked={registerBillsFromXml}
                  onChange={(e) => setRegisterBillsFromXml(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="registerBills" className="text-sm cursor-pointer">
                  Cadastrar parcelas desta nota nas contas a pagar?
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (accessKey && accessKey.length !== 44) {
                  toast.error('Chave de acesso deve ter 44 dígitos');
                  return;
                }
                if (!supplierName.trim()) {
                  toast.error('Nome do fornecedor é obrigatório');
                  return;
                }
                if (!totalValue.trim()) {
                  toast.error('Valor total é obrigatório');
                  return;
                }
                const totalValueNumber = parseFloat(totalValue.replace(',', '.'));
                if (isNaN(totalValueNumber) || totalValueNumber < 0) {
                  toast.error('Valor total inválido');
                  return;
                }
                if (!editingDoc && parsedData?.items?.length) {
                  for (let i = 0; i < parsedData.items.length; i++) {
                    if (itemDecisions[i] === 'link' && !(itemLinkedIds[i] ?? '').trim()) {
                      toast.error(`Item "${parsedData.items[i].description?.slice(0, 30)}...": selecione um produto para vincular.`);
                      return;
                    }
                    if (itemDecisions[i] === 'create') {
                      const d = itemNewProductData[i];
                      if (!d?.name?.trim()) {
                        toast.error(`Item ${i + 1}: informe o nome do novo produto.`);
                        return;
                      }
                      const bc = (d.barcode ?? '').trim();
                      if (bc.length < 8 || bc.length > 20) {
                        toast.error(`Item ${i + 1}: código de barras deve ter entre 8 e 20 caracteres.`);
                        return;
                      }
                    }
                  }
                }
                try {
                  setUploading(true);
                  const formData = new FormData();
                  formData.append('supplierName', supplierName);
                  formData.append('totalValue', totalValueNumber.toString());
                  formData.append('accessKey', accessKey || '');
                  if (manualAttachment) {
                    formData.append('file', manualAttachment);
                  } else if (!editingDoc && xmlStringForSubmit && parsedData) {
                    formData.append('file', new File([xmlStringForSubmit], 'nfe.xml', { type: 'application/xml' }));
                  }
                  if (editingDoc) {
                    await api.patch(`/fiscal/inbound-invoice/${editingDoc.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                    toast.success('Nota fiscal de entrada atualizada com sucesso');
                    setAddOpen(false);
                    setAccessKey('');
                    setSupplierName('');
                    setTotalValue('');
                    setManualAttachment(null);
                    setEditingDoc(null);
                    refetch();
                    return;
                  }
                  await api.post('/fiscal/inbound-invoice', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                  if (parsedData?.items?.length) {
                    for (let i = 0; i < parsedData.items.length; i++) {
                      const item = parsedData.items[i];
                      if (itemDecisions[i] === 'link') {
                        const pid = itemLinkedIds[i];
                        if (!pid) continue;
                        try {
                          const { data: prod } = await productApi.get(pid);
                          const current = (prod as any)?.stockQuantity ?? 0;
                          await productApi.updateStock(pid, { stockQuantity: current + item.quantity });
                        } catch (e: any) {
                          toast.error(`Falha ao atualizar estoque do produto vinculado ao item "${item.description?.slice(0, 30)}...": ${e?.response?.data?.message || e?.message || 'Erro'}`);
                        }
                      }
                      if (itemDecisions[i] === 'create') {
                        const d = itemNewProductData[i];
                        if (!d) continue;
                        try {
                          await productApi.create({
                            name: d.name.trim(),
                            barcode: d.barcode.trim().slice(0, 20),
                            stockQuantity: d.stockQuantity,
                            price: Math.max(d.price, 0.01),
                            costPrice: d.costPrice,
                            ncm: (d.ncm ?? '99999999').replace(/\D/g, '').slice(0, 8) || '99999999',
                            cfop: (d.cfop ?? '5102').replace(/\D/g, '').slice(0, 4) || '5102',
                            unitOfMeasure: (d.unitOfMeasure ?? 'UN').slice(0, 6) || 'UN',
                          });
                        } catch (e: any) {
                          toast.error(`Falha ao criar produto do item "${item.description?.slice(0, 30)}...": ${e?.response?.data?.message || e?.message || 'Erro'}`);
                        }
                      }
                    }
                  }
                  if (registerBillsFromXml && parsedData?.duplicatas?.length) {
                    const docRef = parsedData.form.documentNumber ?? parsedData.form.accessKey?.slice(-8) ?? 'NFe';
                    const supplier = parsedData.form.supplierName ?? 'Fornecedor';
                    for (const dup of parsedData.duplicatas) {
                      try {
                        await billApi.create({
                          title: `NFe ${docRef} - ${supplier} - Parcela ${dup.nDup}`,
                          dueDate: dup.dVenc,
                          amount: dup.vDup,
                          paymentInfo: `Fornecedor: ${supplier}`,
                        });
                      } catch (e: any) {
                        toast.error(`Falha ao cadastrar parcela ${dup.nDup}: ${e?.response?.data?.message || e?.message || 'Erro'}`);
                      }
                    }
                  }
                  toast.success('Nota fiscal de entrada registrada com sucesso');
                  setAddOpen(false);
                  setAccessKey('');
                  setSupplierName('');
                  setTotalValue('');
                  setManualAttachment(null);
                  setParsedData(null);
                  setXmlPasted('');
                  setXmlStringForSubmit(null);
                  setItemDecisions([]);
                  setItemLinkedIds([]);
                  setItemNewProductData({});
                  setRegisterBillsFromXml(false);
                  setEditingDoc(null);
                  refetch();
                } catch (error: any) {
                  console.error(error);
                  const errorMessage = error.response?.data?.message || error.message || (editingDoc ? 'Falha ao atualizar nota fiscal' : 'Falha ao registrar nota fiscal');
                  toast.error(errorMessage);
                } finally {
                  setUploading(false);
                }
              }}
              disabled={
                uploading ||
                !supplierName.trim() ||
                !totalValue.trim() ||
                (accessKey.length > 0 && accessKey.length !== 44)
              }
            >
              {uploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Processando...
                </>
              ) : (
                <>
                  {editingDoc ? (
                    <>Salvar Alterações</>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={inboundInvoicesHelpTitle}
        description={inboundInvoicesHelpDescription}
        icon={inboundInvoicesHelpIcon}
        tabs={getInboundInvoicesHelpTabs()}
      />
    </div>
  );
}
