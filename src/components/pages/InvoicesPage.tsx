import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, RefreshCw, Search, PlusCircle, Trash2, Plus, Package, XCircle, CheckCircle2, AlertCircle, Info, HelpCircle, FileX, FileEdit, Link2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useDateRange } from '../../hooks/useDateRange';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input, InputWithIcon } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { handleApiError } from '@/lib/handleApiError';
import { formatCurrency, formatDateTime, downloadFile, getBlobErrorMessage } from '@/lib/utils';
import { fiscalApi, customerApi } from '@/lib/api-endpoints';
import { AcquirerCnpjSelect } from '../ui/acquirer-cnpj-select';
import { isValidCPF, isValidCNPJ, isValidCPFOrCNPJ } from '@/lib/validations';
import { InvoiceHelpModal } from '../invoices/InvoiceHelpModal';
import { NfeSuccessModal, type NfeEmitidaResumo } from '../fiscal/nfe-success-modal';

interface FiscalDoc {
  id: string;
  documentType: 'NFE' | 'NFSE' | string;
  accessKey?: string;
  status?: string;
  total?: number;
  cbsValue?: number | null;
  ibsValue?: number | null;
  createdAt?: string;
  focusRef?: string | null;
  hasFocusArtifacts?: boolean;
}

interface NFeItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  ncm: string;
  cfop: string;
  unitOfMeasure: string;
  // Campos fiscais híbridos por item (opcional; IBPT segue automático no backend)
  icmsOrigem?: string;
  icmsSituacaoTributaria?: string;
  icmsAliquota?: number | '';
  icmsBaseCalculo?: number | '';
  icmsValor?: number | '';
  pisSituacaoTributaria?: string;
  pisAliquota?: number | '';
  pisBaseCalculo?: number | '';
  pisValor?: number | '';
  cofinsSituacaoTributaria?: string;
  cofinsAliquota?: number | '';
  cofinsBaseCalculo?: number | '';
  cofinsValor?: number | '';
  ipiSituacaoTributaria?: string;
  ipiAliquota?: number | '';
  ipiValor?: number | '';
  cest?: string;
  codigoBeneficioFiscal?: string;
  barcode?: string;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stockQuantity: number;
  ncm?: string;
  cfop?: string;
  category?: string;
}

export default function InvoicesPage() {
  const { api, user } = useAuth();
  const { queryParams, queryKeyPart } = useDateRange();
  const [search, setSearch] = useState('');
  const [emitOpen, setEmitOpen] = useState(false);
  const [emitType, setEmitType] = useState<'nfe' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Opção de vincular a uma venda existente OU preencher dados manualmente
  const [emissionMode, setEmissionMode] = useState<'sale' | 'manual'>('sale');
  const [saleId, setSaleId] = useState('');
  
  // Dados do destinatário
  const [recipientType, setRecipientType] = useState<'cpf' | 'cnpj'>('cpf');
  const [recipientDocument, setRecipientDocument] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  // IE do destinatário — vazio = não contribuinte; "ISENTO" = isento; demais valores = contribuinte.
  const [recipientStateRegistration, setRecipientStateRegistration] = useState('');

  // Endereço do destinatário
  const [recipientZipCode, setRecipientZipCode] = useState('');
  const [recipientStreet, setRecipientStreet] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [recipientComplement, setRecipientComplement] = useState('');
  const [recipientDistrict, setRecipientDistrict] = useState('');
  const [recipientCity, setRecipientCity] = useState('');
  const [recipientState, setRecipientState] = useState('');

  // Bloco de frete / despesas acessórias — quando vazio, NF-e sai sem frete (modalidade 9).
  const [freightModality, setFreightModality] = useState<0 | 1 | 2 | 3 | 4 | 9>(9);
  const [freightValue, setFreightValue] = useState<number | ''>('');
  const [freightInsurance, setFreightInsurance] = useState<number | ''>('');
  const [freightOtherExpenses, setFreightOtherExpenses] = useState<number | ''>('');
  const [freightDiscount, setFreightDiscount] = useState<number | ''>('');

  // Itens da nota
  const [items, setItems] = useState<NFeItem[]>([{
    description: '',
    quantity: 1,
    unitPrice: 0,
    ncm: '',
    cfop: '5102',
    unitOfMeasure: 'UN'
  }]);
  
  // Informações de pagamento
  const [paymentMethod, setPaymentMethod] = useState('01'); // 01=Dinheiro
  // Grupo Card (NT 2025.001) - Obrigatório para pagamentos com cartão
  // Sistema não tem máquinas integradas, sempre usar "2 - Pagamento Não Integrado"
  const [acquirerCnpj, setAcquirerCnpj] = useState<string>('');
  const [cardBrand, setCardBrand] = useState<string>('');
  const [cardOperationType, setCardOperationType] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [emitBoleto, setEmitBoleto] = useState(false);
  const [boletoCustomerId, setBoletoCustomerId] = useState('');
  const [boletoDueDate, setBoletoDueDate] = useState('');
  const [boletoAmount, setBoletoAmount] = useState<number | ''>('');

  // Estados para o diálogo de busca de produtos
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  // Guardar o produto completo: a lista da API muda com a busca e IDs
  // sozinhos deixariam de resolver ao adicionar vários itens.
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  
  // Estados para cancelamento
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [documentToCancel, setDocumentToCancel] = useState<FiscalDoc | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // Estados para consulta de status
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);

  // Estado para verificação de configuração fiscal
  const [hasValidFiscalConfig, setHasValidFiscalConfig] = useState<boolean | null>(null);
  const [checkingFiscalConfig, setCheckingFiscalConfig] = useState(false);

  // Inutilizar numeração
  const [inutilizarOpen, setInutilizarOpen] = useState(false);
  const [inutilizarSerie, setInutilizarSerie] = useState('1');
  const [inutilizarNumeroInicial, setInutilizarNumeroInicial] = useState('');
  const [inutilizarNumeroFinal, setInutilizarNumeroFinal] = useState('');
  const [inutilizarJustificativa, setInutilizarJustificativa] = useState('');
  const [inutilizarModelo, setInutilizarModelo] = useState<'55' | '65'>('65');
  const [inutilizarSubmitting, setInutilizarSubmitting] = useState(false);

  // Carta de Correção (CC-e) - apenas NF-e
  const [cartaCorrecaoOpen, setCartaCorrecaoOpen] = useState(false);
  const [documentForCarta, setDocumentForCarta] = useState<FiscalDoc | null>(null);
  const [correcaoText, setCorrecaoText] = useState('');
  const [cartaSubmitting, setCartaSubmitting] = useState(false);

  // Modal de ajuda
  const [helpOpen, setHelpOpen] = useState(false);

  // Pós-emissão NF-e (download / e-mail)
  const [nfeSuccessOpen, setNfeSuccessOpen] = useState(false);
  const [nfeSuccessDoc, setNfeSuccessDoc] = useState<NfeEmitidaResumo | null>(null);

  // Vincular referência Focus em notas sem chave/focusRef
  const [linkFocusOpen, setLinkFocusOpen] = useState(false);
  const [documentToLinkFocus, setDocumentToLinkFocus] = useState<FiscalDoc | null>(null);
  const [linkFocusRefValue, setLinkFocusRefValue] = useState('');
  const [linkFocusSubmitting, setLinkFocusSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fiscal-outbound', queryKeyPart, search],
    queryFn: async () =>
      (
        await api.get('/fiscal', {
          params: {
            page: 1,
            limit: 100,
            documentType: 'outbound',
            ...(queryParams.startDate && queryParams.endDate ? { startDate: queryParams.startDate, endDate: queryParams.endDate } : {}),
          },
        })
      ).data,
  });

  // Query para buscar produtos da empresa
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-for-nfe', productSearch],
    queryFn: async () => {
      const response = await api.get('/product', { 
        params: { 
          page: 1, 
          limit: 50,
          search: productSearch 
        } 
      });
      return response.data;
    },
    enabled: productSearchOpen,
  });

  const { data: boletoCustomersData } = useQuery({
    queryKey: ['customers-boleto-nfe', user?.companyId],
    queryFn: async () => {
      const res = await customerApi.list({ limit: 500, companyId: user?.companyId ?? undefined });
      return res.data as { data?: { id: string; name: string; cpfCnpj?: string }[] };
    },
    enabled: emitOpen && !!user?.companyId,
  });

  // Protege rota: empresa ou vendedor com nfeEmissionEnabled
  const canAccessInvoices = user?.role === 'empresa' || (user?.role === 'vendedor' && user?.nfeEmissionEnabled === true);
  useEffect(() => {
    if (user && !canAccessInvoices) {
      toast.error('Apenas empresas ou vendedores autorizados podem acessar esta página');
    }
  }, [user, canAccessInvoices]);

  // Verificar configuração fiscal quando componente carrega ou quando abre diálogo de emissão
  useEffect(() => {
    if (canAccessInvoices && emitOpen) {
      const checkFiscalConfig = async () => {
        try {
          setCheckingFiscalConfig(true);
          const response = await api.get('/company/my-company/fiscal-config/valid');
          setHasValidFiscalConfig(response.data?.hasValidConfig === true || response.data === true);
        } catch (error) {
          console.error('Erro ao verificar configuração fiscal:', error);
          setHasValidFiscalConfig(false);
        } finally {
          setCheckingFiscalConfig(false);
        }
      };
      checkFiscalConfig();
    }
  }, [canAccessInvoices, emitOpen, api]);

  // Tenta normalizar possíveis formatos de resposta
  const raw = data as any;
  const documents: FiscalDoc[] = Array.isArray(raw)
    ? raw
    : raw?.data || raw?.documents || raw?.items || [];

  const addItem = () => {
    setItems([...items, {
      description: '',
      quantity: 1,
      unitPrice: 0,
      ncm: '',
      cfop: '5102',
      unitOfMeasure: 'UN'
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof NFeItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0)), 0);
  };

  const addProductsToItems = () => {
    if (selectedProducts.length === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }

    const newItems: NFeItem[] = selectedProducts.map((product) => ({
      description: product.name,
      quantity: 1,
      unitPrice: Number(product.price),
      ncm: product.ncm || '99999999',
      cfop: product.cfop || '5102',
      unitOfMeasure: 'UN',
      barcode: product.barcode || undefined,
    }));

    setItems((prev) => {
      const filteredItems = prev.filter((item) => item.description.trim() !== '');
      return [...filteredItems, ...newItems];
    });

    setProductSearchOpen(false);
    setSelectedProducts([]);
    setProductSearch('');

    toast.success(`${newItems.length} produto(s) adicionado(s)`);
  };

  const toggleProductSelection = (product: Product) => {
    setSelectedProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const isProductSelected = (productId: string) =>
    selectedProducts.some((p) => p.id === productId);

  const openEmitDialog = (type: 'nfe') => {
    setEmitType(type);
    // Reset todos os campos
    setEmissionMode('sale');
    setSaleId('');
    setRecipientType('cpf');
    setRecipientDocument('');
    setRecipientName('');
    setRecipientEmail('');
    setRecipientPhone('');
    setRecipientStateRegistration('');
    setRecipientZipCode('');
    setRecipientStreet('');
    setRecipientNumber('');
    setRecipientComplement('');
    setRecipientDistrict('');
    setRecipientCity('');
    setRecipientState('');
    setFreightModality(9);
    setFreightValue('');
    setFreightInsurance('');
    setFreightOtherExpenses('');
    setFreightDiscount('');
    setItems([{
      description: '',
      quantity: 1,
      unitPrice: 0,
      ncm: '',
      cfop: '5102',
      unitOfMeasure: 'UN'
    }]);
    setPaymentMethod('01');
    setAcquirerCnpj('');
    setCardBrand('');
    setCardOperationType('');
    setAdditionalInfo('');
    setEmitBoleto(false);
    setBoletoCustomerId('');
    setBoletoDueDate('');
    setBoletoAmount('');
    setEmitOpen(true);
  };

  const submitEmit = async () => {
    if (!emitType) return;
    
    // Validações básicas
    if (emissionMode === 'sale' && !saleId.trim()) {
      toast.error('Informe o ID da venda');
      return;
    }

    if (emitBoleto && !boletoCustomerId) {
      toast.error('Para emitir boleto, selecione o cliente cadastrado');
      return;
    }
    
    if (emissionMode === 'manual') {
      // Validar CPF/CNPJ (remover formatação e verificar formato e dígitos verificadores)
      const documentCleaned = recipientDocument.replace(/\D/g, '');
      if (!documentCleaned || documentCleaned.length < 11) {
        toast.error('Informe um CPF/CNPJ válido do destinatário');
        return;
      }
      if (recipientType === 'cpf') {
        if (documentCleaned.length !== 11) {
          toast.error('CPF deve ter 11 dígitos');
          return;
        }
        if (!isValidCPF(recipientDocument)) {
          toast.error('CPF inválido. Verifique os dígitos verificadores');
          return;
        }
      }
      if (recipientType === 'cnpj') {
        if (documentCleaned.length !== 14) {
          toast.error('CNPJ deve ter 14 dígitos');
          return;
        }
        if (!isValidCNPJ(recipientDocument)) {
          toast.error('CNPJ inválido. Verifique os dígitos verificadores');
          return;
        }
      }
      
      if (!recipientName.trim()) {
        toast.error('Informe o nome do destinatário');
        return;
      }
      
      // Validação de endereço para NF-e (obrigatório pela Receita Federal)
      if (!recipientStreet.trim()) {
        toast.error('Informe o endereço do destinatário');
        return;
      }
      if (!recipientCity.trim()) {
        toast.error('Informe a cidade do destinatário');
        return;
      }
      if (!recipientState.trim() || recipientState.length !== 2) {
        toast.error('Informe o estado (UF) do destinatário');
        return;
      }
      
      if (items.length === 0 || !items[0].description.trim()) {
        toast.error('Adicione pelo menos um item');
        return;
      }
      
      // Validar itens
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.description || !item.description.trim()) {
          toast.error(`Item ${i + 1}: Informe a descrição do produto/serviço`);
          return;
        }
        if (item.description.trim().length > 120) {
          toast.error(`Item ${i + 1}: A descrição deve ter no máximo 120 caracteres`);
          return;
        }
        if (!item.quantity || item.quantity <= 0) {
          toast.error(`Item ${i + 1}: A quantidade deve ser maior que zero`);
          return;
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          toast.error(`Item ${i + 1}: O valor unitário deve ser maior que zero`);
          return;
        }
        // Validar unidade de medida
        if (!item.unitOfMeasure || !item.unitOfMeasure.trim()) {
          toast.error(`Item ${i + 1}: A unidade de medida é obrigatória`);
          return;
        }
        // Validar CFOP (obrigatório e deve ter 4 dígitos numéricos)
        const cfopCleaned = item.cfop?.replace(/\D/g, '') || '';
        if (!cfopCleaned || cfopCleaned.length !== 4) {
          toast.error(`Item ${i + 1}: CFOP deve ter exatamente 4 dígitos numéricos`);
          return;
        }
        
        // Validar NCM (opcional, mas se informado deve ter 8 dígitos numéricos)
        if (item.ncm && item.ncm.trim() !== '') {
          const ncmCleaned = item.ncm.replace(/\D/g, '');
          if (ncmCleaned.length !== 8) {
            toast.error(`Item ${i + 1}: NCM deve ter exatamente 8 dígitos numéricos`);
            return;
          }
        }
      }
    }
    
    setSubmitting(true);
    try {
      const payload: any = {};
      
      if (emissionMode === 'sale') {
        // Emissão vinculada a uma venda
        payload.saleId = saleId.trim();
        // Overrides opcionais do destinatário (IE, endereço, contato) e frete:
        // venda é a fonte dos dados comerciais; modal pode complementar o fiscal.
        const documentCleanedSale = recipientDocument.replace(/\D/g, '');
        if (documentCleanedSale || recipientName.trim() || recipientStateRegistration.trim()) {
          payload.recipient = {
            document: documentCleanedSale || undefined,
            name: recipientName.trim() || undefined,
            email: recipientEmail?.trim() || undefined,
            phone: recipientPhone?.replace(/\D/g, '') || undefined,
            stateRegistration: recipientStateRegistration.trim() || undefined,
            address: {
              zipCode: recipientZipCode?.replace(/\D/g, '') || undefined,
              street: recipientStreet?.trim() || undefined,
              number: recipientNumber?.trim() || undefined,
              complement: recipientComplement?.trim() || undefined,
              district: recipientDistrict?.trim() || undefined,
              city: recipientCity?.trim() || undefined,
              state: recipientState?.trim().toUpperCase() || undefined,
            },
          };
        }
      } else {
        // Emissão manual com dados completos
        // Limpar formatação do documento (CPF/CNPJ)
        const documentCleaned = recipientDocument.replace(/\D/g, '');

        payload.recipient = {
          document: documentCleaned,
          name: recipientName.trim(),
          email: recipientEmail?.trim() || undefined,
          phone: recipientPhone?.replace(/\D/g, '') || undefined,
          stateRegistration: recipientStateRegistration.trim() || undefined,
          address: {
            zipCode: recipientZipCode?.replace(/\D/g, '') || undefined,
            street: recipientStreet?.trim() || undefined,
            number: recipientNumber?.trim() || undefined,
            complement: recipientComplement?.trim() || undefined,
            district: recipientDistrict?.trim() || undefined,
            city: recipientCity?.trim() || undefined,
            state: recipientState?.trim().toUpperCase() || undefined,
          }
        };

        payload.items = items.map(item => {
          // Limpar formatação de NCM e CFOP
          const ncmCleaned = item.ncm?.replace(/\D/g, '') || '';
          const cfopCleaned = item.cfop?.replace(/\D/g, '') || '';
          const toNumberOrUndefined = (v: unknown) =>
            typeof v === 'number' && Number.isFinite(v) ? v : undefined;

          return {
            description: item.description.trim(),
            quantity: item.quantity ?? 0,
            unitPrice: item.unitPrice ?? 0,
            ncm: ncmCleaned || undefined,
            cfop: cfopCleaned,
            unitOfMeasure: item.unitOfMeasure.trim(),
            barcode: item.barcode || undefined,
            // ICMS
            icmsOrigem: item.icmsOrigem || undefined,
            icmsSituacaoTributaria: item.icmsSituacaoTributaria || undefined,
            icmsAliquota: toNumberOrUndefined(item.icmsAliquota),
            icmsBaseCalculo: toNumberOrUndefined(item.icmsBaseCalculo),
            icmsValor: toNumberOrUndefined(item.icmsValor),
            // PIS
            pisSituacaoTributaria: item.pisSituacaoTributaria || undefined,
            pisAliquota: toNumberOrUndefined(item.pisAliquota),
            pisBaseCalculo: toNumberOrUndefined(item.pisBaseCalculo),
            pisValor: toNumberOrUndefined(item.pisValor),
            // COFINS
            cofinsSituacaoTributaria: item.cofinsSituacaoTributaria || undefined,
            cofinsAliquota: toNumberOrUndefined(item.cofinsAliquota),
            cofinsBaseCalculo: toNumberOrUndefined(item.cofinsBaseCalculo),
            cofinsValor: toNumberOrUndefined(item.cofinsValor),
            // IPI
            ipiSituacaoTributaria: item.ipiSituacaoTributaria || undefined,
            ipiAliquota: toNumberOrUndefined(item.ipiAliquota),
            ipiValor: toNumberOrUndefined(item.ipiValor),
            // Outros
            cest: item.cest?.trim() || undefined,
            codigoBeneficioFiscal: item.codigoBeneficioFiscal?.trim() || undefined,
          };
        });

        payload.payment = {
          method: paymentMethod,
        };
        
        // Adicionar dados do grupo Card (NT 2025.001) - Obrigatório para pagamentos com cartão
        const isCardPayment = paymentMethod === '03' || paymentMethod === '04';
        if (isCardPayment) {
          // Sistema não tem máquinas integradas, sempre usar "2 - Pagamento Não Integrado"
          const cardIntegrationType = '2';
          
          // Verificar quais campos estão faltando para dar mensagem mais específica
          const missingFields: string[] = [];
          if (!acquirerCnpj || acquirerCnpj.replace(/\D/g, '').length !== 14) missingFields.push('CNPJ da Credenciadora');
          if (!cardOperationType) missingFields.push('Tipo de Operação');
          
          if (missingFields.length > 0) {
            toast.error(
              `Pagamento com ${paymentMethod === '03' ? 'cartão de crédito' : 'cartão de débito'} requer preenchimento completo dos dados do cartão (NT 2025.001). ` +
              `Campos faltando: ${missingFields.join(', ')}`,
              { duration: 6000 }
            );
            setSubmitting(false);
            return;
          }
          
          // Validar CNPJ da credenciadora (deve ter 14 dígitos)
          const cnpjCleaned = acquirerCnpj.replace(/\D/g, '');
          if (cnpjCleaned.length !== 14) {
            toast.error('CNPJ da credenciadora deve ter exatamente 14 dígitos numéricos', { duration: 5000 });
            setSubmitting(false);
            return;
          }
          
          payload.payment.cardIntegrationType = cardIntegrationType;
          payload.payment.acquirerCnpj = cnpjCleaned;
          // Usar bandeira informada ou padrão '99' (Outras) se não informada
          payload.payment.cardBrand = cardBrand || '99';
          payload.payment.cardOperationType = cardOperationType;
        }
        
        if (additionalInfo.trim()) {
          payload.additionalInfo = additionalInfo.trim();
        }
      }

      // Bloco de frete — enviado em ambos os modos (venda e manual).
      // Quando vazio, backend assume modalidade 9 (sem frete).
      const freightValueNum = typeof freightValue === 'number' ? freightValue : 0;
      const hasAnyFreightValue =
        freightValueNum > 0 ||
        (typeof freightInsurance === 'number' && freightInsurance > 0) ||
        (typeof freightOtherExpenses === 'number' && freightOtherExpenses > 0) ||
        (typeof freightDiscount === 'number' && freightDiscount > 0);
      if (hasAnyFreightValue || freightModality !== 9) {
        payload.freight = {
          modality: freightModality,
          value: freightValueNum,
          insurance: typeof freightInsurance === 'number' ? freightInsurance : 0,
          otherExpenses: typeof freightOtherExpenses === 'number' ? freightOtherExpenses : 0,
          discount: typeof freightDiscount === 'number' ? freightDiscount : 0,
        };
      }

      if (emitBoleto && boletoCustomerId) {
        payload.emitBoleto = true;
        payload.boletoCustomerId = boletoCustomerId;
        if (boletoDueDate) payload.boletoDueDate = new Date(boletoDueDate).toISOString();
        if (boletoAmount !== '' && typeof boletoAmount === 'number') payload.boletoAmount = boletoAmount;
      }
      
      const { data: emitted } = await api.post('/fiscal/nfe', payload);
      toast.success('NF-e emitida com sucesso');
      setEmitOpen(false);
      setNfeSuccessDoc({
        id: emitted.id,
        documentNumber: emitted.documentNumber,
        accessKey: emitted.accessKey,
        status: emitted.status,
        pdfUrl: emitted.pdfUrl,
        recipientEmail: recipientEmail?.trim() || null,
        recipientName: recipientName?.trim() || null,
      });
      setNfeSuccessOpen(true);
      refetch();
    } catch (error: any) {
      // Verificar se é erro de dados fiscais incompletos da empresa
      const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao emitir NF-e';
      if (errorMessage.includes('Dados fiscais incompletos da empresa')) {
        toast.error('Configure os dados fiscais da empresa na seção de Configurações antes de emitir notas fiscais');
      } else {
        handleApiError(error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHelpOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Ajuda sobre funcionalidades"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-muted-foreground">Visualize e baixe suas NF-e</p>
        </div>
        <div className="flex gap-2">
          {(user?.role === 'empresa' || (user?.role === 'vendedor' && user?.nfeEmissionEnabled)) && (
            <Button onClick={() => openEmitDialog('nfe')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Emitir NF-e
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="text-foreground">
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
          {user?.role === 'empresa' && (
            <Button variant="outline" size="sm" onClick={() => setInutilizarOpen(true)} title="Inutilizar numeração (NF-e ou NFC-e)">
              <FileX className="mr-2 h-4 w-4" /> Inutilizar Numeração
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4">
        <InputWithIcon
          placeholder="Buscar por chave de acesso, tipo, status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="h-4 w-4" />}
          iconPosition="left"
        />
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-foreground">Tipo</th>
              <th className="px-4 py-2 text-left text-foreground">Chave de Acesso</th>
              <th className="px-4 py-2 text-left text-foreground">Status</th>
              <th className="px-4 py-2 text-right text-foreground">Total</th>
              <th className="px-4 py-2 text-left text-foreground">Emissão</th>
              <th className="px-4 py-2 text-right text-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={6}>Carregando...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center" colSpan={6}>
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <span>Nenhum documento fiscal encontrado</span>
                  </div>
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="px-4 py-2 text-foreground">{doc.documentType}</td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground">{doc.accessKey || '-'}</td>
                  <td className="px-4 py-2 text-foreground">
                    <div className="flex items-center gap-2">
                      {doc.status === 'Autorizada' || doc.status === 'Autorizado' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {doc.status}
                        </span>
                      ) : doc.status === 'Cancelada' || doc.status === 'Cancelado' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <XCircle className="h-3 w-3" />
                          {doc.status}
                        </span>
                      ) : doc.status === 'MOCK' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          <AlertCircle className="h-3 w-3" />
                          Mock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          <Info className="h-3 w-3" />
                          {doc.status || 'Desconhecido'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-foreground">
                    <div>
                      {doc.total != null ? formatCurrency(doc.total) : '-'}
                      {(doc.cbsValue != null || doc.ibsValue != null) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          CBS {doc.cbsValue != null ? formatCurrency(doc.cbsValue) : '-'} / IBS {doc.ibsValue != null ? formatCurrency(doc.ibsValue) : '-'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-foreground">{doc.createdAt ? formatDateTime(doc.createdAt) : '-'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            setCheckingStatus(doc.id);
                            const response = await api.get(`/fiscal/${doc.id}/status`);
                            const statusData = response.data;
                            toast.success(`Status: ${statusData.sefazStatus || statusData.currentStatus}`);
                            await refetch();
                          } catch (e: any) {
                            console.error(e);
                            toast.error(e?.response?.data?.message || 'Erro ao consultar status');
                          } finally {
                            setCheckingStatus(null);
                          }
                        }}
                        disabled={
                          checkingStatus === doc.id ||
                          (!doc.accessKey &&
                            !String(doc.status || '').toLowerCase().includes('processando'))
                        }
                        title={
                          !doc.accessKey
                            ? 'Consulta Focus (pode completar chave/XML/DANFE)'
                            : 'Consultar status na SEFAZ'
                        }
                      >
                        {checkingStatus === doc.id ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Info className="mr-2 h-4 w-4" />
                        )}
                        Status
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!doc.accessKey}
                        title={
                          !doc.accessKey
                            ? 'Indisponível: nota sem chave de acesso Focus — emita novamente'
                            : 'Baixar DANFE (PDF)'
                        }
                        onClick={async () => {
                          try {
                            const response = await api.get(`/fiscal/${doc.id}/download`, { params: { format: 'pdf' }, responseType: 'blob' });
                            const blob = response.data as Blob;
                            if (blob.type?.includes('application/json')) {
                              throw { response: { data: blob } };
                            }
                            downloadFile(blob, `documento-${doc.id}.pdf`);
                          } catch (e) {
                            console.error(e);
                            toast.error(await getBlobErrorMessage(e, 'Não foi possível baixar o PDF'));
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" /> PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!doc.accessKey}
                        title={
                          !doc.accessKey
                            ? 'Indisponível: nota sem chave de acesso Focus — emita novamente'
                            : 'Baixar XML'
                        }
                        onClick={async () => {
                          try {
                            const response = await api.get(`/fiscal/${doc.id}/download`, { params: { format: 'xml' }, responseType: 'blob' });
                            const blob = response.data as Blob;
                            if (blob.type?.includes('application/json')) {
                              throw { response: { data: blob } };
                            }
                            downloadFile(blob, `documento-${doc.id}.xml`);
                          } catch (e) {
                            console.error(e);
                            toast.error(await getBlobErrorMessage(e, 'Não foi possível baixar o XML'));
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" /> XML
                      </Button>
                      {!doc.accessKey && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setDocumentToLinkFocus(doc);
                            setLinkFocusRefValue(doc.focusRef || '');
                            setLinkFocusOpen(true);
                          }}
                          title="Informar a ref da nota no painel FocusNFE para recuperar XML/DANFE"
                        >
                          <Link2 className="mr-2 h-4 w-4" /> Vincular Focus
                        </Button>
                      )}
                      {doc.documentType === 'NFe' && (doc.status === 'Autorizada' || doc.status === 'Autorizado') && doc.accessKey && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDocumentForCarta(doc);
                            setCorrecaoText('');
                            setCartaCorrecaoOpen(true);
                          }}
                          title="Enviar Carta de Correção Eletrônica (CC-e)"
                        >
                          <FileEdit className="mr-2 h-4 w-4" /> CC-e
                        </Button>
                      )}
                      {(doc.status !== 'Cancelada' && doc.status !== 'Cancelado' && doc.status !== 'MOCK' && doc.accessKey) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setDocumentToCancel(doc);
                            setCancelReason('');
                            setCancelDialogOpen(true);
                          }}
                          title="Cancelar nota fiscal"
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Cancelar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Diálogo para emissão */}
      <Dialog open={emitOpen} onOpenChange={setEmitOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir NF-e</DialogTitle>
            <DialogDescription>
              Escolha vincular a uma venda existente ou preencher os dados manualmente
            </DialogDescription>
          </DialogHeader>

          {/* Aviso sobre configuração fiscal */}
          {hasValidFiscalConfig === false && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Configuração Fiscal Incompleta
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    A empresa não possui configuração fiscal completa para emissão de NF-e. 
                    Configure os dados fiscais na seção de <strong>Configurações</strong> antes de emitir notas fiscais.
                    Campos obrigatórios: CNPJ, Inscrição Estadual, Código IBGE, CEP, Estado, Cidade, certificado digital A1 (.pfx) e ambiente SEFAZ.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Tabs value={emissionMode} onValueChange={(v) => setEmissionMode(v as 'sale' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sale">Vincular à Venda</TabsTrigger>
              <TabsTrigger value="manual">Emissão Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="sale" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="saleId">ID da Venda *</Label>
                <Input
                  id="saleId"
                  placeholder="Ex.: 123"
                  value={saleId}
                  onChange={(e) => setSaleId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Informe o ID de uma venda existente para emitir a NF-e com os dados dela.
                  Os campos abaixo complementam o frete; quantidade, preço e itens sempre vêm da
                  venda.
                </p>
              </div>

              <Card className="p-4">
                <h3 className="font-semibold mb-4">Frete da NF-e</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modalidade</Label>
                    <Select
                      value={String(freightModality)}
                      onValueChange={(v) =>
                        setFreightModality(Number(v) as 0 | 1 | 2 | 3 | 4 | 9)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9">9 — Sem frete</SelectItem>
                        <SelectItem value="0">0 — Por conta do emitente</SelectItem>
                        <SelectItem value="1">1 — Por conta do destinatário</SelectItem>
                        <SelectItem value="2">2 — Por conta de terceiros</SelectItem>
                        <SelectItem value="3">3 — Próprio / remetente</SelectItem>
                        <SelectItem value="4">4 — Próprio / destinatário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freightValueSale">Valor do Frete (R$)</Label>
                    <Input
                      id="freightValueSale"
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={freightModality === 9}
                      value={freightValue}
                      onChange={(e) =>
                        setFreightValue(e.target.value === '' ? '' : Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="space-y-6">
              {/* Aviso sobre dados obrigatórios */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">⚠️ Dados obrigatórios da Receita Federal</p>
                <p>Para emitir NF-e, certifique-se de que:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>A empresa possui todos os dados fiscais cadastrados (Configurações)</li>
                  <li>O endereço completo do destinatário está preenchido (obrigatório para NF-e)</li>
                  <li>Os itens possuem CFOP válido de 4 dígitos</li>
                </ul>
              </div>

              {/* Dados do Destinatário */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Dados do Destinatário</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Documento *</Label>
                      <Select value={recipientType} onValueChange={(v) => setRecipientType(v as 'cpf' | 'cnpj')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipientDocument">{recipientType === 'cpf' ? 'CPF' : 'CNPJ'} *</Label>
                      <Input
                        id="recipientDocument"
                        placeholder={recipientType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                        value={recipientDocument}
                        onChange={(e) => setRecipientDocument(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Nome/Razão Social *</Label>
                    <Input
                      id="recipientName"
                      placeholder="Nome completo ou razão social"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientEmail">Email</Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipientPhone">Telefone</Label>
                      <Input
                        id="recipientPhone"
                        placeholder="(00) 00000-0000"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientZipCode">CEP</Label>
                      <Input
                        id="recipientZipCode"
                        placeholder="00000-000"
                        value={recipientZipCode}
                        onChange={(e) => setRecipientZipCode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="recipientStreet">Logradouro *</Label>
                      <Input
                        id="recipientStreet"
                        placeholder="Rua, Avenida, etc."
                        value={recipientStreet}
                        onChange={(e) => setRecipientStreet(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientNumber">Número</Label>
                      <Input
                        id="recipientNumber"
                        placeholder="123"
                        value={recipientNumber}
                        onChange={(e) => setRecipientNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipientComplement">Complemento</Label>
                      <Input
                        id="recipientComplement"
                        placeholder="Apto 101"
                        value={recipientComplement}
                        onChange={(e) => setRecipientComplement(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipientDistrict">Bairro</Label>
                      <Input
                        id="recipientDistrict"
                        placeholder="Centro"
                        value={recipientDistrict}
                        onChange={(e) => setRecipientDistrict(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipientState">UF *</Label>
                      <Input
                        id="recipientState"
                        placeholder="SC"
                        maxLength={2}
                        value={recipientState}
                        onChange={(e) => setRecipientState(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipientCity">Cidade *</Label>
                    <Input
                      id="recipientCity"
                      placeholder="Nome da cidade"
                      value={recipientCity}
                      onChange={(e) => setRecipientCity(e.target.value)}
                    />
                  </div>

                  {/* Inscrição Estadual do destinatário */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientStateRegistration">
                        Inscrição Estadual
                      </Label>
                      <Input
                        id="recipientStateRegistration"
                        placeholder="000.000.000.000 ou ISENTO"
                        value={recipientStateRegistration}
                        onChange={(e) =>
                          setRecipientStateRegistration(e.target.value.toUpperCase())
                        }
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Bloco de Frete / Despesas Acessórias */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Frete e Despesas Acessórias</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Modalidade do Frete</Label>
                      <Select
                        value={String(freightModality)}
                        onValueChange={(v) =>
                          setFreightModality(Number(v) as 0 | 1 | 2 | 3 | 4 | 9)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9">9 — Sem frete</SelectItem>
                          <SelectItem value="0">0 — Por conta do emitente</SelectItem>
                          <SelectItem value="1">1 — Por conta do destinatário</SelectItem>
                          <SelectItem value="2">2 — Por conta de terceiros</SelectItem>
                          <SelectItem value="3">3 — Próprio / remetente</SelectItem>
                          <SelectItem value="4">4 — Próprio / destinatário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freightValue">Valor do Frete (R$)</Label>
                      <Input
                        id="freightValue"
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={freightModality === 9}
                        value={freightValue}
                        onChange={(e) =>
                          setFreightValue(e.target.value === '' ? '' : Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="freightInsurance">Seguro (R$)</Label>
                      <Input
                        id="freightInsurance"
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={freightModality === 9}
                        value={freightInsurance}
                        onChange={(e) =>
                          setFreightInsurance(
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freightOtherExpenses">Outras Despesas (R$)</Label>
                      <Input
                        id="freightOtherExpenses"
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={freightModality === 9}
                        value={freightOtherExpenses}
                        onChange={(e) =>
                          setFreightOtherExpenses(
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freightDiscount">Desconto (R$)</Label>
                      <Input
                        id="freightDiscount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={freightDiscount}
                        onChange={(e) =>
                          setFreightDiscount(
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Itens da Nota */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Itens da Nota Fiscal</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setProductSearchOpen(true)} 
                      type="button"
                    >
                      <Package className="mr-2 h-4 w-4" /> Buscar Produto Cadastrado
                    </Button>
                    <Button size="sm" onClick={addItem} type="button">
                      <Plus className="mr-2 h-4 w-4" /> Adicionar Item Manual
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Item {index + 1}</h4>
                        {items.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(index)}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Descrição do Produto/Serviço *</Label>
                        <Input
                          placeholder="Ex.: Produto XYZ"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Quantidade *</Label>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            value={item.quantity ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              const n = parseFloat(v);
                              updateItem(index, 'quantity', v === '' ? null : (isNaN(n) ? null : n));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor Unitário (R$) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              const n = parseFloat(v);
                              updateItem(index, 'unitPrice', v === '' ? null : (isNaN(n) ? null : n));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unidade</Label>
                          <Input
                            placeholder="UN"
                            value={item.unitOfMeasure}
                            onChange={(e) => updateItem(index, 'unitOfMeasure', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>NCM</Label>
                          <Input
                            placeholder="00000000"
                            maxLength={8}
                            value={item.ncm}
                            onChange={(e) => updateItem(index, 'ncm', e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">8 dígitos</p>
                        </div>
                        <div className="space-y-2">
                          <Label>CFOP *</Label>
                          <Input
                            placeholder="5102"
                            maxLength={4}
                            value={item.cfop}
                            onChange={(e) => updateItem(index, 'cfop', e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Ex.: 5102 (venda dentro do estado)</p>
                        </div>
                      </div>

                      <div className="bg-muted p-2 rounded text-sm">
                        <strong>Subtotal:</strong> {formatCurrency((item.quantity ?? 0) * (item.unitPrice ?? 0))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Valor Total da Nota:</span>
                    <span className="font-bold text-xl text-primary">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </Card>

              {/* Informações de Pagamento */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Informações de Pagamento</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Forma de Pagamento *</Label>
                    <Select value={paymentMethod} onValueChange={(value) => {
                      setPaymentMethod(value);
                      // Limpar campos do grupo Card quando mudar método de pagamento
                      if (value !== '03' && value !== '04') {
                        setAcquirerCnpj('');
                        setCardBrand('');
                        setCardOperationType('');
                      } else {
                        // Definir tipo de operação padrão baseado no método
                        setCardOperationType(value === '03' ? '01' : '03');
                        // Definir bandeira padrão '99' (Outras) se não estiver definida
                        if (!cardBrand) {
                          setCardBrand('99');
                        }
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Dinheiro</SelectItem>
                        <SelectItem value="02">Cheque</SelectItem>
                        <SelectItem value="03">Cartão de Crédito</SelectItem>
                        <SelectItem value="04">Cartão de Débito</SelectItem>
                        <SelectItem value="05">Crédito Loja</SelectItem>
                        <SelectItem value="10">Vale Alimentação</SelectItem>
                        <SelectItem value="11">Vale Refeição</SelectItem>
                        <SelectItem value="12">Vale Presente</SelectItem>
                        <SelectItem value="13">Vale Combustível</SelectItem>
                        <SelectItem value="15">Boleto Bancário</SelectItem>
                        <SelectItem value="16">Depósito Bancário</SelectItem>
                        <SelectItem value="17">PIX</SelectItem>
                        <SelectItem value="18">Transferência Bancária</SelectItem>
                        <SelectItem value="19">Cashback</SelectItem>
                        <SelectItem value="90">Sem Pagamento</SelectItem>
                        <SelectItem value="99">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Campos do Grupo Card (NT 2025.001) - Obrigatório para pagamentos com cartão */}
                  {(paymentMethod === '03' || paymentMethod === '04') && (
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                          Dados do Cartão (NT 2025.001)
                        </Label>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="cardBrand" className="text-xs">
                            Bandeira (padrão: Outras)
                          </Label>
                          <Select
                            value={cardBrand || '99'}
                            onValueChange={setCardBrand}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="01">01 - Visa</SelectItem>
                              <SelectItem value="02">02 - Mastercard</SelectItem>
                              <SelectItem value="03">03 - American Express</SelectItem>
                              <SelectItem value="04">04 - Elo</SelectItem>
                              <SelectItem value="05">05 - Hipercard</SelectItem>
                              <SelectItem value="99">99 - Outras</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="acquirerCnpj" className="text-xs">
                            CNPJ da Credenciadora *
                          </Label>
                          <AcquirerCnpjSelect
                            id="acquirerCnpj"
                            value={acquirerCnpj}
                            onChange={setAcquirerCnpj}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="cardOperationType" className="text-xs">
                            Tipo de Operação *
                          </Label>
                          <Select
                            value={cardOperationType}
                            onValueChange={setCardOperationType}
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
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Informações Adicionais */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Informações Adicionais</h3>
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Observações</Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Informações complementares para a nota fiscal"
                    rows={3}
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                  />
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Emitir boleto para esta nota</h3>
                <p className="text-sm text-muted-foreground">Gera um boleto vinculado à NFe (cliente cadastrado com CPF/CNPJ e endereço).</p>
              </div>
              <Switch checked={emitBoleto} onCheckedChange={setEmitBoleto} />
            </div>
            {emitBoleto && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <Label>Cliente para o boleto *</Label>
                  <Select value={boletoCustomerId || '_'} onValueChange={(v) => setBoletoCustomerId(v === '_' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente cadastrado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">Selecione...</SelectItem>
                      {(boletoCustomersData?.data ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name || c.cpfCnpj || c.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vencimento (opcional)</Label>
                    <Input
                      type="date"
                      value={boletoDueDate}
                      onChange={(e) => setBoletoDueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do boleto (opcional, padrão: total da nota)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={formatCurrency(calculateTotal())}
                      value={boletoAmount === '' ? '' : boletoAmount}
                      onChange={(e) => {
                        const v = e.target.value;
                        const n = parseFloat(v);
                        setBoletoAmount(v === '' ? '' : (isNaN(n) ? '' : n));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmitOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submitEmit} disabled={submitting}>
              {submitting ? 'Emitindo...' : 'Emitir NF-e'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Busca de Produtos */}
      <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Buscar Produtos Cadastrados</DialogTitle>
            <DialogDescription>
              Selecione os produtos que deseja adicionar à nota fiscal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Campo de busca */}
            <div>
              <InputWithIcon
                placeholder="Buscar por nome, código de barras..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                iconPosition="left"
              />
            </div>

            {/* Lista de produtos */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              {isLoadingProducts ? (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">Carregando produtos...</p>
                </div>
              ) : (
                <div className="divide-y">
                  {(productsData?.products || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <Package className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Nenhum produto encontrado</p>
                    </div>
                  ) : (
                    (productsData?.products || []).map((product: Product) => (
                      <div
                        key={product.id}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          isProductSelected(product.id) ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => toggleProductSelection(product)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isProductSelected(product.id)}
                                onChange={() => toggleProductSelection(product)}
                                className="cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div>
                                <h4 className="font-medium">{product.name}</h4>
                                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                  <span>Código: {product.barcode}</span>
                                  {product.category && <span>Categoria: {product.category}</span>}
                                  <span>Estoque: {product.stockQuantity}</span>
                                </div>
                                <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                                  {product.ncm && <span>NCM: {product.ncm}</span>}
                                  {product.cfop && <span>CFOP: {product.cfop}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">{formatCurrency(Number(product.price))}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Contador de selecionados */}
            {selectedProducts.length > 0 && (
              <div className="bg-primary/10 p-3 rounded-lg">
                <p className="text-sm font-medium">
                  {selectedProducts.length} produto(s) selecionado(s)
                </p>
              </div>
            )}
      </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setProductSearchOpen(false);
                setSelectedProducts([]);
                setProductSearch('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={addProductsToItems}
              disabled={selectedProducts.length === 0}
            >
              Adicionar Selecionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Inutilizar Numeração */}
      <Dialog open={inutilizarOpen} onOpenChange={setInutilizarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inutilizar Numeração</DialogTitle>
            <DialogDescription>
              Inutilize uma faixa de numeração de NF-e ou NFC-e na SEFAZ. Justificativa com no mínimo 15 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Série</Label>
                <Input value={inutilizarSerie} onChange={(e) => setInutilizarSerie(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select value={inutilizarModelo} onValueChange={(v) => setInutilizarModelo(v as '55' | '65')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="65">65 - NFC-e</SelectItem>
                    <SelectItem value="55">55 - NF-e</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número inicial</Label>
                <Input type="number" min={1} value={inutilizarNumeroInicial} onChange={(e) => setInutilizarNumeroInicial(e.target.value)} placeholder="100" />
              </div>
              <div className="space-y-2">
                <Label>Número final</Label>
                <Input type="number" min={1} value={inutilizarNumeroFinal} onChange={(e) => setInutilizarNumeroFinal(e.target.value)} placeholder="150" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Justificativa * (mín. 15 caracteres)</Label>
              <Textarea value={inutilizarJustificativa} onChange={(e) => setInutilizarJustificativa(e.target.value)} placeholder="Ex.: Inutilização por perda de sequência na numeração" rows={3} />
              <p className="text-xs text-muted-foreground">{inutilizarJustificativa.length}/15</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInutilizarOpen(false)}>Fechar</Button>
            <Button
              disabled={inutilizarSubmitting || inutilizarJustificativa.trim().length < 15 || !inutilizarNumeroInicial || !inutilizarNumeroFinal || Number(inutilizarNumeroInicial) > Number(inutilizarNumeroFinal)}
              onClick={async () => {
                try {
                  setInutilizarSubmitting(true);
                  await fiscalApi.inutilizarNumeracao({
                    serie: inutilizarSerie || '1',
                    numeroInicial: Number(inutilizarNumeroInicial),
                    numeroFinal: Number(inutilizarNumeroFinal),
                    justificativa: inutilizarJustificativa.trim(),
                    modelo: inutilizarModelo,
                  });
                  toast.success('Numeração inutilizada com sucesso na SEFAZ.');
                  setInutilizarOpen(false);
                  setInutilizarJustificativa('');
                  setInutilizarNumeroInicial('');
                  setInutilizarNumeroFinal('');
                  await refetch();
                } catch (e: any) {
                  handleApiError(e);
                } finally {
                  setInutilizarSubmitting(false);
                }
              }}
            >
              {inutilizarSubmitting ? 'Enviando...' : 'Inutilizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Carta de Correção (CC-e) */}
      <Dialog open={cartaCorrecaoOpen} onOpenChange={setCartaCorrecaoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Carta de Correção Eletrônica (CC-e)</DialogTitle>
            <DialogDescription>
              Enviar CC-e para NF-e autorizada. Não é permitido alterar valores, alíquotas ou dados de emitente/destinatário. Mín. 15, máx. 1000 caracteres.
            </DialogDescription>
          </DialogHeader>
          {documentForCarta && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Documento: {documentForCarta.accessKey || documentForCarta.id}</p>
              <div className="space-y-2">
                <Label>Texto da correção *</Label>
                <Textarea value={correcaoText} onChange={(e) => setCorrecaoText(e.target.value)} placeholder="Descreva a correção..." rows={4} maxLength={1000} />
                <p className="text-xs text-muted-foreground">{correcaoText.length}/1000 (mín. 15)</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCartaCorrecaoOpen(false)}>Fechar</Button>
            <Button
              disabled={cartaSubmitting || !documentForCarta || correcaoText.trim().length < 15}
              onClick={async () => {
                if (!documentForCarta) return;
                try {
                  setCartaSubmitting(true);
                  await fiscalApi.enviarCartaCorrecao(documentForCarta.id, { correcao: correcaoText.trim() });
                  toast.success('Carta de Correção enviada com sucesso.');
                  setCartaCorrecaoOpen(false);
                  setDocumentForCarta(null);
                  setCorrecaoText('');
                  await refetch();
                } catch (e: any) {
                  handleApiError(e);
                } finally {
                  setCartaSubmitting(false);
                }
              }}
            >
              {cartaSubmitting ? 'Enviando...' : 'Enviar CC-e'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento */}
      <Dialog
        open={linkFocusOpen}
        onOpenChange={(open) => {
          setLinkFocusOpen(open);
          if (!open) {
            setDocumentToLinkFocus(null);
            setLinkFocusRefValue('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular referência FocusNFE</DialogTitle>
            <DialogDescription>
              Esta nota não tem chave/focusRef salvos. No painel da FocusNFE, abra a NF-e
              correspondente e copie o campo <strong>ref</strong> (referência). Com isso
              recuperamos XML e DANFE.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Documento: {documentToLinkFocus?.id}
            </p>
            <div className="space-y-2">
              <Label htmlFor="link-focus-ref">Referência Focus (ref)</Label>
              <Input
                id="link-focus-ref"
                value={linkFocusRefValue}
                onChange={(e) => setLinkFocusRefValue(e.target.value.trim())}
                placeholder="Ex: nfe_a1b2c3d4e5f6..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={linkFocusSubmitting}
              onClick={() => setLinkFocusOpen(false)}
            >
              Fechar
            </Button>
            <Button
              disabled={linkFocusSubmitting || linkFocusRefValue.length < 3 || !documentToLinkFocus}
              onClick={async () => {
                if (!documentToLinkFocus) return;
                setLinkFocusSubmitting(true);
                try {
                  await fiscalApi.linkFocusRef(documentToLinkFocus.id, linkFocusRefValue);
                  toast.success('Referência vinculada. XML/DANFE disponíveis para download.');
                  setLinkFocusOpen(false);
                  setDocumentToLinkFocus(null);
                  setLinkFocusRefValue('');
                  await refetch();
                } catch (error) {
                  handleApiError(error);
                } finally {
                  setLinkFocusSubmitting(false);
                }
              }}
            >
              {linkFocusSubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Vincular e sincronizar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Nota Fiscal</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento. O motivo deve ter pelo menos 15 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {documentToCancel && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">Documento:</p>
                <p className="text-xs text-muted-foreground">Tipo: {documentToCancel.documentType}</p>
                <p className="text-xs text-muted-foreground">Chave: {documentToCancel.accessKey || 'N/A'}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Motivo do Cancelamento *</Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Erro na digitação dos dados do cliente"
                rows={4}
                minLength={15}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 15 caracteres. {cancelReason.length}/15
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setDocumentToCancel(null);
                setCancelReason('');
              }}
              disabled={cancelling}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!documentToCancel) return;
                
                if (cancelReason.trim().length < 15) {
                  toast.error('O motivo do cancelamento deve ter pelo menos 15 caracteres');
                  return;
                }

                setCancelling(true);
                try {
                  await api.post(`/fiscal/${documentToCancel.id}/cancel`, {
                    reason: cancelReason.trim(),
                  });
                  toast.success('Nota fiscal cancelada com sucesso!');
                  setCancelDialogOpen(false);
                  setDocumentToCancel(null);
                  setCancelReason('');
                  await refetch();
                } catch (error: any) {
                  handleApiError(error);
                } finally {
                  setCancelling(false);
                }
              }}
              disabled={cancelling || cancelReason.trim().length < 15}
            >
              {cancelling ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Confirmar Cancelamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <NfeSuccessModal
        open={nfeSuccessOpen}
        onOpenChange={(open) => {
          setNfeSuccessOpen(open);
          if (!open) setNfeSuccessDoc(null);
        }}
        nfe={nfeSuccessDoc}
      />
    </div>
  );
}