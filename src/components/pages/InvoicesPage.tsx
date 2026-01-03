import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, RefreshCw, Search, PlusCircle, Trash2, Plus, Package, XCircle, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input, InputWithIcon } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { handleApiError } from '@/lib/handleApiError';
import { formatCurrency, formatDateTime, downloadFile } from '@/lib/utils';
import { AcquirerCnpjSelect } from '../ui/acquirer-cnpj-select';

interface FiscalDoc {
  id: string;
  documentType: 'NFE' | 'NFSE' | string;
  accessKey?: string;
  status?: string;
  total?: number;
  createdAt?: string;
}

interface NFeItem {
  description: string;
  quantity: number;
  unitPrice: number;
  ncm: string;
  cfop: string;
  unitOfMeasure: string;
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
  
  // Endereço do destinatário
  const [recipientZipCode, setRecipientZipCode] = useState('');
  const [recipientStreet, setRecipientStreet] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [recipientComplement, setRecipientComplement] = useState('');
  const [recipientDistrict, setRecipientDistrict] = useState('');
  const [recipientCity, setRecipientCity] = useState('');
  const [recipientState, setRecipientState] = useState('');
  
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

  // Estados para o diálogo de busca de produtos
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // Estados para cancelamento
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [documentToCancel, setDocumentToCancel] = useState<FiscalDoc | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // Estados para consulta de status
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fiscal-outbound', search],
    queryFn: async () => (await api.get('/fiscal', { params: { search, documentType: 'outbound' } })).data,
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

  // Protege rota: apenas empresa deve ver
  useEffect(() => {
    if (user && user.role !== 'empresa') {
      toast.error('Apenas empresas podem acessar esta página');
    }
  }, [user]);

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
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const addProductsToItems = () => {
    if (selectedProducts.length === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }

    const products = productsData?.products || [];
    const newItems = selectedProducts.map(productId => {
      const product = products.find((p: Product) => p.id === productId);
      if (!product) return null;

      return {
        description: product.name,
        quantity: 1,
        unitPrice: Number(product.price),
        ncm: product.ncm || '99999999',
        cfop: product.cfop || '5102',
        unitOfMeasure: 'UN'
      };
    }).filter(item => item !== null) as NFeItem[];

    // Remove o item vazio inicial se existir
    const filteredItems = items.filter(item => item.description.trim() !== '');
    setItems([...filteredItems, ...newItems]);
    
    // Reset do diálogo
    setProductSearchOpen(false);
    setSelectedProducts([]);
    setProductSearch('');
    
    toast.success(`${newItems.length} produto(s) adicionado(s)`);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

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
    setRecipientZipCode('');
    setRecipientStreet('');
    setRecipientNumber('');
    setRecipientComplement('');
    setRecipientDistrict('');
    setRecipientCity('');
    setRecipientState('');
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
    setEmitOpen(true);
  };

  const submitEmit = async () => {
    if (!emitType) return;
    
    // Validações básicas
    if (emissionMode === 'sale' && !saleId.trim()) {
      toast.error('Informe o ID da venda');
      return;
    }
    
    if (emissionMode === 'manual') {
      // Validar CPF/CNPJ (remover formatação e verificar tamanho)
      const documentCleaned = recipientDocument.replace(/\D/g, '');
      if (!documentCleaned || documentCleaned.length < 11) {
        toast.error('Informe um CPF/CNPJ válido do destinatário');
        return;
      }
      if (recipientType === 'cpf' && documentCleaned.length !== 11) {
        toast.error('CPF deve ter 11 dígitos');
        return;
      }
      if (recipientType === 'cnpj' && documentCleaned.length !== 14) {
        toast.error('CNPJ deve ter 14 dígitos');
        return;
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
        if (!item.description.trim()) {
          toast.error(`Item ${i + 1}: Informe a descrição do produto/serviço`);
          return;
        }
        if (item.quantity <= 0) {
          toast.error(`Item ${i + 1}: A quantidade deve ser maior que zero`);
          return;
        }
        if (item.unitPrice <= 0) {
          toast.error(`Item ${i + 1}: O valor unitário deve ser maior que zero`);
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
      } else {
        // Emissão manual com dados completos
        // Limpar formatação do documento (CPF/CNPJ)
        const documentCleaned = recipientDocument.replace(/\D/g, '');
        
        payload.recipient = {
          document: documentCleaned,
          name: recipientName.trim(),
          email: recipientEmail?.trim() || undefined,
          phone: recipientPhone?.replace(/\D/g, '') || undefined,
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
          
          return {
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            ncm: ncmCleaned || undefined,
            cfop: cfopCleaned,
            unitOfMeasure: item.unitOfMeasure.trim(),
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
          if (!cardBrand) missingFields.push('Bandeira do Cartão');
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
          payload.payment.cardBrand = cardBrand;
          payload.payment.cardOperationType = cardOperationType;
        }
        
        if (additionalInfo.trim()) {
          payload.additionalInfo = additionalInfo.trim();
        }
      }
      
      await api.post('/fiscal/nfe', payload);
      toast.success('NF-e emitida com sucesso');
      setEmitOpen(false);
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
        <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais</h1>
          <p className="text-muted-foreground">Visualize e baixe suas NF-e</p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'empresa' && (
            <Button onClick={() => openEmitDialog('nfe')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Emitir NF-e
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="text-foreground">
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
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
                  <td className="px-4 py-2 text-right text-foreground">{doc.total != null ? formatCurrency(doc.total) : '-'}</td>
                  <td className="px-4 py-2 text-foreground">{doc.createdAt ? formatDateTime(doc.createdAt) : '-'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
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
                        disabled={checkingStatus === doc.id || !doc.accessKey}
                        title="Consultar status na SEFAZ"
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
                        onClick={async () => {
                          try {
                            const response = await api.get(`/fiscal/${doc.id}/download`, { params: { format: 'pdf' }, responseType: 'blob' });
                            const blob = response.data as Blob;
                            downloadFile(blob, `documento-${doc.id}.pdf`);
                          } catch (e) {
                            console.error(e);
                            toast.error('Não foi possível baixar o PDF');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" /> PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await api.get(`/fiscal/${doc.id}/download`, { params: { format: 'xml' }, responseType: 'blob' });
                            const blob = response.data as Blob;
                            downloadFile(blob, `documento-${doc.id}.xml`);
                          } catch (e) {
                            console.error(e);
                            toast.error('Não foi possível baixar o XML');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" /> XML
                      </Button>
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
                  Informe o ID de uma venda existente para emitir a NF-e com os dados dela
                </p>
              </div>
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
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor Unitário (R$) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
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
                        <strong>Subtotal:</strong> {formatCurrency(item.quantity * item.unitPrice)}
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
                          Dados do Cartão (NT 2025.001 - Obrigatório)
                        </Label>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="cardBrand" className="text-xs">
                            Bandeira *
                          </Label>
                          <Select
                            value={cardBrand}
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
                          selectedProducts.includes(product.id) ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => toggleProductSelection(product.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(product.id)}
                                onChange={() => toggleProductSelection(product.id)}
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

      {/* Modal de Cancelamento */}
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
    </div>
  );
}