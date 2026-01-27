import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Download, Printer, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface InstallmentBilletViewerProps {
  open: boolean;
  onClose: () => void;
  saleId: string;
  billetsPdfBase64?: string;
}

export function InstallmentBilletViewer({ open, onClose, saleId, billetsPdfBase64 }: InstallmentBilletViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && billetsPdfBase64) {
      // Converter base64 para blob URL
      try {
        const binaryString = atob(billetsPdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error('Erro ao processar PDF:', error);
        toast.error('Erro ao carregar PDF dos boletos');
      }
    } else if (open && !billetsPdfBase64) {
      // Buscar PDF do backend
      fetchBilletsPdf();
    }
  }, [open, billetsPdfBase64, saleId]);

  const fetchBilletsPdf = async () => {
    setLoading(true);
    try {
      // Aqui você precisaria fazer uma chamada à API para buscar o PDF
      // Por enquanto, vamos apenas mostrar uma mensagem
      toast.error('PDF não disponível. Use o botão de download para gerar os boletos.');
    } catch (error) {
      console.error('Erro ao buscar PDF:', error);
      toast.error('Erro ao buscar PDF dos boletos');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      } else {
        toast.error('Não foi possível abrir janela de impressão. Verifique se os pop-ups estão bloqueados.');
      }
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `boletos-${saleId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download iniciado');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Boletos da Venda</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <p>Carregando PDF...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-[600px] border rounded"
              title="Boletos PDF"
            />
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">PDF não disponível</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Fechar
          </Button>
          {pdfUrl && (
            <>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

