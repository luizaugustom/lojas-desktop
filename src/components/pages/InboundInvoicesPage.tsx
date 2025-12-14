import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, RefreshCw, Search, Download, Upload, PlusCircle, Trash2, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input, InputWithIcon } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { formatCurrency, formatDateTime, downloadFile } from '@/lib/utils';
import { fiscalApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';

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

export default function InboundInvoicesPage() {
  const { api, user } = useAuth();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<InboundDoc | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<InboundDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [accessKey, setAccessKey] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [manualAttachment, setManualAttachment] = useState<File | null>(null);

  useEffect(() => {
    if (user && user.role !== 'empresa') {
      toast.error('Apenas empresas podem acessar esta página');
    }
  }, [user]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inbound-fiscal', search],
    queryFn: async () => (await api.get('/fiscal', { params: { search, documentType: 'inbound' } })).data,
  });

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
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'Editar Nota de Entrada' : 'Adicionar Nota de Entrada'}</DialogTitle>
            <DialogDescription>
              {editingDoc
                ? 'Atualize as informações da nota fiscal de entrada.'
                : 'Preencha as informações da nota fiscal de entrada manualmente e, se quiser, anexe o PDF ou XML.'}
            </DialogDescription>
          </DialogHeader>

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

                try {
                  setUploading(true);

                  const totalValueNumber = parseFloat(totalValue.replace(',', '.'));
                  if (isNaN(totalValueNumber) || totalValueNumber < 0) {
                    toast.error('Valor total inválido');
                    return;
                  }

                  const formData = new FormData();
                  formData.append('supplierName', supplierName);
                  formData.append('totalValue', totalValueNumber.toString());

                  if (accessKey) {
                    formData.append('accessKey', accessKey);
                  } else if (editingDoc) {
                    formData.append('accessKey', '');
                  }

                  if (manualAttachment) {
                    formData.append('file', manualAttachment);
                  }

                  if (editingDoc) {
                    await api.patch(
                      `/fiscal/inbound-invoice/${editingDoc.id}`,
                      formData,
                      {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      }
                    );
                  } else {
                    await api.post('/fiscal/inbound-invoice', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                  }

                  toast.success(editingDoc ? 'Nota fiscal de entrada atualizada com sucesso' : 'Nota fiscal de entrada registrada com sucesso');
                  setAddOpen(false);
                  setAccessKey('');
                  setSupplierName('');
                  setTotalValue('');
                  setManualAttachment(null);
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
    </div>
  );
}
