import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../lib/utils';
import { DollarSign, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { PaymentReceiptConfirmDialog } from './payment-receipt-confirm-dialog';
import { InstallmentBilletViewer } from './installment-billet-viewer';
import { ConfirmationModal } from '../ui/confirmation-modal';
import { printContent } from '../../lib/print-service';
import { generatePaymentReceiptContent } from '../../lib/payment-receipt-content';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  installment: any;
}

interface PaymentFormData {
  amount: number;
  paymentMethod: string;
  notes?: string;
}

export function PaymentDialog({ open, onClose, installment }: PaymentDialogProps) {
  const { api, user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const companyInfo = useMemo(() => {
    if (!company) return null;
    const addressParts = [
      company.address?.street,
      company.address?.number,
      company.address?.complement,
      company.address?.neighborhood,
      company.address?.city,
      company.address?.state,
    ].filter(Boolean);

    return {
      name: company.name,
      cnpj: company.cnpj,
      address: addressParts.join(', '),
    };
  }, [company]);

  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [showReceiptConfirm, setShowReceiptConfirm] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [printing, setPrinting] = useState(false);
  const [customerTotalAfterPayment, setCustomerTotalAfterPayment] = useState<number | null>(null);
  const [newBilletPdf, setNewBilletPdf] = useState<string | null>(null);
  const [showNewBillet, setShowNewBillet] = useState(false);
  const [showNewBilletConfirm, setShowNewBilletConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PaymentFormData>({
    defaultValues: {
      paymentMethod: 'cash',
    },
  });

  const amount = watch('amount');

  useEffect(() => {
    if (open && installment) {
      const fullAmount = installment.remainingAmount || 0;
      setValue('amount', fullAmount);
      setPaymentType('full');
    } else if (!open) {
      // Limpa o formulário quando o diálogo fecha
      reset();
      setShowReceiptConfirm(false);
      setPaymentData(null);
      setNewBilletPdf(null);
      setShowNewBillet(false);
      setShowNewBilletConfirm(false);
    }
  }, [open, installment?.id, installment?.remainingAmount, setValue, reset]);

  useEffect(() => {
    let active = true;
    const loadCompany = async () => {
      if (!open) return;
      try {
        const response = await api.get('/company/my-company');
        if (active) setCompany(response.data);
      } catch (err) {
        if (active) setCompany(null);
      }
    };
    loadCompany();
    return () => {
      active = false;
    };
  }, [open, api]);

  const paymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      return api.post(`/installment/${installment?.id}/pay`, data);
    },
    onSuccess: (response, variables) => {
      // Armazena os dados do pagamento para o comprovante
      setPaymentData({
        amount: variables.amount,
        paymentMethod: variables.paymentMethod,
        notes: variables.notes,
        date: new Date().toISOString(),
        sellerName: user?.name,
      });

      // Verificar se há novo boleto (pagamento parcial)
      if (response.data?.newBilletPdf) {
        setNewBilletPdf(response.data.newBilletPdf);
        toast.success('Pagamento registrado! Novo boleto gerado para o valor restante.');
        setShowNewBilletConfirm(true);
      } else {
        toast.success(response.data.message || 'Pagamento registrado com sucesso!');
        // Mostra o diálogo de confirmação de impressão apenas se não houver novo boleto
        setShowReceiptConfirm(true);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao registrar pagamento');
    },
  });

  // Carrega débito total do cliente após o pagamento
  useEffect(() => {
    if (!paymentData || !installment?.customer?.id) {
      setCustomerTotalAfterPayment(null);
      return;
    }

    let isCancelled = false;
    const customerId = installment.customer.id;
    const paymentAmount = paymentData.amount;
    const installmentRemaining = installment?.remainingAmount;

    const loadCustomerDebt = async () => {
      try {
        const resp = await api.get(`/installment/customer/${customerId}/summary`);
        const raw = resp?.data ?? {};
        const installmentsList: any[] = Array.isArray(raw.installments) ? raw.installments : [];
        const totalDebtFromSummary = Number(raw.totalDebt) || 0;
        
        const totalRemaining = totalDebtFromSummary || installmentsList
          .filter((inst) => !inst.isPaid)
          .reduce((sum, inst) => sum + Number(inst.remainingAmount ?? inst.amount), 0);

        // Subtrai o pagamento atual do restante
        const currentRemaining = Number(installmentRemaining) || 0;
        const paidNow = Math.min(Number(paymentAmount), currentRemaining);
        const adjustedTotal = totalRemaining - paidNow;

        if (!isCancelled) {
          setCustomerTotalAfterPayment(Math.max(0, adjustedTotal));
        }
      } catch (err) {
        if (!isCancelled) {
          setCustomerTotalAfterPayment(null);
        }
      }
    };

    loadCustomerDebt();
    return () => {
      isCancelled = true;
    };
  }, [paymentData?.amount, installment?.customer?.id, installment?.remainingAmount, api]);

  const onSubmit = (data: PaymentFormData) => {
    if (!installment) return;

    if (data.amount <= 0) {
      toast.error('O valor deve ser maior que zero');
      return;
    }

    if (data.amount > installment.remainingAmount) {
      toast.error('O valor não pode ser maior que o valor restante');
      return;
    }

    paymentMutation.mutate(data);
  };

  const handlePaymentTypeChange = (type: 'full' | 'partial') => {
    setPaymentType(type);
    if (type === 'full' && installment) {
      setValue('amount', installment.remainingAmount || 0);
    } else {
      setValue('amount', 0);
    }
  };

  const handlePrintReceipt = async () => {
    setShowReceiptConfirm(false);
    
    if (!paymentData || !installment) {
      toast.error('Dados do pagamento não carregados');
      return;
    }

    setPrinting(true);
    try {
      // Gera o conteúdo de impressão
      const receiptContent = generatePaymentReceiptContent({
        companyInfo: companyInfo || undefined,
        customerInfo: {
          name: installment.customer?.name,
          cpfCnpj: installment.customer?.cpfCnpj,
          phone: installment.customer?.phone,
        },
        installment,
        payment: paymentData,
        customerTotalAfterPayment,
      });

      // Imprime usando o serviço universal
      const printResult = await printContent(receiptContent);
      
      if (printResult.success) {
        toast.success('Comprovante enviado para impressão!');
      } else {
        toast.error(`Erro ao imprimir: ${printResult.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao imprimir comprovante:', error);
      toast.error('Erro ao preparar comprovante para impressão');
    } finally {
      setPrinting(false);
      reset();
      onClose();
    }
  };

  const handleSkipReceipt = () => {
    setShowReceiptConfirm(false);
    reset();
    setNewBilletPdf(null);
    setShowNewBillet(false);
    onClose();
  };

  const handleConfirmNewBillet = () => {
    setShowNewBilletConfirm(false);
    setShowNewBillet(true);
  };

  const handleSkipNewBillet = () => {
    setShowNewBilletConfirm(false);
    setShowNewBillet(false);
    setNewBilletPdf(null);
    setShowReceiptConfirm(true);
  };

  const handleNewBilletClose = () => {
    setShowNewBillet(false);
    setNewBilletPdf(null);
    // Após fechar o boleto, mostrar confirmação de comprovante se necessário
    if (paymentData) {
      setShowReceiptConfirm(true);
    } else {
      reset();
      onClose();
    }
  };

  if (!installment) return null;

  const remainingAmount = installment.remainingAmount || 0;
  const originalAmount = installment.amount || 0;
  const paidAmount = originalAmount - remainingAmount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cliente:</span>
              <span className="text-sm font-medium">{installment.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Parcela:</span>
              <span className="text-sm font-medium">
                {installment.installmentNumber}/{installment.totalInstallments}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Original:</span>
              <span className="text-sm font-medium">{formatCurrency(originalAmount)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Já Pago:</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(paidAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm font-semibold">Valor Restante:</span>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(remainingAmount)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Pagamento</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paymentType === 'full' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handlePaymentTypeChange('full')}
              >
                Pagamento Total
              </Button>
              <Button
                type="button"
                variant={paymentType === 'partial' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handlePaymentTypeChange('partial')}
              >
                Pagamento Parcial
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Valor a Pagar <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remainingAmount}
                placeholder="0,00"
                style={{ paddingLeft: '2.75rem' }}
                className="pr-3"
                {...register('amount', {
                  required: 'Valor é obrigatório',
                  min: { value: 0.01, message: 'Valor mínimo é R$ 0,01' },
                  max: {
                    value: remainingAmount,
                    message: 'Valor não pode ser maior que o restante',
                  },
                  valueAsNumber: true,
                })}
                onFocus={(e) => {
                  if (Number(e.target.value) === 0) {
                    e.target.value = '';
                  }
                }}
                disabled={paymentType === 'full'}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
            {paymentType === 'partial' && amount > 0 && (
              <p className="text-xs text-muted-foreground">
                Restará: {formatCurrency(remainingAmount - amount)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              Método de Pagamento <span className="text-destructive">*</span>
            </Label>
            <Select
              defaultValue="cash"
              onValueChange={(value) => setValue('paymentMethod', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Dinheiro
                  </div>
                </SelectItem>
                <SelectItem value="pix">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    PIX
                  </div>
                </SelectItem>
                <SelectItem value="credit_card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Cartão de Crédito
                  </div>
                </SelectItem>
                <SelectItem value="debit_card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Cartão de Débito
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre o pagamento (opcional)"
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={paymentMutation.isPending}>
              {paymentMutation.isPending ? 'Registrando...' : 'Registrar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Modal de confirmação de impressão */}
      <PaymentReceiptConfirmDialog
        open={showReceiptConfirm}
        onConfirm={handlePrintReceipt}
        onCancel={handleSkipReceipt}
      />

      <ConfirmationModal
        open={showNewBilletConfirm}
        onClose={handleSkipNewBillet}
        onConfirm={handleConfirmNewBillet}
        title="Boleto do restante"
        description="Deseja visualizar ou imprimir o boleto referente ao valor restante da dívida?"
        confirmText="Visualizar boleto"
        cancelText="Não agora"
      />

      {/* Visualizador de novo boleto (pagamento parcial) */}
      {newBilletPdf && installment && (
        <InstallmentBilletViewer
          open={showNewBillet}
          onClose={handleNewBilletClose}
          saleId={installment.saleId}
          billetsPdfBase64={newBilletPdf}
        />
      )}
    </Dialog>
  );
}


