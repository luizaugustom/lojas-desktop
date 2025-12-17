/**
 * Gera conteúdo de texto para impressão de comprovante de pagamento
 * Similar ao formato usado em vendas e orçamentos
 */

import { formatCurrency, formatDate } from './utils';

export interface PaymentReceiptContentData {
  companyInfo?: {
    name: string;
    cnpj?: string;
    address?: string;
  };
  customerInfo?: {
    name: string;
    cpfCnpj?: string;
    phone?: string;
  };
  installment: {
    installmentNumber: number;
    totalInstallments: number;
    amount: number;
    remainingAmount: number;
    customer?: {
      name: string;
      cpfCnpj?: string;
    };
    sale?: {
      saleDate?: string;
      createdAt?: string;
      total?: number;
      totalAmount?: number;
      amount?: number;
    };
  };
  payment: {
    amount: number;
    paymentMethod: string;
    date: string;
    notes?: string;
    sellerName?: string;
  };
  customerTotalAfterPayment?: number | null;
}

const getPaymentMethodLabel = (method: string): string => {
  const methods: Record<string, string> = {
    cash: 'Dinheiro',
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    bank_transfer: 'Transferência',
    check: 'Cheque',
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

const padRight = (str: string, length: number): string => {
  return str + ' '.repeat(Math.max(0, length - str.length));
};

const padLeft = (str: string, length: number): string => {
  return ' '.repeat(Math.max(0, length - str.length)) + str;
};

const center = (str: string, length: number = 48): string => {
  const padding = Math.max(0, length - str.length);
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
};

const line = (length: number = 48): string => {
  return '-'.repeat(length);
};

export function generatePaymentReceiptContent(data: PaymentReceiptContentData): string {
  const width = 48;
  
  const remainingAmount = toNumber(data.installment.remainingAmount);
  const originalAmount = toNumber(data.installment.amount);
  const paidAmount = originalAmount - remainingAmount;
  const newRemainingAmount = remainingAmount - toNumber(data.payment.amount);
  const remainingAfterPayment = Math.max(newRemainingAmount, 0);

  const saleDateValue = data.installment.sale?.saleDate || data.installment.sale?.createdAt;
  const saleDateText = saleDateValue ? formatDate(saleDateValue) : '—';
  const saleTotal = toNumber(
    data.installment.sale?.total ?? 
    data.installment.sale?.totalAmount ?? 
    data.installment.sale?.amount
  );

  const paymentDate = new Date(data.payment.date);
  const paymentDateStr = paymentDate.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  const paymentTimeStr = paymentDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  let content = '';

  // Cabeçalho
  content += center('COMPROVANTE DE PAGAMENTO', width) + '\n';
  
  if (data.companyInfo) {
    content += '\n';
    content += center(data.companyInfo.name, width) + '\n';
    if (data.companyInfo.cnpj) {
      content += center(`CNPJ: ${data.companyInfo.cnpj}`, width) + '\n';
    }
    if (data.companyInfo.address) {
      const address = data.companyInfo.address;
      // Quebra endereço em múltiplas linhas se necessário
      const addressChunks = address.match(new RegExp(`.{1,${width}}`, 'g')) || [];
      addressChunks.forEach(chunk => {
        content += center(chunk, width) + '\n';
      });
    }
  }

  content += '\n';
  content += line(width) + '\n';

  // Dados do Pagamento
  content += '\n';
  content += 'DADOS DO PAGAMENTO\n';
  content += line(width) + '\n';
  content += `Data: ${paymentDateStr} ${paymentTimeStr}\n`;
  content += `Metodo: ${getPaymentMethodLabel(data.payment.paymentMethod)}\n`;
  content += `Valor Pago: ${formatCurrency(data.payment.amount)}\n`;
  
  if (data.payment.sellerName) {
    content += `Recebido por: ${data.payment.sellerName}\n`;
  }
  
  if (data.payment.notes) {
    content += `Observacao: ${data.payment.notes}\n`;
  }

  content += '\n';
  content += line(width) + '\n';

  // Informações do Cliente
  if (data.customerInfo) {
    content += '\n';
    content += 'CLIENTE\n';
    content += line(width) + '\n';
    content += `Nome: ${data.customerInfo.name}\n`;
    
    if (data.customerInfo.cpfCnpj) {
      content += `CPF/CNPJ: ${data.customerInfo.cpfCnpj}\n`;
    }
    
    if (data.customerInfo.phone) {
      content += `Telefone: ${data.customerInfo.phone}\n`;
    }
    
    content += '\n';
    content += line(width) + '\n';
  }

  // Informações da Parcela
  content += '\n';
  content += 'PARCELA\n';
  content += line(width) + '\n';
  content += `Referencia: ${data.installment.installmentNumber}/${data.installment.totalInstallments}\n`;
  content += `Valor: ${formatCurrency(originalAmount)}\n`;
  content += `Ja pago: ${formatCurrency(paidAmount)}\n`;
  content += `Pago agora: ${formatCurrency(data.payment.amount)}\n`;
  content += `Saldo da parcela: ${formatCurrency(remainingAfterPayment)}\n`;

  content += '\n';
  content += line(width) + '\n';

  // Débito total do cliente
  content += '\n';
  content += 'DEBITOS DO CLIENTE\n';
  content += line(width) + '\n';
  
  if (data.customerTotalAfterPayment !== null && data.customerTotalAfterPayment !== undefined) {
    content += `Total em aberto: ${formatCurrency(data.customerTotalAfterPayment)}\n`;
  } else {
    content += 'Total em aberto: Nao disponivel\n';
  }

  content += '\n';
  content += line(width) + '\n';

  // Resumo da Venda
  if (data.installment.sale) {
    content += '\n';
    content += 'RESUMO DA VENDA\n';
    content += line(width) + '\n';
    content += `Data: ${saleDateText}\n`;
    content += `Total: ${formatCurrency(saleTotal)}\n`;
    content += '\n';
    content += line(width) + '\n';
  }

  // Rodapé
  content += '\n';
  content += center('Documento nao fiscal', width) + '\n';
  content += center('Obrigado pela preferencia!', width) + '\n';
  content += '\n';
  content += center('🚀SISTEMA MONTSHOP! 🚀', width) + '\n';
  content += center('sistemamontshop.com', width) + '\n';
  content += '\n';

  return content;  
}
