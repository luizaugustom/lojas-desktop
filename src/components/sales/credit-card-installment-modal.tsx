import { useState, useEffect } from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { formatCurrency } from '../../lib/utils-clean';
import { cardAcquirerRateApi } from '../../lib/api-endpoints';
import { useAuth } from '../../contexts/AuthContext';

interface CreditCardInstallmentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (installmentCount: number) => void;
  totalAmount: number;
  acquirerCnpj?: string;
}

export function CreditCardInstallmentModal({
  open,
  onClose,
  onConfirm,
  totalAmount,
  acquirerCnpj,
}: CreditCardInstallmentModalProps) {
  const { user } = useAuth();
  const [installmentCount, setInstallmentCount] = useState(2);
  const [estimatedRate, setEstimatedRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);

  useEffect(() => {
    if (open && acquirerCnpj && user?.companyId) {
      loadEstimatedRate();
    }
  }, [open, acquirerCnpj, installmentCount, user?.companyId]);

  const loadEstimatedRate = async () => {
    if (!acquirerCnpj || !user?.companyId) return;

    try {
      setLoadingRate(true);
      const ratesResponse = await cardAcquirerRateApi.list();
      const rates = ratesResponse.data.data || ratesResponse.data || [];
      const rate = rates.find(
        (r: any) => r.acquirerCnpj === acquirerCnpj && r.isActive
      );

      if (rate) {
        const installmentRates = rate.installmentRates || {};
        const rateForInstallments = installmentRates[installmentCount.toString()];
        if (rateForInstallments !== undefined) {
          setEstimatedRate(rateForInstallments);
        } else {
          setEstimatedRate(rate.creditRate);
        }
      } else {
        setEstimatedRate(null);
      }
    } catch (error) {
      console.error('Erro ao carregar taxa:', error);
      setEstimatedRate(null);
    } finally {
      setLoadingRate(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(installmentCount);
    onClose();
  };

  const installmentValue = totalAmount / installmentCount;
  const feeAmount = estimatedRate ? (totalAmount * estimatedRate) / 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Configurar Parcelas
          </DialogTitle>
          <DialogDescription>
            Selecione o número de parcelas para o pagamento com cartão de crédito
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="installments">Número de Parcelas</Label>
            <Select
              value={installmentCount.toString()}
              onValueChange={(value) => setInstallmentCount(Number(value))}
            >
              <SelectTrigger id="installments">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 23 }, (_, i) => i + 2).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}x
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor total:</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor da parcela:</span>
              <span className="font-medium">{formatCurrency(installmentValue)}</span>
            </div>
            {estimatedRate !== null && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa estimada ({estimatedRate.toFixed(2)}%):</span>
                  <span className="font-medium text-muted-foreground">
                    {formatCurrency(feeAmount)}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-medium">Valor líquido estimado:</span>
                  <span className="font-bold">
                    {formatCurrency(totalAmount - feeAmount)}
                  </span>
                </div>
              </>
            )}
          </div>

          {!acquirerCnpj && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Configure o CNPJ da credenciadora para ver a taxa estimada
              </AlertDescription>
            </Alert>
          )}

          {loadingRate && (
            <p className="text-sm text-muted-foreground text-center">
              Carregando taxa...
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar {installmentCount}x de {formatCurrency(installmentValue)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

