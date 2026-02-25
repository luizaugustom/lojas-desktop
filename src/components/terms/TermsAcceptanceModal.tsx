import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { CheckCircle2, XCircle, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { companyApi } from '@/lib/api-endpoints';
import toast from 'react-hot-toast';
import TermosDeUsoPage from '../pages/TermosDeUsoPage';

interface TermsAcceptanceModalProps {
  open: boolean;
  companyName?: string;
  onAccept: () => void;
  onReject?: () => void;
}

export function TermsAcceptanceModal({ open, companyName, onAccept, onReject }: TermsAcceptanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await companyApi.acceptTerms({ accepted: true });
      toast.success('Termos de uso aceitos com sucesso!');
      onAccept();
    } catch (error: any) {
      console.error('Erro ao aceitar termos:', error);
      const errorMessage = error?.response?.data?.message || 'Erro ao aceitar termos. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await companyApi.acceptTerms({ accepted: false });
      toast.error('O uso do sistema está condicionado à aceitação dos Termos de Uso.');
      if (onReject) {
        setTimeout(() => {
          onReject();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Erro ao rejeitar termos:', error);
      const errorMessage = error?.response?.data?.message || 'Erro ao processar rejeição. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (showFullTerms) {
    return (
      <Dialog open={open} modal={true}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0">
          <div className="p-6">
            <TermosDeUsoPage 
              showAcceptButtons={true}
              onAccept={() => {
                setShowFullTerms(false);
                handleAccept();
              }}
              onClose={() => setShowFullTerms(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} modal={true}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <DialogTitle className="text-2xl">Termos de Uso do Sistema Montshop</DialogTitle>
          </div>
          <DialogDescription className="mt-2">
            É necessário aceitar os Termos de Uso para continuar utilizando o sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                      Leia atentamente os Termos de Uso
                    </h3>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Ao aceitar, você concorda com todas as condições estabelecidas nos Termos de Uso, incluindo responsabilidades fiscais, políticas de pagamento e remoção de dados.
                    </p>
                  </div>
                </div>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm text-muted-foreground mb-4">
                  Para visualizar o texto completo dos Termos de Uso, clique no botão abaixo:
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowFullTerms(true)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Ver Termos de Uso completos
                </Button>
              </div>

              <div className="border-t pt-4 mt-6">
                <h4 className="font-semibold mb-2">Principais pontos dos Termos:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>O sistema é uma ferramenta de gestão. Você é responsável por todas as obrigações fiscais perante a Receita Federal.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Em caso de atraso superior a 3 dias no pagamento, a conta pode ser desativada temporariamente.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Contas desativadas por mais de 30 dias terão todos os dados permanentemente removidos.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Você é responsável por manter backups de seus dados.</span>
                  </li>
                </ul>
              </div>
            </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t bg-muted/50 flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Rejeitar
            </Button>
            <Button
              onClick={handleAccept}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {loading ? 'Processando...' : 'Aceitar Termos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
