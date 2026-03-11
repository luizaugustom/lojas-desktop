import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '../../hooks/useAuth';
import { handleApiError } from '../../lib/handleApiError';
import { customerSchema } from '../../lib/validations';
import type { Customer, CreateCustomerDto } from '../../types';

interface CustomerDialogProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

export function CustomerDialog({ open, onClose, customer }: CustomerDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!customer;
  const { api } = useAuth();

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const formatZipCode = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    } else {
      return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    e.target.value = formatted;
  };

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatZipCode(e.target.value);
    e.target.value = formatted;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCustomerDto>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        cpfCnpj: customer.cpfCnpj,
        street: customer.address?.street,
        number: customer.address?.number,
        complement: customer.address?.complement,
        city: customer.address?.city,
        state: customer.address?.state,
        zipCode: customer.address?.zipCode,
      });
    } else {
      reset({
        name: '',
        email: '',
        phone: '',
        cpfCnpj: '',
        street: '',
        number: '',
        complement: '',
        city: '',
        state: '',
        zipCode: '',
      });
    }
  }, [customer, reset]);

  const onSubmit = async (data: CreateCustomerDto) => {
    setLoading(true);
    try {
      if (isEditing) {
        try {
          await api.patch(`/customer/${customer!.id}`, data);
          toast.success('Cliente atualizado com sucesso!');
          onClose();
        } catch (error: any) {
          if (error.response?.status === 400 && error.response?.data?.message?.includes('uuid is expected')) {
            toast.error('Operação não disponível: Backend requer UUIDs para esta operação');
          } else {
            handleApiError(error);
          }
        }
      } else {
        await api.post('/customer', data);
        toast.success('Cliente criado com sucesso!');
        onClose();
      }
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
          <DialogTitle className="text-foreground">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing ? 'Atualize as informações do cliente' : 'Preencha os dados do novo cliente'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Nome *
              </Label>
              <Input id="name" {...register('name')} disabled={loading} className="text-foreground" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input id="email" type="email" {...register('email')} disabled={loading} className="text-foreground" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">
                Telefone
              </Label>
              <Input
                id="phone"
                placeholder="(XX) XXXXX-XXXX"
                maxLength={15}
                {...register('phone')}
                onChange={(e) => {
                  handlePhoneChange(e);
                  register('phone').onChange(e);
                }}
                disabled={loading}
                className="text-foreground"
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="cpfCnpj" className="text-foreground">
                CPF/CNPJ
              </Label>
              <Input id="cpfCnpj" {...register('cpfCnpj')} disabled={loading} className="text-foreground" />
              {errors.cpfCnpj && <p className="text-sm text-destructive">{errors.cpfCnpj.message}</p>}
            </div>

            <div className="col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Endereço</h3>
              <p className="text-sm text-muted-foreground mb-2">Para emissão de boletos, é necessário CPF/CNPJ e endereço completo (logradouro, número, bairro, cidade, estado, CEP).</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode" className="text-foreground">
                CEP
              </Label>
              <Input
                id="zipCode"
                placeholder="XXXXX-XXX"
                maxLength={9}
                {...register('zipCode')}
                onChange={(e) => {
                  handleZipCodeChange(e);
                  register('zipCode').onChange(e);
                }}
                disabled={loading}
                className="text-foreground"
              />
              {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-foreground">
                Estado
              </Label>
              <Input id="state" placeholder="Ex: SP" maxLength={2} {...register('state')} disabled={loading} className="text-foreground" />
              {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="city" className="text-foreground">
                Cidade
              </Label>
              <Input id="city" {...register('city')} disabled={loading} className="text-foreground" />
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="street" className="text-foreground">
                Rua
              </Label>
              <Input id="street" {...register('street')} disabled={loading} className="text-foreground" />
              {errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="number" className="text-foreground">
                Número
              </Label>
              <Input id="number" {...register('number')} disabled={loading} className="text-foreground" />
              {errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="complement" className="text-foreground">
                Complemento
              </Label>
              <Input id="complement" {...register('complement')} disabled={loading} className="text-foreground" />
              {errors.complement && <p className="text-sm text-destructive">{errors.complement.message}</p>}
            </div>
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
    </Dialog>
  );
}

