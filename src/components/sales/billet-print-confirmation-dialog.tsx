import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { FileText } from 'lucide-react';

interface BilletPrintConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function BilletPrintConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  loading = false,
}: BilletPrintConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              Visualizar e Imprimir Boletos?
            </DialogTitle>
          </div>
          <DialogDescription className="text-base mt-2">
            Deseja visualizar e imprimir os boletos desta venda agora?
            <br />
            <br />
            Os boletos serão exibidos em uma nova janela onde você poderá visualizar, baixar e imprimir.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Não, Pular
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            {loading ? 'Abrindo...' : 'Sim, Visualizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

