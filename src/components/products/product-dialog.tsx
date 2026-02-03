import { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Plus, X, Search } from 'lucide-react';
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
import { DatePicker } from '../ui/date-picker';
import { ConfirmationModal } from '../ui/confirmation-modal';
import { NCMSearchModal } from './ncm-search-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../hooks/useAuth';
import { handleApiError } from '../../lib/handleApiError';
import { productFormSchema } from '../../lib/validations';
import { generateCoherentUUID } from '../../lib/utils';
import { getImageUrl } from '../../lib/image-utils';
import { productApi } from '../../lib/api-endpoints';
import type { Product, CreateProductDto } from '../../types';
import { useDeviceStore } from '../../store/device-store';
import {
  MAX_PRODUCT_PHOTOS,
  ACCEPTED_IMAGE_STRING,
  validateImageFile,
  UPLOAD_ERROR_MESSAGES,
} from '../../lib/constants/upload.constants';

// Função utilitária para garantir conversão correta de dados
function sanitizeProductData(data: any) {
  const sanitized: any = {
    name: String(data.name || ''),
    barcode: String(data.barcode || ''),
    price: Number(data.price || 0),
    stockQuantity: Number(data.stockQuantity || 0),
  };

  // Preço de custo é opcional, mas quando existir deve seguir para o backend
  if (data.costPrice !== undefined && data.costPrice !== null && String(data.costPrice).trim() !== '') {
    sanitized.costPrice = Number(data.costPrice);
  }

  // Quantidade mínima também deve ser enviada quando informada
  if (data.minStockQuantity !== undefined && data.minStockQuantity !== null && String(data.minStockQuantity).trim() !== '') {
    sanitized.minStockQuantity = Number(data.minStockQuantity);
  }

  // Alerta de estoque baixo (default 3 no backend se não informado)
  if (data.lowStockAlertThreshold !== undefined && data.lowStockAlertThreshold !== null && String(data.lowStockAlertThreshold).trim() !== '') {
    sanitized.lowStockAlertThreshold = Number(data.lowStockAlertThreshold);
  }
  
  // Adicionar campos opcionais apenas se tiverem valor
  if (data.category && String(data.category).trim() !== '') {
    sanitized.category = String(data.category);
  }
  
  // Tratar data de validade - converter null, undefined ou string vazia em undefined (não enviar)
  if (data.expirationDate && String(data.expirationDate).trim() !== '' && data.expirationDate !== 'null' && data.expirationDate !== null) {
    sanitized.expirationDate = String(data.expirationDate);
  }
  
  // Adicionar unidade de medida se fornecida
  if (data.unitOfMeasure && String(data.unitOfMeasure).trim() !== '') {
    sanitized.unitOfMeasure = String(data.unitOfMeasure);
  }
  
  // Adicionar NCM se fornecido (remove caracteres não numéricos)
  if (data.ncm && String(data.ncm).trim() !== '' && String(data.ncm).trim().match(/^\d{8}$/)) {
    sanitized.ncm = String(data.ncm).trim();
  }
  
  // Adicionar CFOP se fornecido (remove caracteres não numéricos)
  if (data.cfop && String(data.cfop).trim() !== '' && String(data.cfop).trim().match(/^\d{4}$/)) {
    sanitized.cfop = String(data.cfop).trim();
  }
  
  return sanitized;
}

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

export function ProductDialog({ open, onClose, product }: ProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [existingPhotosToDelete, setExistingPhotosToDelete] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastCategory, setLastCategory] = useState<string | undefined>(undefined);
  const [confirmationModal, setConfirmationModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const [ncmModalOpen, setNcmModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!product;
  const { api, user } = useAuth();
  const [companyPlan, setCompanyPlan] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    setFocus,
  } = useForm<CreateProductDto>({
    resolver: zodResolver(productFormSchema),
  });

  // Carregar plano da empresa
  useEffect(() => {
    const loadCompanyPlan = async () => {
      try {
        const response = await api.get('/company/my-company');
        setCompanyPlan(response.data?.plan || null);
      } catch (error) {
        console.error('Erro ao carregar plano da empresa:', error);
      }
    };
    
    if (user?.role === 'empresa') {
      loadCompanyPlan();
    }
  }, [api, user]);

  // Salvar categoria quando um produto é editado
  useEffect(() => {
    if (product && product.category) {
      setLastCategory(product.category);
    }
  }, [product]);

  // Resetar formulário quando produto muda
  useEffect(() => {
    if (product) {
      console.log('[ProductDialog] Produto recebido:', product);
      console.log('[ProductDialog] Fotos do produto:', product.photos);
      console.log('[ProductDialog] Tipo das fotos:', typeof product.photos);
      console.log('[ProductDialog] Array das fotos:', Array.isArray(product.photos));
      console.log('[ProductDialog] costPrice recebido:', product.costPrice, 'tipo:', typeof product.costPrice);
      
      reset({
        name: product.name,
        barcode: product.barcode,
        price: product.price,
        stockQuantity: product.stockQuantity,
        category: product.category,
        expirationDate: product.expirationDate ?? undefined,
        unitOfMeasure: (['kg', 'g', 'ml', 'l', 'm', 'cm', 'un'].includes(product.unitOfMeasure || '') 
          ? product.unitOfMeasure 
          : 'un') as 'kg' | 'g' | 'ml' | 'l' | 'm' | 'cm' | 'un',
        ncm: product.ncm || '',
        cfop: product.cfop || '',
        costPrice: product.costPrice ? Number(product.costPrice) : undefined,
        lowStockAlertThreshold: product.lowStockAlertThreshold ?? 3,
      });
    } else {
      // Ao criar novo produto, manter apenas a categoria, limpar todo o resto
      reset({
        name: '',
        barcode: '',
        price: 0,
        stockQuantity: 0,
        category: lastCategory || '',
        expirationDate: undefined,
        unitOfMeasure: 'un',
        ncm: '', // Será preenchido com padrão pelo backend se vazio
        cfop: '', // Será preenchido com padrão pelo backend se vazio
        lowStockAlertThreshold: 3,
      });
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);
      setExistingPhotosToDelete([]);
    }
  }, [product, reset, lastCategory]);

  // Focar automaticamente o campo de código de barras ao abrir o modal
  useEffect(() => {
    if (open) {
      // pequeno timeout para garantir que o campo esteja renderizado
      const t = setTimeout(() => setFocus('barcode'), 50);
      return () => clearTimeout(t);
    }
  }, [open, setFocus]);

  // Limpeza das URLs de pré-visualização quando o componente for desmontado
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  // Calcular total de fotos (existentes + novas)
  const getTotalPhotosCount = () => {
    const existingCount = isEditing 
      ? (product?.photos?.length || 0) - existingPhotosToDelete.length 
      : 0;
    return existingCount + selectedPhotos.length;
  };

  const canAddMorePhotos = () => {
    return getTotalPhotosCount() < MAX_PRODUCT_PHOTOS;
  };

  // Verificar se o plano permite upload de fotos
  const isPlanAllowedForPhotos = () => {
    return companyPlan === 'PRO';
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPlanAllowedForPhotos()) {
      toast.error('Upload de fotos disponível apenas no Plano PRO. Faça upgrade para usar este recurso.');
      event.target.value = '';
      return;
    }
    
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      addPhotos(fileArray);
    }
    // Limpar o input para permitir re-seleção do mesmo arquivo
    event.target.value = '';
  };

  const addPhotos = (files: File[]) => {
    // Verificar limite total de fotos
    const existingPhotosCount = isEditing 
      ? (product?.photos?.length || 0) - existingPhotosToDelete.length 
      : 0;
    const currentNewPhotos = selectedPhotos.length;
    const totalPhotos = existingPhotosCount + currentNewPhotos + files.length;

    if (totalPhotos > MAX_PRODUCT_PHOTOS) {
      toast.error(UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES);
      return;
    }

    // Validar cada arquivo
    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    // Calcular quantas fotos podem ser adicionadas
    const availableSlots = MAX_PRODUCT_PHOTOS - existingPhotosCount - currentNewPhotos;
    const photosToAdd = validFiles.slice(0, availableSlots);

    if (photosToAdd.length < validFiles.length) {
      toast.error(`Apenas ${photosToAdd.length} foto(s) foram adicionadas devido ao limite de ${MAX_PRODUCT_PHOTOS}`);
    }

    // Adicionar fotos válidas
    const newPhotos = [...selectedPhotos, ...photosToAdd];
    setSelectedPhotos(newPhotos);

    // Gerar URLs de pré-visualização
    const newPreviewUrls = photosToAdd.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviewUrls]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    if (!isPlanAllowedForPhotos()) {
      toast.error('Upload de fotos disponível apenas no Plano PRO. Faça upgrade para usar este recurso.');
      return;
    }
    
    const files = event.dataTransfer.files;
    if (files) {
      addPhotos(Array.from(files));
    }
  };

  // Suporte ao leitor de código de barras via teclado (buffer + Enter)
  const {
    barcodeBuffer,
    setBarcodeBuffer,
    scanSuccess,
    setScanSuccess,
  } = useDeviceStore();
  const [lastScanned, setLastScanned] = useState(0);

  // Limpar buffer após inatividade
  useEffect(() => {
    if (!open) return;
    if (barcodeBuffer) {
      const timer = setTimeout(() => setBarcodeBuffer(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [open, barcodeBuffer, setBarcodeBuffer]);

  // Capturar teclado quando o modal estiver aberto
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      // Sempre permitir uso normal quando estiver digitando dentro de inputs do modal,
      // exceto quando a tecla é Enter para finalizar leitura rápida
      if (e.key === 'Enter') {
        const code = barcodeBuffer.trim();
        if (code.length >= 3) {
          const now = Date.now();
          if (now - lastScanned > 400) {
            // Preencher o campo e sinalizar sucesso
            setValue('barcode', code, { shouldValidate: true, shouldDirty: true });
            setFocus('barcode');
            setScanSuccess(true);
            setTimeout(() => setScanSuccess(false), 1200);
            setLastScanned(now);
          }
        }
        setBarcodeBuffer('');
      } else if (e.key && e.key.length === 1) {
        // Acumular caracteres típicos de leitores (rápidos e sequenciais)
        setBarcodeBuffer((s) => {
          const next = s + e.key;
          return next.length > 50 ? next.slice(-50) : next;
        });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, barcodeBuffer, lastScanned, setBarcodeBuffer, setValue, setFocus, setScanSuccess]);

  const openFileDialog = () => {
    if (!isPlanAllowedForPhotos()) {
      toast.error('Upload de fotos disponível apenas no Plano PRO. Faça upgrade para usar este recurso.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleDeleteExistingPhoto = (photoUrl: string) => {
    setConfirmationModal({
      open: true,
      title: 'Excluir Foto',
      description: 'Tem certeza que deseja excluir esta foto? Esta ação não pode ser desfeita.',
      variant: 'destructive',
      onConfirm: () => {
        setExistingPhotosToDelete(prev => [...prev, photoUrl]);
        toast.success('Foto marcada para exclusão');
        setConfirmationModal(prev => ({ ...prev, open: false }));
      },
    });
  };

  const handleRestoreExistingPhoto = (photoUrl: string) => {
    setExistingPhotosToDelete(prev => prev.filter(url => url !== photoUrl));
    toast.success('Foto restaurada');
  };

  const handleDeleteAllPhotos = () => {
    setConfirmationModal({
      open: true,
      title: 'Excluir Todas as Fotos',
      description: `Tem certeza que deseja marcar todas as ${product?.photos?.length || 0} fotos para exclusão? Esta ação não pode ser desfeita.`,
      variant: 'destructive',
      onConfirm: () => {
        setExistingPhotosToDelete(product?.photos || []);
        toast.success('Todas as fotos foram marcadas para exclusão');
        setConfirmationModal(prev => ({ ...prev, open: false }));
      },
    });
  };

  const handleRestoreAllPhotos = () => {
    setConfirmationModal({
      open: true,
      title: 'Restaurar Todas as Fotos',
      description: 'Tem certeza que deseja restaurar todas as fotos marcadas para exclusão?',
      variant: 'default',
      onConfirm: () => {
        setExistingPhotosToDelete([]);
        toast.success('Todas as fotos foram restauradas');
        setConfirmationModal(prev => ({ ...prev, open: false }));
      },
    });
  };

  const onSubmit = async (data: CreateProductDto) => {
    setLoading(true);
    try {
      if (isEditing) {
        console.log('[ProductDialog] Editando produto - ID original:', product!.id);
        console.log('[ProductDialog] Produto completo:', product);
        
        // Usar o ID original do produto (o backend espera o ID do Prisma)
        const productId = product!.id;
        console.log('[ProductDialog] Usando ID original do Prisma:', productId);
        console.log('[ProductDialog] Tipo do ID:', typeof productId);
        console.log('[ProductDialog] Comprimento do ID:', productId.length);
        
        // Criar objeto limpo apenas com os campos necessários
        const dataToSend = sanitizeProductData(data);
        
        // Log detalhado
        console.log('[ProductDialog] Dados originais do formulário:', data);
        console.log('[ProductDialog] Dados limpos para envio:', dataToSend);
        console.log('[ProductDialog] Tipo do name:', typeof dataToSend.name);
        console.log('[ProductDialog] Valor do name:', dataToSend.name);
        console.log('[ProductDialog] JSON.stringify do name:', JSON.stringify(dataToSend.name));
        console.log('[ProductDialog] ID do produto:', productId);
        
        try {
          // Verificar se o ID é válido antes de fazer a requisição
          if (!productId || productId.length < 10) {
            throw new Error('ID do produto inválido');
          }
          
          console.log('[ProductDialog] Fazendo requisição de atualização para:', `/product/${productId}`);
          console.log('[ProductDialog] Dados sendo enviados:', dataToSend);
          
          // Verificar se há fotos para adicionar ou remover
          const hasPhotoChanges = selectedPhotos.length > 0 || existingPhotosToDelete.length > 0;
          
          if (hasPhotoChanges) {
            // Usar endpoint upload-and-update quando há mudanças em fotos
            console.log('[ProductDialog] Atualizando produto com fotos usando /product/:id/upload-and-update');
            
            const formData = new FormData();
            
            // Adicionar dados do produto
            formData.append('name', dataToSend.name);
            formData.append('barcode', dataToSend.barcode);
            formData.append('price', dataToSend.price.toString());
            formData.append('stockQuantity', dataToSend.stockQuantity.toString());
            
            if (dataToSend.category) formData.append('category', dataToSend.category);
            if (dataToSend.expirationDate) formData.append('expirationDate', dataToSend.expirationDate);
            if (dataToSend.unitOfMeasure) formData.append('unitOfMeasure', dataToSend.unitOfMeasure);
            if (dataToSend.cfop) formData.append('cfop', dataToSend.cfop);
            if (dataToSend.ncm) formData.append('ncm', dataToSend.ncm);
            if (data.costPrice !== undefined && data.costPrice !== null) {
              formData.append('costPrice', Number(data.costPrice || 0).toString());
            }
            if (data.minStockQuantity !== undefined && data.minStockQuantity !== null) {
              formData.append('minStockQuantity', Number(data.minStockQuantity || 0).toString());
            }
            if (data.lowStockAlertThreshold !== undefined && data.lowStockAlertThreshold !== null) {
              formData.append('lowStockAlertThreshold', Number(data.lowStockAlertThreshold ?? 3).toString());
            }
            
            // Adicionar fotos novas
            selectedPhotos.forEach((photo) => {
              formData.append('photos', photo);
            });
            
            // Adicionar fotos para deletar
            if (existingPhotosToDelete.length > 0) {
              existingPhotosToDelete.forEach((photoUrl) => {
                formData.append('photosToDelete', photoUrl);
              });
            }
            
            console.log('[ProductDialog] Fotos novas:', selectedPhotos.length);
            console.log('[ProductDialog] Fotos para deletar:', existingPhotosToDelete.length);
            
            await productApi.updateWithPhotos(productId, formData);
            toast.success('Produto atualizado com sucesso!');
          } else {
            // Usar endpoint padrão quando não há mudanças em fotos
            console.log('[ProductDialog] Atualizando produto sem mudanças em fotos');
            await productApi.update(productId, dataToSend);
            toast.success('Produto atualizado com sucesso!');
          }
        } catch (patchError) {
          console.error('[ProductDialog] Erro específico na edição:', patchError);
          throw patchError;
        }
      } else {
        // Para criação de produto
        if (selectedPhotos.length > 0) {
          // Usar endpoint específico para upload e criação quando há fotos
          console.log('[ProductDialog] Criando produto com fotos usando /product/upload-and-create');
          
          const formData = new FormData();
          
          // Adicionar dados do produto
          const generatedId = generateCoherentUUID(); // Gerar UUID coerente com backend
          const sanitizedData = sanitizeProductData(data);
          
          formData.append('id', generatedId);
          formData.append('name', sanitizedData.name);
          formData.append('barcode', sanitizedData.barcode);
          formData.append('price', sanitizedData.price.toString());
          formData.append('stockQuantity', sanitizedData.stockQuantity.toString());
          
          if (sanitizedData.category) formData.append('category', sanitizedData.category);
          if (data.description) formData.append('description', String(data.description));
          if (sanitizedData.expirationDate) formData.append('expirationDate', sanitizedData.expirationDate);
          if (data.costPrice !== undefined && data.costPrice !== null) formData.append('costPrice', Number(data.costPrice || 0).toString());
          if (data.minStockQuantity !== undefined && data.minStockQuantity !== null) formData.append('minStockQuantity', Number(data.minStockQuantity || 0).toString());
          if (data.lowStockAlertThreshold !== undefined && data.lowStockAlertThreshold !== null) formData.append('lowStockAlertThreshold', Number(data.lowStockAlertThreshold ?? 3).toString());
          if (sanitizedData.unitOfMeasure) formData.append('unitOfMeasure', sanitizedData.unitOfMeasure);
          if (sanitizedData.cfop) formData.append('cfop', sanitizedData.cfop);
          if (sanitizedData.ncm) formData.append('ncm', sanitizedData.ncm);
          
          // Adicionar fotos
          selectedPhotos.forEach((photo, index) => {
            formData.append(`photos`, photo);
          });
          
          console.log('[ProductDialog] UUID gerado para novo produto com fotos:', generatedId);
          console.log('[ProductDialog] Dados do FormData:', {
            id: generatedId,
            name: data.name,
            barcode: data.barcode,
            price: data.price,
            stockQuantity: data.stockQuantity,
            unitOfMeasure: sanitizedData.unitOfMeasure,
            photosCount: selectedPhotos.length
          });
          
          await productApi.createWithPhotos(formData);
        } else {
          // Usar endpoint padrão quando não há fotos
          console.log('[ProductDialog] Criando produto sem fotos usando /product');
          
          const productData = {
            id: generateCoherentUUID(), // Gerar UUID coerente com backend
            ...sanitizeProductData(data),
          };
          
          console.log('[ProductDialog] UUID gerado para novo produto:', productData.id);
          console.log('[ProductDialog] Dados para criação:', productData);
          console.log('[ProductDialog] Tipo do name:', typeof productData.name);
          console.log('[ProductDialog] Valor do name:', productData.name);
          console.log('[ProductDialog] JSON.stringify do name:', JSON.stringify(productData.name));
          
          await productApi.create(productData);
        }
        
        // Salvar a categoria do produto criado para usar no próximo produto
        if (data.category) {
          setLastCategory(data.category);
        }
        
        toast.success('Produto criado com sucesso!');
      }
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEditing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing
              ? 'Atualize as informações do produto'
              : 'Preencha os dados do novo produto'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name" className="text-foreground">Nome *</Label>
              <Input id="name" {...register('name')} disabled={loading} className="text-foreground" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode" className="text-foreground">Código de Barras *</Label>
              <Input id="barcode" {...register('barcode')} disabled={loading} className="text-foreground" />
              {errors.barcode && (
                <p className="text-sm text-destructive">{errors.barcode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground">Categoria</Label>
              <Input id="category" {...register('category')} disabled={loading} className="text-foreground" />
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-foreground">Preço de Venda *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('price', { 
                  setValueAs: (v) =>
                    v === '' || v === undefined
                      ? undefined
                      : (isNaN(Number(v)) ? undefined : Number(v)),
                })}
                onFocus={(e) => {
                  // Se o valor for 0, limpar o campo ao focar
                  if (Number(e.target.value) === 0) {
                    e.target.value = '';
                  }
                }}
                disabled={loading}
                className="text-foreground"
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockQuantity" className="text-foreground">Quantidade em Estoque *</Label>
              <Input
                id="stockQuantity"
                type="number"
                min="0"
                placeholder="0"
                {...register('stockQuantity', { 
                  setValueAs: (v) =>
                    v === '' || v === undefined
                      ? undefined
                      : (isNaN(Number(v)) ? undefined : Number(v)),
                })}
                onFocus={(e) => {
                  // Se o valor for 0, limpar o campo ao focar
                  if (Number(e.target.value) === 0) {
                    e.target.value = '';
                  }
                }}
                disabled={loading}
                className="text-foreground"
              />
              {errors.stockQuantity && (
                <p className="text-sm text-destructive">{errors.stockQuantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowStockAlertThreshold" className="text-foreground">Alerta de estoque baixo</Label>
              <Input
                id="lowStockAlertThreshold"
                type="number"
                min="0"
                placeholder="3"
                {...register('lowStockAlertThreshold', {
                  setValueAs: (v) =>
                    v === '' || v === undefined
                      ? undefined
                      : (isNaN(Number(v)) ? undefined : Number(v)),
                })}
                disabled={loading}
                className="text-foreground"
              />
              <p className="text-xs text-muted-foreground">Avisar quando estoque for menor ou igual a esta quantidade (padrão: 3)</p>
              {errors.lowStockAlertThreshold && (
                <p className="text-sm text-destructive">{errors.lowStockAlertThreshold.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitOfMeasure" className="text-foreground">Unidade de Medida</Label>
              <Controller
                name="unitOfMeasure"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={(value) => field.onChange(value)} 
                    value={field.value || 'un'}
                  >
                    <SelectTrigger id="unitOfMeasure" className="text-foreground">
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidade (un)</SelectItem>
                      <SelectItem value="kg">Kilograma (kg)</SelectItem>
                      <SelectItem value="g">Grama (g)</SelectItem>
                      <SelectItem value="ml">Mililitro (ml)</SelectItem>
                      <SelectItem value="l">Litro (l)</SelectItem>
                      <SelectItem value="m">Metro (m)</SelectItem>
                      <SelectItem value="cm">Centímetro (cm)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.unitOfMeasure && (
                <p className="text-sm text-destructive">{errors.unitOfMeasure.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expirationDate" className="text-foreground">Data de Validade</Label>
              <Controller
                name="expirationDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    date={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date ? date.toISOString().split('T')[0] : undefined)}
                    placeholder="Selecione a data de validade"
                    disabled={loading}
                  />
                )}
              />
              {errors.expirationDate && (
                <p className="text-sm text-destructive">{errors.expirationDate.message}</p>
              )}
            </div>

            {/* Aviso sobre campos fiscais */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold mb-1">
                ⚠️ Campos Fiscais para Nota Fiscal
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 ml-4 list-disc">
                <li><strong>CFOP:</strong> Obrigatório de 4 dígitos para emitir NF-e</li>
                <li><strong>NCM:</strong> Necessário de 8 dígitos (sistema usa código genérico se não informado)</li>
                <li>Recomendamos preencher ambos para evitar problemas na emissão fiscal</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cfop" className="text-foreground">
                  CFOP
                  <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">(Obrigatório para NF-e)</span>
                </Label>
                <Input
                  id="cfop"
                  placeholder="5102"
                  maxLength={4}
                  {...register('cfop', {
                    onChange: (e) => {
                      // Permite apenas números
                      e.target.value = e.target.value.replace(/\D/g, '');
                    }
                  })}
                  disabled={loading}
                  className="text-foreground"
                />
                {errors.cfop && (
                  <p className="text-sm text-destructive">{errors.cfop.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  4 dígitos obrigatórios - Ex.: 5102 (venda dentro do estado)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ncm" className="text-foreground">
                  NCM
                  <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">(Necessário para NF-e)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="ncm"
                    placeholder="85171231"
                    maxLength={8}
                    {...register('ncm', {
                      onChange: (e) => {
                        // Permite apenas números
                        e.target.value = e.target.value.replace(/\D/g, '');
                      }
                    })}
                    disabled={loading}
                    className="text-foreground flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNcmModalOpen(true)}
                    disabled={loading}
                    title="Buscar NCM"
                    className="shrink-0"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {errors.ncm && (
                  <p className="text-sm text-destructive">{errors.ncm.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  8 dígitos - Nomenclatura Comum do Mercosul
                </p>
              </div>
            </div>

          </div>

          {/* Campo de Upload de Fotos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="photos" className="text-foreground">
                {isEditing ? 'Adicionar Mais Fotos' : 'Fotos do Produto'}
                {!isPlanAllowedForPhotos() && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                    (Disponível apenas no Plano PRO)
                  </span>
                )}
              </Label>
              <span className="text-sm text-muted-foreground">
                {getTotalPhotosCount()} / {MAX_PRODUCT_PHOTOS}
              </span>
            </div>
            
            {/* Aviso de plano para BASIC e PLUS */}
            {!isPlanAllowedForPhotos() && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>🔒 Recurso Bloqueado:</strong> O upload de fotos de produtos está disponível apenas para empresas do Plano PRO.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Faça upgrade do seu plano para utilizar este recurso e melhorar a apresentação dos seus produtos.
                </p>
              </div>
            )}
            
            
            {/* Mostrar fotos existentes quando editando */}
            {isPlanAllowedForPhotos() && isEditing && product?.photos && product.photos.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-muted-foreground mb-2">
                  Fotos existentes ({product.photos.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.photos.map((photoUrl, index) => {
                    console.log(`[ProductDialog] Renderizando foto ${index}:`, photoUrl);
                    const isMarkedForDeletion = existingPhotosToDelete.includes(photoUrl);
                    
                    const fullImageUrl = getImageUrl(photoUrl);
                    console.log(`[ProductDialog] URL completa da foto ${index}:`, fullImageUrl);
                    
                    return (
                      <div key={`existing-${index}`} className="relative group">
                        <div className={`w-16 h-16 rounded border flex items-center justify-center transition-all duration-200 ${
                          isMarkedForDeletion 
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                            : 'border-border bg-muted group-hover:border-border/80'
                        }`}>
                          <img
                            src={fullImageUrl || undefined}
                            alt={`Foto existente ${index + 1}`}
                            className={`w-full h-full object-cover rounded transition-all duration-200 ${
                              isMarkedForDeletion 
                                ? 'opacity-50 grayscale' 
                                : ''
                            }`}
                            onLoad={() => console.log(`[ProductDialog] Foto ${index} carregada com sucesso:`, fullImageUrl)}
                            onError={(e) => {
                              console.error(`[ProductDialog] Erro ao carregar foto ${index}:`, {
                                originalUrl: photoUrl,
                                fullUrl: fullImageUrl,
                                error: e
                              });
                              // Mostrar placeholder quando a imagem falha ao carregar
                              const imgElement = e.target as HTMLImageElement;
                              imgElement.style.display = 'none';
                              const placeholder = imgElement.nextElementSibling as HTMLElement;
                              if (placeholder) {
                                placeholder.style.display = 'flex';
                              }
                            }}
                          />
                          {/* Placeholder quando a imagem não carrega */}
                          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs hidden">
                            <span>Erro</span>
                          </div>
                        </div>
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {index + 1}
                        </div>
                        
                        {/* Botão X que aparece no hover */}
                        {!isMarkedForDeletion && (
                          <button
                            type="button"
                            className="absolute inset-0 bg-black bg-opacity-50 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                            onClick={() => handleDeleteExistingPhoto(photoUrl)}
                            title="Excluir foto"
                          >
                            <X size={20} className="text-white" />
                          </button>
                        )}
                        
                        {/* Botão de restaurar para fotos marcadas para exclusão */}
                        {isMarkedForDeletion && (
                          <button
                            type="button"
                            className="absolute inset-0 bg-green-500 bg-opacity-90 rounded flex items-center justify-center hover:bg-opacity-100 transition-all duration-200"
                            onClick={() => handleRestoreExistingPhoto(photoUrl)}
                            title="Restaurar foto"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                              <path d="M3 12a9 9 0 1 0 9-9c2.52 0 4.93 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {existingPhotosToDelete.length > 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {existingPhotosToDelete.length} foto(s) marcada(s) para exclusão
                    </p>
                    <button
                      type="button"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-500 underline"
                      onClick={handleRestoreAllPhotos}
                    >
                      Restaurar todas
                    </button>
                  </div>
                )}
                
                {product.photos && product.photos.length > 0 && existingPhotosToDelete.length === 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-800 underline"
                      onClick={handleDeleteAllPhotos}
                    >
                      Excluir todas as fotos
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Input de arquivo oculto */}
            {isPlanAllowedForPhotos() && (
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_IMAGE_STRING}
                onChange={handlePhotoChange}
                disabled={loading || !canAddMorePhotos()}
                className="hidden"
              />
            )}
            
            {/* Input customizado */}
            {isPlanAllowedForPhotos() && (
              <div
                  className={`
                  w-16 h-16 border-2 border-dashed rounded-lg
                  flex flex-col items-center justify-center
                  transition-all duration-200 ease-in-out
                  ${!canAddMorePhotos() 
                    ? 'opacity-50 cursor-not-allowed border-muted' 
                    : isDragOver 
                      ? 'border-primary bg-primary/5 scale-105 cursor-pointer' 
                      : 'border-border hover:border-primary hover:bg-muted cursor-pointer'
                  }
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={canAddMorePhotos() && !loading ? openFileDialog : undefined}
                onDragOver={canAddMorePhotos() && !loading ? handleDragOver : undefined}
                onDragLeave={canAddMorePhotos() && !loading ? handleDragLeave : undefined}
                onDrop={canAddMorePhotos() && !loading ? handleDrop : undefined}
                title={!canAddMorePhotos() ? 'Limite máximo de fotos atingido' : 'Clique ou arraste fotos aqui'}
              >
                <Plus 
                  size={16} 
                  className={`
                    text-muted-foreground transition-colors duration-200
                    ${isDragOver ? 'text-primary' : 'group-hover:text-primary'}
                  `} 
                />
                <span className="text-xs text-muted-foreground mt-0.5 text-center px-0.5 leading-tight">
                  {isDragOver ? 'Solte' : '+'}
                </span>
              </div>
            )}
            
            {isPlanAllowedForPhotos() && !canAddMorePhotos() && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Limite máximo de {MAX_PRODUCT_PHOTOS} fotos atingido
              </p>
            )}
            {isPlanAllowedForPhotos() && isEditing && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Passe o mouse sobre uma foto existente para excluí-la</p>
                <p>• Fotos marcadas para exclusão ficam com borda vermelha</p>
                <p>• Clique no ícone de restaurar para cancelar a exclusão</p>
                <p>• As novas fotos serão adicionadas ao produto</p>
              </div>
            )}
            {isPlanAllowedForPhotos() && selectedPhotos.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedPhotos.length} foto(s) selecionada(s):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photoPreviewUrls[index]}
                        alt={`Preview ${index + 1}`}
                        className="w-16 h-16 object-cover rounded border border-border"
                      />
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors"
                           onClick={() => {
                             const newPhotos = selectedPhotos.filter((_, i) => i !== index);
                             const newPreviewUrls = photoPreviewUrls.filter((_, i) => i !== index);
                             setSelectedPhotos(newPhotos);
                             setPhotoPreviewUrls(newPreviewUrls);
                             // Revogar a URL que está sendo removida
                             URL.revokeObjectURL(photoPreviewUrls[index]);
                           }}>
                        <X size={12} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate w-16">
                        {photo.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="text-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Modal de Confirmação */}
      <ConfirmationModal
        open={confirmationModal.open}
        onClose={() => setConfirmationModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        description={confirmationModal.description}
        variant={confirmationModal.variant}
        confirmText={confirmationModal.variant === 'destructive' ? 'Excluir' : 'Confirmar'}
        cancelText="Cancelar"
      />

      {/* Modal de Busca NCM */}
      <NCMSearchModal
        open={ncmModalOpen}
        onClose={() => setNcmModalOpen(false)}
        onSelect={(code: string) => {
          setValue('ncm', code, { shouldValidate: true, shouldDirty: true });
          setNcmModalOpen(false);
        }}
      />
    </Dialog>
  );
}

