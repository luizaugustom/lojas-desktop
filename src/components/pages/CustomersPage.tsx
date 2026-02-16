import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { InputWithIcon } from '../ui/input';
import { Card } from '../ui/card';
import { useAuth } from '../../hooks/useAuth';
import { useDateRange } from '../../hooks/useDateRange';
import { customerApi } from '../../lib/api-endpoints';
import { CustomersTable } from '../customers/customers-table';
import { CustomerDialog } from '../customers/customer-dialog';
import type { Customer } from '../../types';
import { PageHelpModal } from '../help/page-help-modal';
import { customersHelpTitle, customersHelpDescription, customersHelpIcon, getCustomersHelpTabs } from '../help/contents/customers-help';

export default function CustomersPage() {
  const { user, api } = useAuth();
  const { queryKeyPart } = useDateRange();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const { data: customersResponse, isLoading, refetch, error } = useQuery({
    queryKey: ['customers', queryKeyPart, search, user?.companyId],
    queryFn: async () => {
      console.log('[CustomersPage] Buscando clientes com search:', search, 'companyId:', user?.companyId);
      console.log('[CustomersPage] Usuário completo:', user);
      try {
        const response = await customerApi.list({
          search,
          companyId: user?.companyId ?? undefined
        });
        console.log('[CustomersPage] Resposta da API:', response);
        return response;
      } catch (error) {
        console.error('[CustomersPage] Erro ao buscar clientes:', error);
        throw error;
      }
    },
    enabled: !!user?.companyId, // Só executa se tiver companyId
  });

  // Log adicional para debug
  console.log('[CustomersPage] Estado da query:', {
    isLoading,
    hasData: !!customersResponse,
    hasError: !!error,
    userCompanyId: user?.companyId,
    userRole: user?.role,
    enabled: !!user?.companyId
  });

  // Transformar clientes: campos de endereço flat -> nested
  const customersRaw = (customersResponse?.data?.customers || customersResponse?.data || []) as any[];
  const customers = customersRaw.map((customer: any) => {
    // Se já tem address, retornar como está
    if (customer.address) {
      return customer;
    }
    // Transformar campos flat em objeto address
    const { street, number, complement, city, state, zipCode, district, ...rest } = customer;
    // Verificar se tem algum campo de endereço
    if (street || city || state) {
      return {
        ...rest,
        address: {
          street: street || '',
          number: number || '',
          complement: complement || '',
          neighborhood: district || '',
          city: city || '',
          state: state || '',
          zipCode: zipCode || '',
        },
      };
    }
    return customer;
  });

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedCustomer(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role !== 'vendedor' && (
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setHelpOpen(true)} aria-label="Ajuda" className="shrink-0 hover:scale-105 transition-transform">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-card border-border">
        <InputWithIcon
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="h-4 w-4" />}
          iconPosition="left"
          className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:ring-ring"
        />
      </Card>

      {/* Debug info - remover após corrigir o problema */}
      {error && (
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <div className="text-destructive">
            <h3 className="font-semibold">Erro ao carregar clientes:</h3>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
            <p className="text-xs mt-2 opacity-75">
              CompanyId: {user?.companyId || 'Não definido'} | 
              Role: {user?.role || 'Não definido'}
            </p>
          </div>
        </Card>
      )}

      <CustomersTable
        customers={customers || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onRefetch={refetch}
      />

      <CustomerDialog
        open={dialogOpen}
        onClose={handleClose}
        customer={selectedCustomer}
      />

      <PageHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={customersHelpTitle}
        description={customersHelpDescription}
        icon={customersHelpIcon}
        tabs={getCustomersHelpTabs()}
      />
    </div>
  );
}
