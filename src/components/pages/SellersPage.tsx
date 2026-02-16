import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { InputWithIcon } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../hooks/useAuth';
import { sellerApi } from '../../lib/api-endpoints';
import { SellersTable } from '../sellers/sellers-table';
import { SellerDialog } from '../sellers/seller-dialog';
import { SellerDetailsDialog } from '../sellers/seller-details-dialog';
import { formatCurrency } from '../../lib/utils';
import type { Seller } from '../../types';
import { PageHelpModal } from '../help/page-help-modal';
import { sellersHelpTitle, sellersHelpDescription, sellersHelpIcon, getSellersHelpTabs } from '../help/contents/sellers-help';

export default function SellersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const { data: sellersResponse, isLoading, refetch } = useQuery({
    queryKey: ['sellers', search, user?.companyId],
    queryFn: async () => {
      console.log('[SellersPage] Buscando vendedores com search:', search, 'companyId:', user?.companyId);
      try {
        const response = await sellerApi.list({ 
          search,
          companyId: user?.companyId || undefined
        });
        console.log('[SellersPage] Resposta da API:', response);
        return response;
      } catch (error) {
        console.error('[SellersPage] Erro ao buscar vendedores:', error);
        throw error;
      }
    },
    enabled: !!user?.companyId,
  });

  // A API retorna um objeto único ou array, vamos normalizar
  const sellers = Array.isArray(sellersResponse) 
    ? sellersResponse 
    : sellersResponse?.data 
    ? sellersResponse.data 
    : (sellersResponse as any)?.sellers 
    ? (sellersResponse as any).sellers 
    : sellersResponse 
    ? [sellersResponse] 
    : [];

  // Calcular estatísticas gerais
  const totalSellers = sellers.length;
  
  // Calcular vendedor com melhor e pior performance (baseado nas vendas do mês)
  const topSeller = sellers.length > 0 ? sellers.reduce((prev: Seller, current: Seller) => 
    Number((prev as any).monthlySalesValue || 0) > Number((current as any).monthlySalesValue || 0) ? prev : current
  ) : null;
  
  const bottomSeller = sellers.length > 0 ? sellers.reduce((prev: Seller, current: Seller) => 
    Number((prev as any).monthlySalesValue || 0) < Number((current as any).monthlySalesValue || 0) ? prev : current
  ) : null;

  const handleEdit = (seller: Seller) => {
    setSelectedSeller(seller);
    setDialogOpen(true);
    setDetailsOpen(false);
  };

  const handleView = (seller: Seller) => {
    setSelectedSeller(seller);
    setDetailsOpen(true);
  };

  const handleCreate = () => {
    setSelectedSeller(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSeller(null);
    refetch();
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);

    if (!dialogOpen) {
      setSelectedSeller(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Vendedores</h1>
          <p className="text-muted-foreground">Gerencie os vendedores da sua empresa</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Novo Vendedor
          </Button>
          <Button variant="outline" size="icon" onClick={() => setHelpOpen(true)} aria-label="Ajuda" className="shrink-0 hover:scale-105 transition-transform">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-primary">{totalSellers}</p>
              <p className="text-xs text-muted-foreground">Total de Vendedores</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Performance dos Vendedores (Mês Atual)</h3>
            
            {topSeller && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-green-500/10 rounded">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-green-600 truncate">
                      {topSeller.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency((topSeller as any).monthlySalesValue || 0)} este mês
                    </p>
                  </div>
                </div>
              </div>
            )}

            {bottomSeller && topSeller !== bottomSeller && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-red-500/10 rounded">
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-red-600 truncate">
                      {bottomSeller.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency((bottomSeller as any).monthlySalesValue || 0)} este mês
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(!topSeller || sellers.length === 0) && (
              <p className="text-xs text-muted-foreground">Nenhum vendedor encontrado</p>
            )}
          </div>
        </Card>
      </div>

      {/* Busca */}
      <Card className="p-4 bg-card border-border">
        <InputWithIcon
          placeholder="Buscar por nome, email ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="h-4 w-4" />}
          iconPosition="left"
          className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:ring-ring"
        />
      </Card>

      {/* Tabela de Vendedores */}
      <SellersTable
        sellers={sellers}
        isLoading={isLoading}
        onEdit={handleEdit}
        onView={handleView}
        onRefetch={refetch}
      />

      {/* Modais */}
      <SellerDialog
        isOpen={dialogOpen}
        onClose={handleCloseDialog}
        onSuccess={refetch}
        seller={selectedSeller}
      />

      <SellerDetailsDialog
        isOpen={detailsOpen}
        onClose={handleCloseDetails}
        onEdit={handleEdit}
        seller={selectedSeller}
      />

      <PageHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={sellersHelpTitle}
        description={sellersHelpDescription}
        icon={sellersHelpIcon}
        tabs={getSellersHelpTabs()}
      />
    </div>
  );
}
