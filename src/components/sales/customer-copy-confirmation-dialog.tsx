'use client';

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

interface CustomerCopyConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function CustomerCopyConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  loading = false,
}: CustomerCopyConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Printer className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              Imprimir via do cliente?
            </DialogTitle>
          </div>
          <DialogDescription className="text-base mt-2">
            Deseja imprimir a via do cliente agora?
            <br />
            <br />
            A via do cliente será enviada para a impressora térmica cadastrada.
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
            <Printer className="h-4 w-4" />
            {loading ? 'Imprimindo...' : 'Imprimir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

