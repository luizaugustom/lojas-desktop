import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';

interface PaymentReceiptProps {
  installment: any;
  payment: {
    amount: number;
    paymentMethod: string;
    date: string;
    notes?: string;
    sellerName?: string;
  };
  customerInfo?: {
    name: string;
    cpfCnpj?: string;
    phone?: string;
  };
  companyInfo?: {
    name: string;
    cnpj?: string;
    address?: string;
  };
  onPrintComplete?: () => void;
}

const getPaymentMethodLabel = (method: string) => {
  const methods: Record<string, string> = {
    cash: 'Dinheiro',
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
  };
  return methods[method] || method;
};

const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value) || 0;
};

export function PaymentReceipt({
  installment,
  payment,
  customerInfo,
  companyInfo,
  onPrintComplete,
}: PaymentReceiptProps) {
  const [customerTotalAfterPayment, setCustomerTotalAfterPayment] = useState<number | null>(null);
  const [isLoadingDebt, setIsLoadingDebt] = useState<boolean>(true);

  // Calcula IDs e dados base
  const customerId = useMemo(() => {
    return installment?.customer?.id || installment?.customerId || null;
  }, [installment]);

  useEffect(() => {
    let isCancelled = false;
    async function loadCustomerDebts() {
      try {
        setIsLoadingDebt(true);
        if (!customerId) {
          setCustomerTotalAfterPayment(null);
          return;
        }
        const resp = await api.get(`/installment/customer/${customerId}/summary`);
        const raw = resp?.data ?? {};
        const installmentsList: any[] = Array.isArray(raw.installments) ? raw.installments : [];
        const totalDebtFromSummary = toNumber(raw.totalDebt);
        const totalRemaining = totalDebtFromSummary || installmentsList
          .filter((inst) => !inst.isPaid)
          .reduce((sum, inst) => sum + toNumber(inst.remainingAmount ?? inst.amount), 0);

        // Subtrai o pagamento atual do restante desta parcela
        const currentRemaining = toNumber(installment?.remainingAmount);
        const paidNow = Math.min(toNumber(payment.amount), currentRemaining);
        const adjustedTotal = totalRemaining - paidNow;

        if (!isCancelled) {
          setCustomerTotalAfterPayment(Math.max(0, adjustedTotal));
        }
      } catch (err) {
        // Em caso de erro, ainda imprimimos sem o total agregado
        if (!isCancelled) {
          const fallbackDebt = toNumber(installment?.customer?.totalDebt);
          if (fallbackDebt > 0) {
            const currentRemaining = toNumber(installment?.remainingAmount);
            const paidNow = Math.min(toNumber(payment.amount), currentRemaining);
            setCustomerTotalAfterPayment(Math.max(0, fallbackDebt - paidNow));
          } else {
            setCustomerTotalAfterPayment(null);
          }
        }
      } finally {
        if (!isCancelled) setIsLoadingDebt(false);
      }
    }
    loadCustomerDebts();
    return () => {
      isCancelled = true;
    };
  }, [customerId, installment?.remainingAmount, payment.amount]);

  useEffect(() => {
    // Aguarda dados de dívida (ou timeout) antes de imprimir para garantir exibição completa
    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && typeof window.print === 'function') {
          window.print();
        }
      } finally {
        if (onPrintComplete) onPrintComplete();
      }
    }, isLoadingDebt ? 900 : 500);
    return () => clearTimeout(timer);
  }, [onPrintComplete, isLoadingDebt]);

  const remainingAmount = toNumber(installment.remainingAmount);
  const originalAmount = toNumber(installment.amount);
  const paidAmount = originalAmount - remainingAmount;
  const newRemainingAmount = remainingAmount - toNumber(payment.amount);
  const remainingAfterPayment = Math.max(newRemainingAmount, 0);
  const otherDebtsAfterPayment = useMemo(() => {
    if (customerTotalAfterPayment === null) return null;
    return Math.max(customerTotalAfterPayment - remainingAfterPayment, 0);
  }, [customerTotalAfterPayment, remainingAfterPayment]);

  const saleDateValue = installment.sale?.saleDate || installment.sale?.createdAt;
  const saleDateText = saleDateValue ? formatDate(saleDateValue) : '—';
  const saleTotal = toNumber(installment.sale?.total ?? installment.sale?.totalAmount ?? installment.sale?.amount);

  return (
    <div className="print-only">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-only,
            .print-only * {
              visibility: visible;
            }
            .print-only {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page {
              size: auto;
              margin: 5mm;
            }
          }
          @media screen {
            .print-only {
              display: none;
            }
          }
        `}
      </style>

      {/* Layout estilo cupom não fiscal (largura de bobina) */}
      <div style={{ padding: '8px', fontFamily: 'monospace', maxWidth: '280px', margin: '0 auto', fontSize: '12px' }}>
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>COMPROVANTE DE PAGAMENTO</div>
          {companyInfo && (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontSize: '11px' }}>{companyInfo.name}</div>
              {companyInfo.cnpj && <div style={{ fontSize: '11px' }}>CNPJ: {companyInfo.cnpj}</div>}
              {companyInfo.address && <div style={{ fontSize: '11px' }}>{companyInfo.address}</div>}
            </div>
          )}
        </div>
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Informações do Pagamento */}
        <div>
          <div style={{ fontWeight: 'bold' }}>Dados do Pagamento</div>
          <div>Data: {new Date(payment.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(payment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div>Método: {getPaymentMethodLabel(payment.paymentMethod)}</div>
          <div>Valor Pago: {formatCurrency(payment.amount)}</div>
          {payment.sellerName && <div>Recebido por: {payment.sellerName}</div>}
          {payment.notes && <div>Obs: {payment.notes}</div>}
        </div>
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Informações do Cliente */}
        {customerInfo && (
          <div>
            <div style={{ fontWeight: 'bold' }}>Cliente</div>
            <div>Nome: {customerInfo.name}</div>
            {customerInfo.cpfCnpj && <div>CPF/CNPJ: {customerInfo.cpfCnpj}</div>}
            {customerInfo.phone && <div>Telefone: {customerInfo.phone}</div>}
          </div>
        )}
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Informações da Parcela */}
        <div>
          <div style={{ fontWeight: 'bold' }}>Parcela</div>
          <div>Ref.: {installment.installmentNumber}/{installment.totalInstallments}</div>
          <div>Valor: {formatCurrency(originalAmount)}</div>
          <div>Já pago: {formatCurrency(paidAmount)}</div>
          <div>Pago agora: {formatCurrency(payment.amount)}</div>
          <div style={{ fontWeight: 'bold' }}>Saldo da parcela: {formatCurrency(remainingAfterPayment)}</div>
        </div>
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Total em aberto do cliente após este pagamento */}
        <div>
          <div style={{ fontWeight: 'bold' }}>Outras dívidas do cliente</div>
          <div>
            {isLoadingDebt && 'Calculando...'}
            {!isLoadingDebt && otherDebtsAfterPayment !== null && (
              <span>{formatCurrency(otherDebtsAfterPayment)}</span>
            )}
            {!isLoadingDebt && otherDebtsAfterPayment === null && (
              <span>Não disponível</span>
            )}
          </div>
          <div style={{ fontWeight: 'bold' }}>Total em aberto: {customerTotalAfterPayment !== null ? formatCurrency(customerTotalAfterPayment) : 'Não disponível'}</div>
        </div>
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Resumo da Conta */}
        {installment.sale && (
          <div>
            <div style={{ fontWeight: 'bold' }}>Resumo da Venda</div>
            <div>Data: {saleDateText || 'Não informado'}</div>
            <div>Total: {formatCurrency(saleTotal)}</div>
            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
          </div>
        )}

        {/* Rodapé */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#444' }}>
          <div style={{ marginTop: '6px' }}>Emitido em: {new Date().toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}</div>
          <div style={{ marginTop: '4px' }}>Documento não fiscal</div>
          <div style={{ marginTop: '4px' }}>Obrigado pela preferência!</div>
          <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
          <div style={{ marginTop: '2px', fontWeight: 'bold' }}>MontShop</div>
          <div style={{ fontSize: '10px' }}>sistemamontshop.com</div>
        </div>
      </div>
    </div>
  );
}
