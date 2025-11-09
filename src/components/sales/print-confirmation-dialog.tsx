import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer } from 'lucide-react';

interface PrintConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  printType?: string | null;
}

export function PrintConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  loading = false,
  printType,
}: PrintConfirmationDialogProps) {
  const normalizedType = (printType || 'nfce')?.toLowerCase();
  const isNonFiscal = normalizedType === 'non-fiscal';
  const title = isNonFiscal ? 'Imprimir cupom não fiscal?' : 'Imprimir cupom fiscal?';
  const description = isNonFiscal
    ? 'Deseja imprimir o cupom não fiscal desta venda agora?'
    : 'Deseja imprimir a Nota Fiscal do Consumidor Eletrônica (NFC-e) desta venda agora?';
  const footerMessage = 'O documento será enviado para a impressora térmica configurada.';

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Printer className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base mt-2">
            {description}
            <br />
            <br />
            {footerMessage}
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
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Imprimindo...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Sim, Imprimir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

