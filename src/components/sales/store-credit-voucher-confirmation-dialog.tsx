import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Receipt } from 'lucide-react';
import { formatCurrency } from '../../lib/utils-clean';

interface StoreCreditVoucherConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  creditUsed: number;
  remainingBalance: number;
}

export function StoreCreditVoucherConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  loading = false,
  creditUsed,
  remainingBalance,
}: StoreCreditVoucherConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              Imprimir Comprovante de Saldo Restante?
            </DialogTitle>
          </div>
          <DialogDescription className="text-base mt-2">
            <div className="space-y-2">
              <p>
                Crédito utilizado: <span className="font-semibold">{formatCurrency(creditUsed)}</span>
              </p>
              <p>
                Saldo restante: <span className="font-semibold text-primary">{formatCurrency(remainingBalance)}</span>
              </p>
              <p className="mt-4">
                Deseja imprimir um comprovante com o saldo restante de crédito em loja?
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Não Imprimir
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="gap-2"
          >
            <Receipt className="h-4 w-4" />
            {loading ? 'Imprimindo...' : 'Sim, Imprimir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



