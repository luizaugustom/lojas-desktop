import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { XCircle, AlertTriangle } from 'lucide-react';

interface CancelSaleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
  /** Indica se a venda tem NFC-e/NF-e emitida (exibe alerta de prazo). */
  hasNfce?: boolean;
}

export function CancelSaleDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  hasNfce = false,
}: CancelSaleDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    const trimmedReason = reason.trim();
    
    if (!trimmedReason) {
      setError('O motivo do cancelamento é obrigatório');
      return;
    }

    if (trimmedReason.length < 15) {
      setError('O motivo do cancelamento deve ter pelo menos 15 caracteres');
      return;
    }

    setError('');
    await onConfirm(trimmedReason);
    setReason('');
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl">
              Cancelar Venda
            </DialogTitle>
          </div>
          <DialogDescription className="text-base mt-2">
            Ao cancelar esta venda:
            <br />
            <br />
            • Os produtos serão devolvidos ao estoque
            <br />
            • O valor será descontado do caixa (se ainda estiver aberto)
            <br />
            • A NFC-e será cancelada (se foi emitida)
            <br />
            <br />
            <strong>Esta ação não pode ser desfeita.</strong>
          </DialogDescription>
        </DialogHeader>

        {/* ATO DIAT 38/2020 — Art. 14: prazo de cancelamento da NFC-e */}
        {hasNfce && (
          <Alert variant="destructive" className="my-2 border-yellow-500 bg-yellow-50 text-yellow-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Prazo de cancelamento (Art. 14 do ATO DIAT 38/2020):</strong>
              <br />• <strong>NF-e (modelo 55):</strong> até 24 horas após a autorização.
              <br />• <strong>NFC-e (modelo 65):</strong> até 30 minutos após a autorização.
              <br />
              Após o prazo, o cancelamento só é possível via DAF (Documento Auxiliar Fiscal).
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="reason" className="text-base">
            Motivo do Cancelamento <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            placeholder="Descreva o motivo do cancelamento (mínimo 15 caracteres)"
            disabled={loading}
            rows={4}
            className="resize-none"
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Mínimo de 15 caracteres. {reason.trim().length}/15
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Não Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || reason.trim().length < 15}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

