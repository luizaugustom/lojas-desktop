import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { handleApiError } from '../../lib/handleApiError';
import { saleApi, sellerApi, companyApi, storeCreditApi } from '../../lib/api-endpoints';
import { saleSchema } from '../../lib/validations';
import { formatCurrency, calculateChange, calculateMultiplePaymentChange, isValidId, validateUUID } from '../../lib/utils-clean';
import { useCartStore } from '../../store/cart-store';
import { InstallmentSaleModal } from './installment-sale-modal';
import { CreditCardInstallmentModal } from './credit-card-installment-modal';
import { PrintConfirmationDialog } from './print-confirmation-dialog';
import { CustomerCopyConfirmationDialog } from './customer-copy-confirmation-dialog';
import { BilletPrintConfirmationDialog } from './billet-print-confirmation-dialog';
import { StoreCreditVoucherConfirmationDialog } from './store-credit-voucher-confirmation-dialog';
import { InstallmentBilletViewer } from '../installments/installment-billet-viewer';
import { useAuth } from '../../contexts/AuthContext';
import { printContent as printContentService } from '../../lib/print-service';
import { AcquirerCnpjSelect } from '../ui/acquirer-cnpj-select';
import { CardBrandSelect } from '../ui/card-brand-select';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { CreateSaleDto, PaymentMethod, PaymentMethodDetail, InstallmentData, Seller } from '../../types';

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'installment', label: 'A prazo' },
];

export function CheckoutDialog({ open, onClose }: CheckoutDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentMethodDetail[]>([]);
  const [paymentInputValues, setPaymentInputValues] = useState<Record<number, string>>({});
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [installmentData, setInstallmentData] = useState<InstallmentData | null>(null);
  const [showCreditCardInstallmentModal, setShowCreditCardInstallmentModal] = useState(false);
  const [creditCardInstallmentPaymentIndex, setCreditCardInstallmentPaymentIndex] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [selectedCustomerCpfCnpj, setSelectedCustomerCpfCnpj] = useState<string>('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [showPrintConfirmation, setShowPrintConfirmation] = useState(false);
  const [showCustomerCopyConfirmation, setShowCustomerCopyConfirmation] = useState(false);
  const [createdSaleId, setCreatedSaleId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [hasValidFiscalConfig, setHasValidFiscalConfig] = useState<boolean | null>(null);
  const [loadingFiscalConfig, setLoadingFiscalConfig] = useState(false);
  const [companyConfig, setCompanyConfig] = useState<{ maxInstallments?: number }>({ maxInstallments: 12 });
  // Cache do conteúdo de impressão para reimpressão
  const [cachedPrintContent, setCachedPrintContent] = useState<{ content: string | { storeCopy: string; customerCopy: string; isInstallmentSale: boolean }; type: string } | null>(null);
  const [currentPrintType, setCurrentPrintType] = useState<string | null>(null);
  const [customerCopyContent, setCustomerCopyContent] = useState<string | null>(null);
  // Boletos PDF
  const [billetsPdf, setBilletsPdf] = useState<string | null>(null);
  const [showBillets, setShowBillets] = useState(false);
  const [showBilletPrintConfirmation, setShowBilletPrintConfirmation] = useState(false);
  const [pendingPrintContent, setPendingPrintContent] = useState<{
    content: any;
    type: string;
  } | null>(null);
  // Store credit
  const [storeCreditBalance, setStoreCreditBalance] = useState<number>(0);
  const [storeCreditCustomerId, setStoreCreditCustomerId] = useState<string | null>(null);
  const [loadingStoreCredit, setLoadingStoreCredit] = useState(false);
  const [useStoreCredit, setUseStoreCredit] = useState(false);
  const [storeCreditAmount, setStoreCreditAmount] = useState<number>(0);
  const [showStoreCreditVoucherConfirmation, setShowStoreCreditVoucherConfirmation] = useState(false);
  const [pendingCreditVoucherData, setPendingCreditVoucherData] = useState<{
    creditUsed: number;
    remainingBalance: number;
    customerId: string;
  } | null>(null);
  const { items, discount, getTotal, getSubtotal, clearCart } = useCartStore();
  const { user, isAuthenticated, api } = useAuth();

  const baseTotal = getTotal();
  // Calcular crédito disponível para aplicar como desconto
  const creditToApply = useStoreCredit && storeCreditCustomerId && storeCreditBalance > 0
    ? Math.min(storeCreditBalance, baseTotal) // Não pode passar o valor total
    : 0;
  const total = Math.round((baseTotal - creditToApply + Number.EPSILON) * 100) / 100; // Total com desconto de crédito
  const isCompany = user?.role === 'empresa';

  // Carregar configuração da empresa
  const loadCompanyConfig = async () => {
    if (!isCompany) return;
    
    try {
      const response = await companyApi.myCompany();
      setCompanyConfig({
        maxInstallments: response.data?.maxInstallments ?? 12,
      });
    } catch (error) {
      console.error('Erro ao carregar configuração da empresa:', error);
      setCompanyConfig({ maxInstallments: 12 });
    }
  };

  useEffect(() => {
    if (open && isCompany) {
      loadSellers();
      checkFiscalConfig();
      loadCompanyConfig();
    }
  }, [open, isCompany]);

  const checkFiscalConfig = async () => {
    if (!isCompany) return;
    
    setLoadingFiscalConfig(true);
    try {
      const response = await companyApi.hasValidFiscalConfig();
      setHasValidFiscalConfig(response.data?.hasValidConfig ?? false);
    } catch (error) {
      console.error('Erro ao verificar configuração fiscal:', error);
      setHasValidFiscalConfig(false);
    } finally {
      setLoadingFiscalConfig(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setPaymentDetails([]);
      setPaymentInputValues({});
      setShowInstallmentModal(false);
      setInstallmentData(null);
      setShowCreditCardInstallmentModal(false);
      setCreditCardInstallmentPaymentIndex(null);
      setSelectedCustomerId('');
      setSelectedSellerId('');
      setShowPrintConfirmation(false);
      setCreatedSaleId(null);
      setPrinting(false);
      // Limpar cache de impressão após finalizar
      setCachedPrintContent(null);
      setCurrentPrintType(null);
      // Resetar crédito
      setStoreCreditBalance(0);
      setStoreCreditCustomerId(null);
      setUseStoreCredit(false);
      setStoreCreditAmount(0);
      // Resetar boletos
      setBilletsPdf(null);
      setShowBillets(false);
      setShowBilletPrintConfirmation(false);
      setPendingPrintContent(null);
    }
  }, [open]);

  // Buscar saldo de crédito quando CPF/CNPJ for informado
  useEffect(() => {
    const cpfCnpj = selectedCustomerCpfCnpj?.trim().replace(/\D/g, '');
    if (cpfCnpj && cpfCnpj.length >= 11) {
      loadStoreCreditBalance(cpfCnpj);
    } else {
      setStoreCreditBalance(0);
      setStoreCreditCustomerId(null);
      setUseStoreCredit(false);
      setStoreCreditAmount(0);
    }
  }, [selectedCustomerCpfCnpj]);

  const loadStoreCreditBalance = async (cpfCnpj: string) => {
    setLoadingStoreCredit(true);
    try {
      const response = await storeCreditApi.getBalanceByCpfCnpj(cpfCnpj);
      const balance = response.data;
      if (balance && balance.balance > 0) {
        setStoreCreditBalance(balance.balance);
        setStoreCreditCustomerId(balance.customerId);
      } else {
        setStoreCreditBalance(0);
        setStoreCreditCustomerId(null);
      }
    } catch (error) {
      // Cliente não encontrado ou sem crédito - não é erro
      setStoreCreditBalance(0);
      setStoreCreditCustomerId(null);
    } finally {
      setLoadingStoreCredit(false);
    }
  };

  const cachePrintPayload = (content: string, type: string = 'nfce') => {
    setCachedPrintContent({
      content,
      type,
    });
    setCurrentPrintType(type);
  };

  const getPrintLabel = (type: string | null | undefined) => {
    if (type === 'non-fiscal') {
      return 'Cupom não fiscal';
    }
    return 'NFC-e';
  };

  const loadSellers = async () => {
    if (!isCompany) return;
    
    setLoadingSellers(true);
    try {
      const response = await sellerApi.list({ 
        companyId: (user?.companyId ?? undefined) 
      });
      
      const sellersData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data 
        ? response.data.data 
        : response.data?.sellers 
        ? response.data.sellers 
        : response.data 
        ? [response.data] 
        : [];
      
      const validSellers = sellersData.filter((seller: Seller) => {
        const isValid = isValidId(seller.id);
        if (!isValid) {
          console.error('[Checkout] Vendedor com ID inválido ignorado:', {
            sellerId: seller.id,
            sellerName: seller.name
          });
        }
        return isValid;
      });
      
      if (validSellers.length === 0 && sellersData.length > 0) {
        console.error('[Checkout] ERRO: Todos os vendedores têm IDs inválidos!');
        toast.error('Erro: vendedores com IDs inválidos. Contate o suporte.');
      }
      
      setSellers(validSellers);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
      toast.error('Erro ao carregar lista de vendedores');
      setSellers([]);
    } finally {
      setLoadingSellers(false);
    }
  };

  const addPaymentMethod = () => {
    const remaining = getRemainingAmount();
    const defaultAmount = remaining > 0 ? remaining : 0;
    const newIndex = paymentDetails.length;
    setPaymentDetails([...paymentDetails, { method: 'cash', amount: defaultAmount }]);
    setPaymentInputValues({ ...paymentInputValues, [newIndex]: defaultAmount > 0 ? defaultAmount.toString().replace('.', ',') : '' });
  };

  const removePaymentMethod = (index: number) => {
    setPaymentDetails(paymentDetails.filter((_, i) => i !== index));
    const newInputValues = { ...paymentInputValues };
    delete newInputValues[index];
    const reindexed: Record<number, string> = {};
    Object.keys(newInputValues).forEach((key) => {
      const oldIndex = Number(key);
      if (oldIndex > index) {
        reindexed[oldIndex - 1] = newInputValues[oldIndex];
      } else if (oldIndex < index) {
        reindexed[oldIndex] = newInputValues[oldIndex];
      }
    });
    setPaymentInputValues(reindexed);
  };

  const updatePaymentMethod = <K extends keyof PaymentMethodDetail>(
    index: number,
    field: K,
    value: PaymentMethodDetail[K],
  ) => {
    setPaymentDetails((prev) => {
      const updated = [...prev];
      if (field === 'amount') {
        const numericValue = typeof value === 'number' ? value : Number(value);
        updated[index] = { ...updated[index], amount: numericValue };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const getTotalPaid = () => {
    return paymentDetails.reduce((sum, payment) => sum + Number(payment.amount), 0);
  };

  const getRemainingAmount = () => {
    return total - getTotalPaid();
  };

  const getCashChange = () => {
    const cashPayment = paymentDetails.find(p => p.method === 'cash');
    if (!cashPayment) return 0;
    return Math.max(0, cashPayment.amount - total);
  };

  const hasInstallmentPayment = () => {
    return paymentDetails.some(payment => payment.method === 'installment');
  };

  const handleInstallmentConfirm = (customerId: string, data: InstallmentData, customerInfo?: { name: string; cpfCnpj?: string }) => {
    setSelectedCustomerId(customerId);
    setInstallmentData(data);
    setShowInstallmentModal(false);
    if (customerInfo) {
      setSelectedCustomerName(customerInfo.name || '');
      setSelectedCustomerCpfCnpj(customerInfo.cpfCnpj || '');
      setValue('clientName', customerInfo.name || '');
      setValue('clientCpfCnpj', customerInfo.cpfCnpj || '');
    }
    
    const remainingAmount = getRemainingAmount();
    const installmentPayment: PaymentMethodDetail = {
      method: 'installment',
      amount: remainingAmount > 0 ? remainingAmount : 0,
    };
    
    const existingInstallmentIndex = paymentDetails.findIndex(p => p.method === 'installment');
    if (existingInstallmentIndex >= 0) {
      const updated = [...paymentDetails];
      updated[existingInstallmentIndex] = installmentPayment;
      setPaymentDetails(updated);
      setPaymentInputValues({ 
        ...paymentInputValues, 
        [existingInstallmentIndex]: remainingAmount > 0 ? remainingAmount.toString().replace('.', ',') : '' 
      });
    } else {
      const newIndex = paymentDetails.length;
      setPaymentDetails([...paymentDetails, installmentPayment]);
      setPaymentInputValues({ 
        ...paymentInputValues, 
        [newIndex]: remainingAmount > 0 ? remainingAmount.toString().replace('.', ',') : '' 
      });
    }
    
    toast.success(`Venda a prazo configurada para ${data.installments}x de ${formatCurrency(data.installmentValue)}`);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<{ clientName?: string; clientCpfCnpj?: string }>({});

  const watchedCpfCnpj = watch('clientCpfCnpj');
  
  // Atualizar selectedCustomerCpfCnpj quando o valor do formulário mudar
  useEffect(() => {
    if (watchedCpfCnpj !== selectedCustomerCpfCnpj) {
      setSelectedCustomerCpfCnpj(watchedCpfCnpj || '');
    }
  }, [watchedCpfCnpj]);

  // Atalhos de teclado para checkout
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Enter',
        handler: () => {
          if (!showInstallmentModal && !showCreditCardInstallmentModal && !loading && paymentDetails.length > 0) {
            const formData = { clientName: watch('clientName'), clientCpfCnpj: watch('clientCpfCnpj') };
            handleSubmit(onSubmit)(formData as any).catch(() => {});
          }
        },
        context: ['checkout'],
        preventDefault: false,
      },
      {
        key: 'Escape',
        handler: () => {
          if (!showInstallmentModal && !showCreditCardInstallmentModal && !showPrintConfirmation && !showCustomerCopyConfirmation && !showBilletPrintConfirmation && !showStoreCreditVoucherConfirmation) {
            onClose();
          }
        },
        context: ['checkout'],
      },
      {
        key: 'a',
        ctrl: true,
        handler: () => {
          if (!showInstallmentModal && !showCreditCardInstallmentModal && !loading) {
            addPaymentMethod();
          }
        },
        context: ['checkout'],
      },
      {
        key: '1',
        handler: () => {
          if (paymentDetails.length === 0 && !showInstallmentModal && !showCreditCardInstallmentModal && !loading) {
            addPaymentMethod();
            setTimeout(() => {
              updatePaymentMethod(0, 'method', 'cash');
            }, 0);
          }
        },
        context: ['checkout'],
      },
      {
        key: '2',
        handler: () => {
          if (paymentDetails.length === 0 && !showInstallmentModal && !showCreditCardInstallmentModal && !loading) {
            addPaymentMethod();
            setTimeout(() => {
              updatePaymentMethod(0, 'method', 'credit_card');
            }, 0);
          }
        },
        context: ['checkout'],
      },
      {
        key: '3',
        handler: () => {
          if (paymentDetails.length === 0 && !showInstallmentModal && !showCreditCardInstallmentModal && !loading) {
            addPaymentMethod();
            setTimeout(() => {
              updatePaymentMethod(0, 'method', 'debit_card');
            }, 0);
          }
        },
        context: ['checkout'],
      },
      {
        key: '4',
        handler: () => {
          if (paymentDetails.length === 0 && !showInstallmentModal && !showCreditCardInstallmentModal && !loading) {
            addPaymentMethod();
            setTimeout(() => {
              updatePaymentMethod(0, 'method', 'pix');
            }, 0);
          }
        },
        context: ['checkout'],
      },
      {
        key: '5',
        handler: () => {
          if (paymentDetails.length === 0 && !showInstallmentModal && !showCreditCardInstallmentModal && !loading && (companyConfig.maxInstallments ?? 12) > 0) {
            addPaymentMethod();
            setTimeout(() => {
              updatePaymentMethod(0, 'method', 'installment');
              setShowInstallmentModal(true);
            }, 0);
          }
        },
        context: ['checkout'],
      },
    ],
    enabled: open && !showPrintConfirmation && !showCustomerCopyConfirmation && !showBilletPrintConfirmation && !showStoreCreditVoucherConfirmation,
    context: 'checkout',
    ignoreInputs: false,
  });

  const handlePrintConfirm = async () => {
    if (!createdSaleId) return;
    
    setPrinting(true);
    let printLabel = 'NFC-e';
    try {
      let printContent: string | { storeCopy: string; customerCopy: string; isInstallmentSale: boolean } | null = null;
      let printType: string = 'nfce';

      // Primeiro, tentar usar conteúdo em cache se disponível
      if (cachedPrintContent?.content) {
        console.log('[Checkout] Usando conteúdo de impressão em cache');
        // Se o conteúdo é uma string, pode ser JSON que precisa ser parseado
        if (typeof cachedPrintContent.content === 'string') {
          try {
            const parsed = JSON.parse(cachedPrintContent.content);
            if (typeof parsed === 'object' && 'isInstallmentSale' in parsed) {
              printContent = parsed;
            } else {
              printContent = cachedPrintContent.content;
            }
          } catch {
            // Não é JSON, usar como string
            printContent = cachedPrintContent.content;
          }
        } else {
          printContent = cachedPrintContent.content;
        }
        printType = cachedPrintContent.type || 'nfce';
        setCurrentPrintType(printType);
      } else {
        // Se não tem cache, buscar do backend
        console.log('[Checkout] Buscando conteúdo de impressão do backend');
        const response = await saleApi.getPrintContent(createdSaleId);
        const responseData = response.data?.data || response.data;
        
        if (responseData?.content) {
          printContent = responseData.content;
          printType = responseData.printType || 'nfce';
          
          // Armazenar em cache para futuras reimpressões
          if (printContent) {
            cachePrintPayload(typeof printContent === 'string' ? printContent : JSON.stringify(printContent), printType);
          }
        } else {
          // Fallback: tentar reprint que retorna conteúdo
          const reprintResponse = await saleApi.reprint(createdSaleId);
          const reprintData = reprintResponse.data?.data || reprintResponse.data;
          
          if (reprintData?.printContent) {
            printContent = reprintData.printContent;
            printType = reprintData.printType || 'nfce';
            
            if (printContent) {
              cachePrintPayload(typeof printContent === 'string' ? printContent : JSON.stringify(printContent), printType);
            }
          }
        }
      }

      setCurrentPrintType(printType);
      printLabel = getPrintLabel(printType);

      // Verificar se é venda a prazo com vias separadas
      if (printContent && typeof printContent === 'object' && 'isInstallmentSale' in printContent) {
        // Venda a prazo - imprimir primeiro a via da loja
        console.log('[Checkout] Venda a prazo detectada, imprimindo via da loja...');
        const printResult = await printContentService(printContent.storeCopy);
        
        if (printResult.success) {
          toast.success('Via da loja enviada para impressão!');
          // Armazenar conteúdo da via do cliente e mostrar modal de confirmação
          setCustomerCopyContent(printContent.customerCopy);
          setShowPrintConfirmation(false);
          setShowCustomerCopyConfirmation(true);
        } else {
          toast.error(`Impressão local da via da loja falhou: ${printResult.error}. Tentando impressão no servidor...`);
          
          // Se falhar localmente, tentar no servidor como fallback
          try {
            await saleApi.reprint(createdSaleId);
            toast.success('Via da loja enviada para impressão no servidor!');
            setShowPrintConfirmation(false);
            setShowCustomerCopyConfirmation(true);
          } catch (serverError) {
            console.error('[Checkout] Erro ao imprimir no servidor:', serverError);
            handlePrintComplete();
          }
        }
      } else if (printContent && typeof printContent === 'string') {
        // Venda normal - imprimir normalmente
        console.log('[Checkout] Imprimindo localmente...');
        const printResult = await printContentService(printContent);
        
        if (printResult.success) {
          toast.success(`${printLabel} enviada para impressão!`);
          handlePrintComplete();
        } else {
          const printLabelLower = printLabel.toLowerCase();
          toast.error(`Impressão local do ${printLabelLower} falhou: ${printResult.error}. Tentando impressão no servidor...`);
          
          // Se falhar localmente, tentar no servidor como fallback
          try {
            await saleApi.reprint(createdSaleId);
            toast.success(`${printLabel} enviada para impressão no servidor!`);
            handlePrintComplete();
          } catch (serverError) {
            console.error('[Checkout] Erro ao imprimir no servidor:', serverError);
            handlePrintComplete();
          }
        }
      } else {
        // Se não conseguiu conteúdo, tentar impressão no servidor diretamente
        console.log('[Checkout] Sem conteúdo local, tentando impressão no servidor...');
        await saleApi.reprint(createdSaleId);
        toast.success(`${printLabel} enviada para impressão!`);
        handlePrintComplete();
      }
    } catch (error: any) {
      console.error(`[Checkout] Erro ao imprimir ${printLabel}:`, error);
      
      // Extrai mensagem de erro detalhada do backend
      let errorMessage = `Erro ao imprimir ${printLabel}`;
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Exibe mensagem de erro detalhada
      toast.error(errorMessage, {
        duration: 6000, // Mostra por mais tempo para o usuário ler
      });
      
      handlePrintComplete();
    } finally {
      setPrinting(false);
    }
  };

  const handleCustomerCopyConfirm = async () => {
    if (!customerCopyContent) return;
    
    setPrinting(true);
    try {
      console.log('[Checkout] Imprimindo via do cliente...');
      const printResult = await printContentService(customerCopyContent);
      
      if (printResult.success) {
        toast.success('Via do cliente enviada para impressão!');
      } else {
        toast.error(`Impressão local da via do cliente falhou: ${printResult.error}`, {
          icon: '⚠️',
          duration: 5000,
        });
      }
      
      handlePrintComplete();
    } catch (error: any) {
      console.error('[Checkout] Erro ao imprimir via do cliente:', error);
      toast.error('Erro ao imprimir via do cliente');
      handlePrintComplete();
    } finally {
      setPrinting(false);
      setShowCustomerCopyConfirmation(false);
      setCustomerCopyContent(null);
    }
  };

  const handleCustomerCopyCancel = () => {
    toast.success('Venda registrada. Via do cliente não foi impressa.');
    handlePrintComplete();
  };

  const handlePrintCancel = () => {
    toast.success('Venda registrada sem impressão');
    handlePrintComplete();
  };

  const handleBilletPrintConfirm = () => {
    setShowBilletPrintConfirmation(false);
    setShowBillets(true);
  };

  const handleBilletPrintCancel = () => {
    setShowBilletPrintConfirmation(false);
    // Se houver printContent pendente, mostrar modal de confirmação de NFCe/cupom
    if (pendingPrintContent) {
      const contentToCache = typeof pendingPrintContent.content === 'object' 
        ? JSON.stringify(pendingPrintContent.content) 
        : pendingPrintContent.content;
      cachePrintPayload(contentToCache, pendingPrintContent.type);
      setCachedPrintContent(pendingPrintContent);
      setCurrentPrintType(pendingPrintContent.type);
      setShowPrintConfirmation(true);
      setPendingPrintContent(null);
    } else {
      handlePrintComplete();
    }
  };

  const handleBilletsClose = () => {
    setShowBillets(false);
    // Se houver printContent pendente, mostrar modal de confirmação de NFCe/cupom
    if (pendingPrintContent) {
      const contentToCache = typeof pendingPrintContent.content === 'object' 
        ? JSON.stringify(pendingPrintContent.content) 
        : pendingPrintContent.content;
      cachePrintPayload(contentToCache, pendingPrintContent.type);
      setCachedPrintContent(pendingPrintContent);
      setCurrentPrintType(pendingPrintContent.type);
      setShowPrintConfirmation(true);
      setPendingPrintContent(null);
    } else {
      handlePrintComplete();
    }
  };

  const handleStoreCreditVoucherConfirm = async () => {
    if (!pendingCreditVoucherData) return;
    
    setPrinting(true);
    try {
      const voucherResponse = await storeCreditApi.printRemainingBalanceVoucher({
        customerId: pendingCreditVoucherData.customerId,
        amountUsed: pendingCreditVoucherData.creditUsed,
      });
      
      const voucherData = voucherResponse.data;
      
      // Usar sistema de impressão padrão (printContentService)
      if (voucherData.content && typeof window !== 'undefined' && window.electronAPI?.printers) {
        const printResult = await printContentService(voucherData.content);
        
        if (printResult.success) {
          toast.success('Comprovante de saldo restante impresso com sucesso!');
        } else {
          throw new Error(printResult.error || 'Erro ao imprimir');
        }
      } else {
        toast.success('Comprovante de saldo restante enviado para impressão!');
      }
    } catch (voucherError: any) {
      console.error('[Checkout] Erro ao imprimir comprovante de saldo restante:', voucherError);
      toast.error('Erro ao imprimir comprovante. Você pode imprimi-lo depois.');
    } finally {
      setPrinting(false);
      setShowStoreCreditVoucherConfirmation(false);
      setPendingCreditVoucherData(null);
      
      // Após imprimir comprovante de crédito, verificar se há conteúdo de impressão pendente
      if (billetsPdf) {
        setShowBilletPrintConfirmation(true);
      } else if (pendingPrintContent) {
        const contentToCache = typeof pendingPrintContent.content === 'object' 
          ? JSON.stringify(pendingPrintContent.content) 
          : pendingPrintContent.content;
        cachePrintPayload(contentToCache, pendingPrintContent.type);
        setCachedPrintContent(pendingPrintContent);
        setCurrentPrintType(pendingPrintContent.type);
        setShowPrintConfirmation(true);
        setPendingPrintContent(null);
      } else {
        handlePrintComplete();
      }
    }
  };

  const handleStoreCreditVoucherCancel = () => {
    setShowStoreCreditVoucherConfirmation(false);
    setPendingCreditVoucherData(null);
    
    // Após fechar modal de crédito, verificar se há conteúdo de impressão pendente
    if (billetsPdf) {
      setShowBilletPrintConfirmation(true);
    } else if (pendingPrintContent) {
      const contentToCache = typeof pendingPrintContent.content === 'object' 
        ? JSON.stringify(pendingPrintContent.content) 
        : pendingPrintContent.content;
      cachePrintPayload(contentToCache, pendingPrintContent.type);
      setCachedPrintContent(pendingPrintContent);
      setCurrentPrintType(pendingPrintContent.type);
      setShowPrintConfirmation(true);
      setPendingPrintContent(null);
    } else {
      handlePrintComplete();
    }
  };

  const handlePrintComplete = () => {
    clearCart();
    reset();
    setPaymentDetails([]);
    setInstallmentData(null);
    setSelectedCustomerId('');
    setShowPrintConfirmation(false);
    setShowCustomerCopyConfirmation(false);
    setShowBilletPrintConfirmation(false);
    setShowStoreCreditVoucherConfirmation(false);
    setCreatedSaleId(null);
    setCachedPrintContent(null);
    setCurrentPrintType(null);
    setCustomerCopyContent(null);
    setPendingPrintContent(null);
    setPendingCreditVoucherData(null);
    onClose();
  };

  const onSubmit = async (data: { clientName?: string; clientCpfCnpj?: string }) => {
    console.log('[Checkout] Iniciando finalização de venda...');
    
    for (const [index, item] of items.entries()) {
      const isValid = isValidId(item.product.id);
      console.log(`[Checkout] Item ${index}: ${item.product.name}`, {
        productId: item.product.id,
        isValidId: isValid
      });
      
      if (!isValid) {
        toast.error(`Produto "${item.product.name}" tem ID inválido. Remova-o do carrinho e adicione novamente.`);
        return;
      }
    }
    
    if (paymentDetails.length === 0) {
      toast.error('Adicione pelo menos um método de pagamento!');
      return;
    }

    const hasInstallment = hasInstallmentPayment();
    if (hasInstallment) {
      if (!installmentData || !selectedCustomerId) {
        toast.error('Complete a configuração da venda a prazo (cliente, parcelas e vencimento).');
        return;
      }
      if (!data.clientName || data.clientName.trim().length === 0) {
        toast.error('Nome do cliente é obrigatório para vendas a prazo.');
        return;
      }
    }

    // O crédito já foi aplicado como desconto no total (calculado acima)
    // Agora só validar métodos de pagamento contra o total já com desconto
    const totalPaid = paymentDetails.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const remainingAmount = total - totalPaid;
    
    // O crédito a usar é o que foi aplicado como desconto
    const creditToUse = creditToApply;

    // Se crédito cobre tudo, não exigir métodos de pagamento
    if (creditToUse >= baseTotal - 0.01) {
      // Permitir venda apenas com crédito - não precisa validar métodos de pagamento
    } else {
      // Filtrar métodos com valor zero antes de validar
      const validPaymentDetails = paymentDetails.filter(p => Number(p.amount) >= 0.01);
      
      if (validPaymentDetails.length === 0) {
        toast.error('Adicione pelo menos um método de pagamento ou use crédito em loja suficiente para cobrir a venda!');
        return;
      }
      
      if (validPaymentDetails.length !== paymentDetails.length) {
        setPaymentDetails(validPaymentDetails);
        const newInputValues: Record<number, string> = {};
        validPaymentDetails.forEach((_, idx) => {
          const originalIdx = paymentDetails.findIndex(p => 
            p.method === validPaymentDetails[idx].method && 
            Math.abs(p.amount - validPaymentDetails[idx].amount) < 0.01
          );
          if (originalIdx >= 0 && paymentInputValues[originalIdx] !== undefined) {
            newInputValues[idx] = paymentInputValues[originalIdx];
          }
        });
        setPaymentInputValues(newInputValues);
        toast('Métodos de pagamento com valor zero foram removidos automaticamente.', {
          icon: 'ℹ️',
          duration: 3000,
        });
        return;
      }

      // Validar se o valor pago é suficiente (o crédito já foi aplicado como desconto no total)
      if (remainingAmount > 0.01) {
        const errorMsg = creditToUse > 0.01
          ? `Valor total dos pagamentos (${formatCurrency(totalPaid)}) deve ser pelo menos igual ao total da venda (${formatCurrency(total)} = ${formatCurrency(baseTotal)} - crédito ${formatCurrency(creditToUse)})!`
          : `Valor total dos pagamentos (${formatCurrency(totalPaid)}) deve ser pelo menos igual ao total da venda (${formatCurrency(total)})!`;
        toast.error(errorMsg);
        return;
      }
    }

    if (isCompany && !selectedSellerId) {
      toast.error('Selecione um vendedor para realizar a venda!');
      return;
    }

    setLoading(true);
    try {
      const saleData: CreateSaleDto = {
        items: items.map((item) => {
          try {
            validateUUID(item.product.id, `Produto ${item.product.name}`);
          } catch (error) {
            throw new Error(`Produto "${item.product.name}" tem ID inválido: ${item.product.id}`);
          }
          
          return {
            productId: item.product.id,
            quantity: item.quantity,
          };
        }),
        discount: discount > 0 ? Math.round((discount + Number.EPSILON) * 100) / 100 : undefined,
        paymentMethods: (creditToUse >= baseTotal - 0.01 ? [] : paymentDetails.filter(p => Number(p.amount) >= 0.01)).map((payment) => {
          const amount = Math.max(Number(payment.amount) || 0, 0.01);
          
          const paymentMethod: any = {
            method: payment.method,
            amount: amount,
          };
          
          if (payment.method === 'installment' && installmentData && selectedCustomerId) {
            paymentMethod.customerId = selectedCustomerId;
            paymentMethod.installments = installmentData.installments;
            paymentMethod.firstDueDate = installmentData.firstDueDate.toISOString();
            paymentMethod.description = installmentData.description || `Parcelado em ${installmentData.installments}x de ${formatCurrency(installmentData.installmentValue)}`;
            paymentMethod.additionalInfo = `Parcelado em ${installmentData.installments}x de ${formatCurrency(installmentData.installmentValue)}`;
          }
          
          // Adicionar dados do grupo Card (NT 2025.001) - Obrigatório para cartão
          if (payment.method === 'credit_card' || payment.method === 'debit_card') {
            // Sistema não tem máquinas integradas, sempre usar "2 - Pagamento Não Integrado"
            const cardIntegrationType = '2';
            
            // Verificar quais campos estão faltando para dar mensagem mais específica
            const missingFields: string[] = [];
            if (!payment.acquirerCnpj || payment.acquirerCnpj.replace(/\D/g, '').length !== 14) missingFields.push('CNPJ da Credenciadora');
            if (!payment.cardOperationType) missingFields.push('Tipo de Operação');
            
            // Validar installmentCount para crédito parcelado
            if (payment.cardOperationType === '02' && (!payment.installmentCount || payment.installmentCount < 2 || payment.installmentCount > 24)) {
              missingFields.push('Número de Parcelas (selecione o tipo de operação novamente)');
            }
            
            if (missingFields.length > 0) {
              toast.error(
                `Pagamento com ${payment.method === 'credit_card' ? 'cartão de crédito' : 'cartão de débito'} requer preenchimento completo dos dados do cartão (NT 2025.001). ` +
                `Campos faltando: ${missingFields.join(', ')}`,
                { duration: 6000 }
              );
              setLoading(false);
              return;
            }
            
            // Validar CNPJ da credenciadora (deve ter 14 dígitos)
            if (!payment.acquirerCnpj) {
              toast.error('CNPJ da credenciadora é obrigatório', { duration: 5000 });
              setLoading(false);
              return;
            }
            const cnpjCleaned = payment.acquirerCnpj.replace(/\D/g, '');
            if (cnpjCleaned.length !== 14) {
              toast.error('CNPJ da credenciadora deve ter exatamente 14 dígitos numéricos', { duration: 5000 });
              setLoading(false);
              return;
            }
            
            paymentMethod.cardIntegrationType = cardIntegrationType;
            paymentMethod.acquirerCnpj = cnpjCleaned;
            // Usar bandeira informada ou padrão '99' (Outras) se não informada
            paymentMethod.cardBrand = payment.cardBrand || '99';
            paymentMethod.cardOperationType = payment.cardOperationType;
            // Adicionar installmentCount se for crédito parcelado
            if (payment.cardOperationType === '02' && payment.installmentCount) {
              paymentMethod.installmentCount = payment.installmentCount;
            }
          }
          
          return paymentMethod;
        }),
        clientName: data.clientName,
        clientCpfCnpj: data.clientCpfCnpj,
        sellerId: selectedSellerId || undefined,
      };
      
      if (selectedSellerId) {
        try {
          validateUUID(selectedSellerId, 'Vendedor');
          console.log('[Checkout] SellerId válido:', selectedSellerId);
        } catch (error) {
          throw new Error(`Vendedor selecionado tem ID inválido: ${selectedSellerId}`);
        }
      }
      
      // Usar crédito se disponível e solicitado
      let creditUsed = 0;
      let remainingCreditBalance = 0;
      if (creditToUse > 0.01) {
        try {
          await storeCreditApi.use({
            customerId: storeCreditCustomerId!,
            amount: creditToUse,
            description: `Crédito utilizado na venda`,
          });
          
          creditUsed = creditToUse;
          remainingCreditBalance = storeCreditBalance - creditUsed;
          
          // Adicionar crédito como método de pagamento
          saleData.paymentMethods.push({
            method: 'store_credit',
            amount: Math.round((creditUsed + Number.EPSILON) * 100) / 100,
            additionalInfo: '',
          });
          
          toast.success(`Crédito de ${formatCurrency(creditUsed)} aplicado como desconto na venda`);
        } catch (error: any) {
          console.error('[Checkout] Erro ao usar crédito:', error);
          toast.error(error?.response?.data?.message || 'Erro ao usar crédito. A venda continuará sem crédito.');
          // Continuar com a venda mesmo se houver erro ao usar crédito
        }
      }
      
      console.log('[Checkout] Dados da venda (sem conversões):', {
        itemCount: saleData.items.length,
        paymentMethodsCount: saleData.paymentMethods.length,
        sellerId: saleData.sellerId,
        total: total,
        creditUsed: creditUsed
      });

      const response = await saleApi.create(saleData);
      
      // Extrair ID da venda e conteúdo de impressão da resposta
      const saleData_resp = response.data?.data || response.data;
      const saleId = saleData_resp?.id;
      const printContent = saleData_resp?.printContent;
      const printType = saleData_resp?.printType || 'nfce';
      const billetsPdfBase64 = saleData_resp?.billetsPdf;
      
      if (!saleId) {
        console.error('[Checkout] Venda criada mas ID não foi retornado:', response);
        toast.error('Venda criada, mas não foi possível obter o ID da venda');
        return;
      }
      
      console.log('[Checkout] Venda criada com sucesso:', saleId);
      toast.success('Venda realizada com sucesso!');
      
      setCreatedSaleId(saleId);

      // Se houver saldo restante de crédito, mostrar modal de confirmação PRIMEIRO
      if (creditUsed > 0 && remainingCreditBalance > 0.01 && storeCreditCustomerId) {
        // Armazenar dados de impressão para depois do modal de crédito
        if (billetsPdfBase64) {
          setBilletsPdf(billetsPdfBase64);
          if (printContent) {
            setPendingPrintContent({
              content: printContent,
              type: printType,
            });
          }
        } else if (printContent) {
          setPendingPrintContent({
            content: printContent,
            type: printType,
          });
        }
        
        // Mostrar modal de crédito primeiro
        setPendingCreditVoucherData({
          creditUsed,
          remainingBalance: remainingCreditBalance,
          customerId: storeCreditCustomerId,
        });
        setShowStoreCreditVoucherConfirmation(true);
        return; // Retornar para não mostrar outros modais ainda
      }

      // Se não houver crédito restante, seguir fluxo normal
      // Armazenar conteúdo de impressão em cache para reimpressão posterior
      if (printContent) {
        // Se for objeto, converter para JSON string para armazenar
        const contentToCache = typeof printContent === 'object' ? JSON.stringify(printContent) : printContent;
        cachePrintPayload(contentToCache, printType);
      }

      // Se houver boletos PDF, mostrar modal de confirmação primeiro
      if (billetsPdfBase64) {
        setBilletsPdf(billetsPdfBase64);
        
        // Se também houver printContent, armazenar para depois dos boletos
        if (printContent) {
          setPendingPrintContent({
            content: printContent,
            type: printType,
          });
        }
        
        // Mostrar modal de confirmação de boletos
        setShowBilletPrintConfirmation(true);
      } else if (printContent) {
        // Se não houver boletos mas houver printContent, mostrar modal de confirmação de NFCe/cupom
        setCachedPrintContent({
          content: printContent,
          type: printType,
        });
        setCurrentPrintType(printType);
        setShowPrintConfirmation(true);
      } else {
        // Sem conteúdo de impressão - apenas finalizar
        handlePrintComplete();
      }
    } catch (error) {
      console.error('[Checkout] Error details:', error);
      console.error('[Checkout] Error type:', typeof error);
      console.error('[Checkout] Error message:', error instanceof Error ? error.message : 'Unknown error');
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Finalizar Venda</DialogTitle>
            <DialogDescription>Complete as informações da venda</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {isCompany && hasValidFiscalConfig === false && (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                      Configuração Fiscal Incompleta
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      A empresa não possui configuração fiscal completa para emissão de NFCe. 
                      Será impresso um <strong>cupom não fiscal</strong> ao invés de uma NFCe válida. 
                      Configure os dados fiscais nas Configurações para emitir NFCe válida.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="clientName">Nome do Cliente (Opcional)</Label>
              <Input id="clientName" {...register('clientName')} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientCpfCnpj">CPF/CNPJ do Cliente (Opcional)</Label>
              <Input
                id="clientCpfCnpj"
                placeholder="000.000.000-00"
                {...register('clientCpfCnpj', {
                  onChange: (e) => {
                    setSelectedCustomerCpfCnpj(e.target.value);
                  },
                })}
                disabled={loading}
              />
              {loadingStoreCredit && (
                <p className="text-xs text-muted-foreground">Buscando saldo de crédito...</p>
              )}
              {!loadingStoreCredit && storeCreditBalance > 0 && (
                <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Crédito disponível:</span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(storeCreditBalance)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useStoreCredit"
                      checked={useStoreCredit}
                      onChange={(e) => setUseStoreCredit(e.target.checked)}
                      disabled={loading}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="useStoreCredit" className="text-sm cursor-pointer">
                      Usar crédito nesta venda
                    </Label>
                  </div>
                  {useStoreCredit && (
                    <p className="text-xs text-muted-foreground">
                      O crédito será aplicado como desconto no total da venda (máximo até o valor total).
                    </p>
                  )}
                </div>
              )}
            </div>

            {isCompany && (
              <div className="space-y-2">
                <Label htmlFor="seller">Vendedor *</Label>
                <Select
                  value={selectedSellerId}
                  onValueChange={setSelectedSellerId}
                  disabled={loading || loadingSellers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingSellers ? "Carregando vendedores..." : "Selecione um vendedor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.name} {seller.login && `(${seller.login})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sellers.length === 0 && !loadingSellers && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum vendedor cadastrado. Cadastre vendedores na seção de Vendedores.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Métodos de Pagamento</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPaymentMethod}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {paymentDetails.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum método de pagamento adicionado</p>
                  <p className="text-sm">Clique em "Adicionar" para incluir um método de pagamento</p>
                </div>
              )}

              {paymentDetails.map((payment, index) => (
                <div key={index}>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Select
                      value={payment.method}
                      onValueChange={(value: PaymentMethod) => {
                        if (value === 'installment') {
                          const remainingAmount = getRemainingAmount();
                          updatePaymentMethod(index, 'amount', remainingAmount > 0 ? remainingAmount : 0);
                          setPaymentInputValues({ 
                            ...paymentInputValues, 
                            [index]: remainingAmount > 0 ? remainingAmount.toString().replace('.', ',') : '' 
                          });
                          setShowInstallmentModal(true);
                        } else {
                          updatePaymentMethod(index, 'method', value);
                          
                          // Inicializar campos do grupo Card (NT 2025.001) quando método for cartão
                          if (value === 'credit_card' || value === 'debit_card') {
                            // Definir valores padrão para os campos do grupo Card
                            // Sistema não tem máquinas integradas, sempre usar "2 - Pagamento Não Integrado"
                            updatePaymentMethod(index, 'cardIntegrationType', '2');
                          const defaultCardOperationType = value === 'credit_card' ? '01' : '03';
                          updatePaymentMethod(index, 'cardOperationType', defaultCardOperationType);
                          updatePaymentMethod(index, 'installmentCount', undefined);
                          // Definir bandeira padrão '99' (Outras) se não estiver definida
                          if (!paymentDetails[index].cardBrand) {
                            updatePaymentMethod(index, 'cardBrand', '99');
                          }
                          } else {
                            // Limpar campos do grupo Card quando método não for cartão
                            updatePaymentMethod(index, 'cardIntegrationType', undefined);
                            updatePaymentMethod(index, 'acquirerCnpj', undefined);
                            updatePaymentMethod(index, 'cardBrand', undefined);
                            updatePaymentMethod(index, 'cardOperationType', undefined);
                            updatePaymentMethod(index, 'installmentCount', undefined);
                          }
                          
                          const currentAmount = paymentDetails[index].amount;
                          let newAmount = currentAmount;
                          let newInputValue = '';
                          
                          if (currentAmount < 0.01) {
                            const remainingAmount = getRemainingAmount();
                            newAmount = remainingAmount > 0 ? remainingAmount : 0;
                            newInputValue = newAmount > 0 ? newAmount.toString().replace('.', ',') : '';
                            
                            if (newAmount > 0) {
                              updatePaymentMethod(index, 'amount', newAmount);
                            } else {
                              removePaymentMethod(index);
                              return;
                            }
                          } else {
                            newInputValue = currentAmount > 0 ? currentAmount.toString().replace('.', ',') : '';
                          }
                          
                          setPaymentInputValues({ 
                            ...paymentInputValues, 
                            [index]: newInputValue 
                          });
                        }
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => {
                        // Desabilitar "A prazo" se maxInstallments for 0
                        const isDisabled = method.value === 'installment' && (companyConfig.maxInstallments ?? 12) === 0;
                        return (
                          <SelectItem 
                            key={method.value} 
                            value={method.value}
                            disabled={isDisabled}
                          >
                            {method.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="0,00"
                      value={paymentInputValues[index] !== undefined ? paymentInputValues[index] : (payment.amount > 0 ? payment.amount.toString().replace('.', ',') : '')}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        let cleaned = inputValue.replace(/,/g, '.');
                        cleaned = cleaned.replace(/[^0-9.]/g, '');
                        
                        const parts = cleaned.split('.');
                        if (parts.length > 2) {
                          cleaned = parts[0] + '.' + parts.slice(1).join('');
                        }
                        
                        setPaymentInputValues({ ...paymentInputValues, [index]: cleaned.replace('.', ',') });
                        
                        const numericValue = cleaned === '' || cleaned === '.' ? 0 : parseFloat(cleaned) || 0;
                        updatePaymentMethod(index, 'amount', numericValue);
                      }}
                      onBlur={() => {
                        // Ao perder o foco, formatar o valor se houver; manter vazio se o usuário apagou
                        const currentValue = paymentInputValues[index] || '';
                        const numericValue = currentValue === '' || currentValue === ',' ? 0 : parseFloat(currentValue.replace(',', '.')) || 0;
                        setPaymentInputValues({ ...paymentInputValues, [index]: currentValue === '' || currentValue === ',' ? '' : (numericValue > 0 ? numericValue.toString().replace('.', ',') : '') });
                        updatePaymentMethod(index, 'amount', numericValue);
                      }}
                      disabled={loading}
                      className="no-spinner"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removePaymentMethod(index)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Campos do Grupo Card (NT 2025.001) - Obrigatório para pagamentos com cartão */}
                {(payment.method === 'credit_card' || payment.method === 'debit_card') && (
                  <div className="ml-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                        Dados do Cartão (NT 2025.001)
                      </Label>
                    </div>
                    
                    <div className="space-y-3">
                      <CardBrandSelect
                        id={`cardBrand-${index}`}
                        value={(payment.cardBrand as '01' | '02' | '03' | '04' | '05' | '99') || '99'}
                        onChange={(value) => updatePaymentMethod(index, 'cardBrand', value)}
                        disabled={loading}
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`acquirerCnpj-${index}`} className="text-xs">
                            CNPJ da Credenciadora *
                          </Label>
                          <AcquirerCnpjSelect
                            id={`acquirerCnpj-${index}`}
                            value={payment.acquirerCnpj || ''}
                            onChange={(value) => updatePaymentMethod(index, 'acquirerCnpj', value)}
                            disabled={loading}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor={`cardOperationType-${index}`} className="text-xs">
                            Tipo de Operação *
                          </Label>
                          <Select
                            value={payment.cardOperationType || (payment.method === 'credit_card' ? '01' : '03')}
                            onValueChange={(value) => {
                              updatePaymentMethod(index, 'cardOperationType', value);
                              // Se selecionou crédito parcelado, abrir modal
                              if (value === '02') {
                                setCreditCardInstallmentPaymentIndex(index);
                                setShowCreditCardInstallmentModal(true);
                              } else {
                                // Limpar installmentCount se mudou de parcelado
                                updatePaymentMethod(index, 'installmentCount', undefined);
                              }
                            }}
                            disabled={loading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="01">01 - Crédito à Vista</SelectItem>
                              <SelectItem value="02">02 - Crédito Parcelado</SelectItem>
                              <SelectItem value="03">03 - Débito</SelectItem>
                            </SelectContent>
                          </Select>
                          {payment.cardOperationType === '02' && payment.installmentCount && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Parcelado em {payment.installmentCount}x de {formatCurrency(payment.amount / payment.installmentCount)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(getSubtotal())}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {creditToApply > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Crédito em Loja:</span>
                  <span>-{formatCurrency(creditToApply)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span>Total da Venda:</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pago:</span>
                <span className="font-bold">{formatCurrency(getTotalPaid())}</span>
              </div>
              {getCashChange() > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Troco:</span>
                  <span className="font-bold">{formatCurrency(getCashChange())}</span>
                </div>
              )}
              {installmentData && (
                <div className="flex justify-between text-blue-600 dark:text-blue-400">
                  <span>Parcelas:</span>
                  <span className="font-bold">{installmentData.installments}x de {formatCurrency(installmentData.installmentValue)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Restante:</span>
                <span className={getRemainingAmount() > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                  {formatCurrency(getRemainingAmount())}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || paymentDetails.length === 0}>
                {loading ? 'Processando...' : 'Confirmar Venda'}
              </Button>
            </DialogFooter>
          </form>

          <InstallmentSaleModal
            open={showInstallmentModal}
            onClose={() => setShowInstallmentModal(false)}
            onConfirm={handleInstallmentConfirm}
            totalAmount={getRemainingAmount()}
          />

          {/* Modal de Parcelas para Crédito Parcelado */}
          {creditCardInstallmentPaymentIndex !== null && (
            <CreditCardInstallmentModal
              open={showCreditCardInstallmentModal}
              onClose={() => {
                setShowCreditCardInstallmentModal(false);
                setCreditCardInstallmentPaymentIndex(null);
              }}
              onConfirm={(installmentCount) => {
                if (creditCardInstallmentPaymentIndex !== null) {
                  updatePaymentMethod(creditCardInstallmentPaymentIndex, 'installmentCount', installmentCount);
                }
              }}
              totalAmount={paymentDetails[creditCardInstallmentPaymentIndex]?.amount || 0}
              acquirerCnpj={paymentDetails[creditCardInstallmentPaymentIndex]?.acquirerCnpj}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Impressão de Boletos */}
      <BilletPrintConfirmationDialog
        open={showBilletPrintConfirmation}
        onConfirm={handleBilletPrintConfirm}
        onCancel={handleBilletPrintCancel}
        loading={loading}
      />

      {/* Visualizador de Boletos */}
      {createdSaleId && (
        <InstallmentBilletViewer
          open={showBillets}
          onClose={handleBilletsClose}
          saleId={createdSaleId}
          billetsPdfBase64={billetsPdf || undefined}
        />
      )}
      
      <PrintConfirmationDialog
        open={showPrintConfirmation}
        onConfirm={handlePrintConfirm}
        onCancel={handlePrintCancel}
        loading={printing}
        printType={currentPrintType}
      />
      <CustomerCopyConfirmationDialog
        open={showCustomerCopyConfirmation}
        onConfirm={handleCustomerCopyConfirm}
        onCancel={handleCustomerCopyCancel}
        loading={printing}
      />

      {/* Dialog de Confirmação de Comprovante de Crédito */}
      {pendingCreditVoucherData && (
        <StoreCreditVoucherConfirmationDialog
          open={showStoreCreditVoucherConfirmation}
          onConfirm={handleStoreCreditVoucherConfirm}
          onCancel={handleStoreCreditVoucherCancel}
          loading={printing}
          creditUsed={pendingCreditVoucherData.creditUsed}
          remainingBalance={pendingCreditVoucherData.remainingBalance}
        />
      )}
    </>
  );
}

