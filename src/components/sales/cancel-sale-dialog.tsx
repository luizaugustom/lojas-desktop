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
import { XCircle } from 'lucide-react';

interface CancelSaleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
}

export function CancelSaleDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
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

