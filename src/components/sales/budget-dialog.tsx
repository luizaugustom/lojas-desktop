import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Calendar, FileText, User, Phone, Mail, CreditCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input, InputWithIcon } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { formatCurrency } from '../../lib/utils-clean';
import { useCartStore } from '../../store/cart-store';
import { useAuth } from '../../contexts/AuthContext';
import { budgetApi, sellerApi } from '../../lib/api-endpoints';
import type { Seller } from '../../types';
import { logger } from '@/lib/logger';

interface BudgetDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BudgetDialog({ open, onClose, onSuccess }: BudgetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCpfCnpj, setClientCpfCnpj] = useState('');
  const [notes, setNotes] = useState('');
  const [validityDays, setValidityDays] = useState('7');
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  
  const { items, getTotal } = useCartStore();
  const { user, api } = useAuth();
  const isCompany = user?.role === 'empresa';

  const total = getTotal();

  useEffect(() => {
    if (open && isCompany && sellers.length === 0) {
      loadSellers();
    }
  }, [open, isCompany]);

  useEffect(() => {
    if (!open) {
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setClientCpfCnpj('');
      setNotes('');
      setValidityDays('7');
      setSelectedSellerId('');
    }
  }, [open]);

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
      
      setSellers(sellersData);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
      toast.error('Erro ao carregar lista de vendedores');
    } finally {
      setLoadingSellers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('O carrinho está vazio!');
      return;
    }

    if (isCompany && !selectedSellerId) {
      toast.error('Selecione um vendedor!');
      return;
    }

    const validityDaysNum = parseInt(validityDays);
    if (isNaN(validityDaysNum) || validityDaysNum < 1) {
      toast.error('Validade deve ser de pelo menos 1 dia!');
      return;
    }

    setLoading(true);
    try {
      // Calcular data de validade
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validityDaysNum);
      validUntil.setHours(23, 59, 59, 999);

      // Preparar dados do orçamento
      const budgetData: any = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        validUntil: validUntil.toISOString(),
      };

      // Adicionar campos opcionais apenas se tiverem valor
      if (clientName && clientName.trim()) {
        budgetData.clientName = clientName.trim();
      }
      if (clientPhone && clientPhone.trim()) {
        budgetData.clientPhone = clientPhone.trim();
      }
      if (clientEmail && clientEmail.trim()) {
        budgetData.clientEmail = clientEmail.trim();
      }
      if (clientCpfCnpj && clientCpfCnpj.trim()) {
        budgetData.clientCpfCnpj = clientCpfCnpj.trim();
      }
      if (notes && notes.trim()) {
        budgetData.notes = notes.trim();
      }
      // Se for empresa, usar o vendedor selecionado
      if (isCompany && selectedSellerId) {
        budgetData.sellerId = selectedSellerId;
      } else if (user?.role === 'vendedor' && user.id) {
        // Se for vendedor, usar seu próprio ID
        budgetData.sellerId = user.id;
      }

      logger.log('[Budget] Criando orçamento:', budgetData);

      await budgetApi.create(budgetData);
      toast.success('Orçamento criado com sucesso!');
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar orçamento:', error);
      toast.error(error?.response?.data?.message || 'Erro ao criar orçamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Criar Orçamento
          </DialogTitle>
          <DialogDescription>
            Preencha as informações para criar um novo orçamento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resumo dos Itens */}
          <div className="space-y-2">
            <h3 className="font-medium">Itens do Orçamento</h3>
            <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum item no carrinho
                </p>
              ) : (
                items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{item.product.name}</span>
                      <span className="text-muted-foreground ml-2">
                        x{item.quantity}
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between text-base font-bold">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Seleção de Vendedor (apenas para empresas) */}
          {isCompany && (
            <div className="space-y-2">
              <Label htmlFor="seller">Vendedor *</Label>
              <Select
                value={selectedSellerId}
                onValueChange={setSelectedSellerId}
                disabled={loadingSellers || loading}
              >
                <SelectTrigger id="seller">
                  <SelectValue placeholder={loadingSellers ? 'Carregando vendedores...' : 'Selecione um vendedor'} />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sellers.length === 0 && !loadingSellers && (
                <p className="text-xs text-muted-foreground">
                  Nenhum vendedor cadastrado. Cadastre um vendedor antes de criar o orçamento.
                </p>
              )}
            </div>
          )}

          {/* Dados do Cliente */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados do Cliente (Opcional)
            </h3>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="clientName">Nome do Cliente</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientPhone">Telefone</Label>
                  <InputWithIcon
                    id="clientPhone"
                    icon={<Phone className="h-4 w-4" />}
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="clientEmail">Email</Label>
                  <InputWithIcon
                    id="clientEmail"
                    type="email"
                    icon={<Mail className="h-4 w-4" />}
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="clientCpfCnpj">CPF/CNPJ</Label>
                <InputWithIcon
                  id="clientCpfCnpj"
                  icon={<CreditCard className="h-4 w-4" />}
                  value={clientCpfCnpj}
                  onChange={(e) => setClientCpfCnpj(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
          </div>

          {/* Validade e Observações */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="validityDays">Validade do Orçamento (dias)</Label>
              <InputWithIcon
                id="validityDays"
                type="number"
                min="1"
                icon={<Calendar className="h-4 w-4" />}
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Válido até {new Date(Date.now() + parseInt(validityDays || '0') * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais sobre o orçamento..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || items.length === 0 || (isCompany && !selectedSellerId)}>
              {loading ? 'Criando...' : 'Criar Orçamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

