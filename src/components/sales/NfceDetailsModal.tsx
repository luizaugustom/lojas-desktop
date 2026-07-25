import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Copy, Download, FileText, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { NfceEmitida } from '../../types';

interface NfceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nfce: NfceEmitida | null;
  onReprint?: () => void;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatAccessKey(key: string) {
  return key.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function NfceDetailsModal({ open, onOpenChange, nfce, onReprint }: NfceDetailsModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!nfce) return null;

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* silencioso */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            NFC-e Autorizada
          </DialogTitle>
          <DialogDescription>
            ATO DIAT 38/2020 — Art. 8º: documento idôneo como DANFE.
          </DialogDescription>
        </DialogHeader>

        {nfce.contingencia && (
          <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 text-yellow-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Emitida em Contingência</AlertTitle>
            <AlertDescription>
              NFC-e gerada em modo contingência ({nfce.ttdType ?? 'TTD_707'}) e aguardando
              sincronização com a SEFAZ. O documento já é idôneo e pode ser usado pelo consumidor.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Número</p>
              <p className="font-mono text-lg font-semibold">{nfce.documentNumber}</p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Série</p>
              <p className="font-mono text-lg font-semibold">{nfce.serie || '—'}</p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="font-mono text-lg font-semibold">{formatCurrency(nfce.totalValue)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Chave de acesso</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(nfce.accessKey, 'chave')}
              >
                <Copy className="mr-1 h-3 w-3" />
                {copied === 'chave' ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
            <p className="rounded border bg-muted/50 p-3 font-mono text-xs tracking-wider">
              {formatAccessKey(nfce.accessKey)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Protocolo SEFAZ</p>
              <p className="font-mono text-sm">{nfce.protocol || '—'}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Data/Hora autorização</p>
              <p className="font-mono text-sm">{formatDateTime(nfce.authorizationDateTime)}</p>
            </div>
          </div>

          {(nfce.pdvCode || nfce.ttdType) && (
            <div className="flex flex-wrap gap-2">
              {nfce.pdvCode && <Badge variant="outline">PDV: {nfce.pdvCode}</Badge>}
              {nfce.ttdType && <Badge variant="outline">TTD: {nfce.ttdType}</Badge>}
              {nfce.contingencia && <Badge variant="destructive">Contingência</Badge>}
            </div>
          )}

          {nfce.qrCodeUrl && (
            <div className="flex flex-col items-center gap-2 rounded-md border bg-muted/30 p-4">
              <p className="text-sm font-medium">QR Code de consulta</p>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img
                src={nfce.qrCodeUrl}
                alt="QR Code da NFC-e"
                className="h-48 w-48 rounded border bg-white p-2"
              />
              {nfce.qrCode && (
                <p className="max-w-md break-all text-center font-mono text-[10px] text-muted-foreground">
                  {nfce.qrCode}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {nfce.pdfUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={nfce.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-1 h-4 w-4" />
                  Baixar PDF
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
            {nfce.xmlUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={nfce.xmlUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-1 h-4 w-4" />
                  Baixar XML
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
            {onReprint && (
              <Button variant="outline" size="sm" onClick={onReprint}>
                <FileText className="mr-1 h-4 w-4" />
                Reimprimir DANFE
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NfceDetailsModal;