'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Download, CheckCircle2 } from 'lucide-react';
import { fiscalApi } from '@/lib/api-endpoints';

type TermoType = 'TTD_706' | 'TTD_707' | 'TTD_710' | 'ALL';

interface TermoCompromissoModalProps {
  open: boolean;
  onClose: () => void;
  onAccepted?: () => void;
  type?: TermoType;
  defaultType?: TermoType;
}

/**
 * Modal de aceite do Termo de Compromisso (Anexos I/II do ATO DIAT 38/2020).
 *
 * - Permite baixar o PDF antes de aceitar
 * - Registra IP, user-agent e hash SHA-256 para auditoria (Art. 10)
 * - Só após aceite a empresa pode entrar em contingência
 */
export function TermoCompromissoModal({
  open,
  onClose,
  onAccepted,
  type: forcedType,
  defaultType = 'TTD_707',
}: TermoCompromissoModalProps) {
  const [type, setType] = useState<TermoType>(defaultType);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ hash: string; acceptedAt: string } | null>(null);

  useEffect(() => {
    if (forcedType) setType(forcedType);
  }, [forcedType]);

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: blob } = await fiscalApi.getTermoCompromissoPdf(type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-compromisso-${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao gerar PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setAccepting(true);
      setError(null);
      const { data: result } = await fiscalApi.aceitarTermoCompromisso({ type });
      setSuccess({
        hash: result.contentHash,
        acceptedAt: new Date(result.acceptedAt).toLocaleString('pt-BR'),
      });
      onAccepted?.();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao aceitar termo.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Termo de Compromisso — ATO DIAT 38/2020
          </DialogTitle>
          <DialogDescription>
            Anexos I/II — aceite eletrônico obrigatório antes de operar em contingência NFC-e.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!success && (
            <>
              <p className="text-sm text-gray-700">
                Este termo declara que a empresa observa todas as disposições do ATO DIAT 38/2020
                para emissão da NFC-e em contingência, conforme o tipo de TTD selecionado.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {(['TTD_706', 'TTD_707', 'TTD_710', 'ALL'] as TermoType[]).map((t) => (
                  <Button
                    key={t}
                    variant={type === t ? 'default' : 'outline'}
                    onClick={() => setType(t)}
                    className="w-full"
                  >
                    {t}
                  </Button>
                ))}
              </div>

              <Button onClick={handleDownload} disabled={loading} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {loading ? 'Gerando PDF...' : 'Baixar PDF para revisão'}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}

          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Termo aceito com sucesso!</strong>
                <br />
                Data: {success.acceptedAt}
                <br />
                Hash SHA-256: <code className="text-xs">{success.hash}</code>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {!success ? (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleAccept} disabled={accepting}>
                {accepting ? 'Aceitando...' : 'Aceitar e registrar'}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
