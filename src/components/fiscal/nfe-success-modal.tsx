import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CheckCircle2, Copy, Download, FileText, Mail, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fiscalApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import { downloadFile } from '@/lib/utils';

export interface NfeEmitidaResumo {
  id: string;
  documentNumber?: string | null;
  accessKey?: string | null;
  status?: string | null;
  pdfUrl?: string | null;
  recipientEmail?: string | null;
  recipientName?: string | null;
}

interface NfeSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nfe: NfeEmitidaResumo | null;
}

function formatAccessKey(key: string) {
  return key.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function NfeSuccessModal({ open, onOpenChange, nfe }: NfeSuccessModalProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'xml' | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && nfe) {
      setEmail(nfe.recipientEmail || '');
    }
  }, [open, nfe]);

  if (!nfe) return null;

  const numberLabel = nfe.documentNumber || 's/n';

  const copyKey = async () => {
    if (!nfe.accessKey) return;
    try {
      await navigator.clipboard.writeText(nfe.accessKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silencioso */
    }
  };

  const handleDownload = async (format: 'pdf' | 'xml') => {
    setDownloading(format);
    try {
      const response = await fiscalApi.download(nfe.id, format);
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/xml',
      });
      downloadFile(blob, `NFe_${numberLabel}.${format}`);
      toast.success(format === 'pdf' ? 'DANFE baixado' : 'XML baixado');
    } catch (error) {
      if (
        format === 'pdf' &&
        nfe.pdfUrl &&
        !/focusnfe\.com\.br/i.test(nfe.pdfUrl) &&
        !nfe.pdfUrl.startsWith('/arquivos')
      ) {
        window.open(nfe.pdfUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      handleApiError(error);
    } finally {
      setDownloading(null);
    }
  };

  const handleSendEmail = async () => {
    const to = email.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error('Informe um e-mail válido');
      return;
    }
    setSending(true);
    try {
      await fiscalApi.sendEmail(nfe.id, {
        email: to,
        format: 'both',
        recipientName: nfe.recipientName || undefined,
      });
      toast.success(`NF-e enviada para ${to}`);
    } catch (error) {
      handleApiError(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            NF-e emitida com sucesso
          </DialogTitle>
          <DialogDescription>
            Baixe o DANFE ou XML, ou envie a nota por e-mail ao destinatário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Número</p>
              <p className="font-mono text-lg font-semibold">{numberLabel}</p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-mono text-sm font-semibold capitalize">
                {nfe.status || 'autorizado'}
              </p>
            </div>
          </div>

          {nfe.accessKey && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Chave de acesso</p>
                <Button type="button" variant="ghost" size="sm" onClick={copyKey}>
                  <Copy className="mr-1 h-3 w-3" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
              <p className="rounded border bg-muted/50 p-3 font-mono text-xs tracking-wider">
                {formatAccessKey(nfe.accessKey)}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDownload('pdf')}
              disabled={downloading !== null}
            >
              {downloading === 'pdf' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Baixar DANFE (PDF)
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDownload('xml')}
              disabled={downloading !== null}
            >
              {downloading === 'xml' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Baixar XML
            </Button>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <Label htmlFor="nfe-email">Enviar por e-mail</Label>
            <div className="flex gap-2">
              <Input
                id="nfe-email"
                type="email"
                placeholder="cliente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="button" onClick={handleSendEmail} disabled={sending}>
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Enviar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anexa DANFE (PDF) e XML, quando disponíveis.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NfeSuccessModal;
