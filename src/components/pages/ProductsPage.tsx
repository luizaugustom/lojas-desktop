import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { InputWithIcon } from '../ui/input';
import { Card } from '../ui/card';
import { useAuth } from '../../hooks/useAuth';
import { ProductsTable } from '../products/products-table';
import { ProductDialog } from '../products/product-dialog';
import { ProductFilters } from '../products/product-filters';
import { applyProductFilters, getActiveFiltersCount, type ProductFilters as ProductFiltersType } from '../../lib/productFilters';
import type { Product, PlanUsageStats } from '../../types';

export default function ProductsPage() {
  const { api, user } = useAuth();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<ProductFiltersType>({
    expiringSoon: false,
    lowStock: false,
  });

  const canManageProducts = user ? user.role !== 'vendedor' : false;

  const { data: productsResponse, isLoading, refetch } = useQuery({
    queryKey: ['products', search],
    queryFn: async () => {
      const response = (await api.get('/product', { params: { search } })).data;
      return response;
    },
  });

  // Carregar estatísticas de uso do plano
  const { data: planUsage } = useQuery<PlanUsageStats>({
    queryKey: ['plan-usage'],
    queryFn: async () => (await api.get('/company/plan-usage')).data,
    enabled: user?.role === 'empresa',
  });

  const products = productsResponse?.products || [];
  const filteredProducts = applyProductFilters(products, filters);
  const activeFiltersCount = getActiveFiltersCount(filters);

  const handleEdit = (product: Product) => {
    if (!canManageProducts) {
      toast.error('Você não tem permissão para editar produtos.');
      return;
    }
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    if (!canManageProducts) {
      toast.error('Você não tem permissão para adicionar produtos.');
      return;
    }

    // Validar limite do plano
    if (planUsage && planUsage.usage.products.max) {
      if (planUsage.usage.products.current >= planUsage.usage.products.max) {
        toast.error(
          `Limite de produtos atingido! Seu plano ${planUsage.plan} permite no máximo ${planUsage.usage.products.max} produtos. Faça upgrade para adicionar mais.`,
          { duration: 5000 }
        );
        return;
      }
    }

    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedProduct(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie seu catálogo de produtos
            {planUsage && planUsage.usage.products.max && (
              <span className="ml-2 text-sm">
                ({planUsage.usage.products.current}/{planUsage.usage.products.max} usados)
              </span>
            )}
          </p>
        </div>
        {canManageProducts && (
          <Button 
            onClick={handleCreate}
            disabled={planUsage?.usage.products.max ? planUsage.usage.products.current >= planUsage.usage.products.max : false}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
            {planUsage?.usage.products.percentage != null &&
              planUsage.usage.products.percentage >= 90 && (
              <AlertTriangle className="ml-2 h-4 w-4 text-yellow-500" />
            )}
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <InputWithIcon
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              iconPosition="left"
            />
          </div>
          <ProductFilters
            filters={filters}
            onFiltersChange={setFilters}
            activeFiltersCount={activeFiltersCount}
          />
        </div>
      </Card>

      <ProductsTable
        products={filteredProducts || []}
        isLoading={isLoading}
        onEdit={canManageProducts ? handleEdit : () => {}}
        onRefetch={refetch}
        canManage={canManageProducts}
      />

      {canManageProducts && (
        <ProductDialog
          open={dialogOpen}
          onClose={handleClose}
          product={selectedProduct}
        />
      )}
    </div>
  );
}
