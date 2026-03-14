import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, HelpCircle, Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { InputWithIcon } from '../ui/input';
import { Card } from '../ui/card';
import { useAuth } from '../../hooks/useAuth';
import { useDateRange } from '../../hooks/useDateRange';
import { ProductsTable } from '../products/products-table';
import { ProductDialog } from '../products/product-dialog';
import { ProductLossDialog } from '../product-losses/product-loss-dialog';
import { ProductFilters } from '../products/product-filters';
import { applyProductFilters, getActiveFiltersCount, type ProductFilters as ProductFiltersType } from '../../lib/productFilters';
import type { Product, PlanUsageStats } from '../../types';
import { handleApiError } from '../../lib/handleApiError';
import { formatDate, formatCurrency } from '../../lib/utils';
import { companyApi } from '../../lib/api-endpoints';
import { PageHelpModal } from '../help/page-help-modal';
import { productsHelpTitle, productsHelpDescription, productsHelpIcon, getProductsHelpTabs } from '../help/contents/products-help';
import { logger } from '@/lib/logger';

export default function ProductsPage() {
  const { api, user } = useAuth();
  const { queryKeyPart } = useDateRange();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForLoss, setProductForLoss] = useState<Product | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<ProductFiltersType>({
    expiringSoon: false,
    lowStock: false,
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const canManageProducts = user ? user.role !== 'vendedor' : false;
  const canExportProducts = user?.role === 'empresa';

  // Resetar página ao mudar busca
  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data: productsResponse, isLoading, refetch } = useQuery({
    queryKey: ['products', queryKeyPart, search, page, pageSize],
    queryFn: async () => {
      const response = (
        await api.get('/product', { params: { search, page, limit: pageSize } })
      ).data;
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
  const total = productsResponse?.total ?? 0;
  const totalPages = productsResponse?.totalPages ?? 1;
  const filteredProducts = applyProductFilters(products, filters);
  const activeFiltersCount = getActiveFiltersCount(filters);

  const handleEdit = async (product: Product) => {
    if (!canManageProducts) {
      toast.error('Você não tem permissão para editar produtos.');
      return;
    }

    try {
      logger.log('[ProductsPage] Buscando detalhes do produto:', product.id);
      const response = await api.get(`/product/${product.id}`);
      logger.log('[ProductsPage] Resposta completa da API:', response);
      logger.log('[ProductsPage] Resposta data:', response.data);
      
      const detailedProduct = (response.data as any)?.product ?? response.data;
      logger.log('[ProductsPage] Produto detalhado:', detailedProduct);
      logger.log('[ProductsPage] costPrice no detailedProduct:', detailedProduct?.costPrice);

      // Preenche com todos os campos disponíveis, garantindo custo
      if (detailedProduct) {
        const merged = { ...product, ...detailedProduct };
        logger.log('[ProductsPage] Produto merged:', merged);
        logger.log('[ProductsPage] costPrice no merged:', merged.costPrice);
        setSelectedProduct(merged);
      } else {
        setSelectedProduct(product);
      }
    } catch (error) {
      console.error('[ProductsPage] Erro ao buscar detalhes:', error);
      handleApiError(error);
      // Fallback para o produto já carregado caso a busca detalhada falhe
      setSelectedProduct(product);
    } finally {
      setDialogOpen(true);
    }
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

  const handleRegisterLoss = (product: Product) => {
    // Vendedores também podem registrar perdas
    setProductForLoss(product);
    setLossDialogOpen(true);
  };

  const handleLossClose = () => {
    setLossDialogOpen(false);
    setProductForLoss(null);
    refetch();
  };

  const fetchAllProductsForExport = async (): Promise<Product[]> => {
    const res = await api.get('/product', {
      params: { page: 1, limit: 100000, search: '' },
    });
    return res.data?.products ?? [];
  };

  const getCompanyForExport = async (): Promise<{ name: string; brandColor?: string }> => {
    const response = await companyApi.myCompany();
    const data = response.data as { fantasyName?: string; name?: string; brandColor?: string };
    return {
      name: data?.fantasyName || data?.name || 'Empresa',
      brandColor: data?.brandColor,
    };
  };

  const hexToRgb = (hex: string): [number, number, number] | null => {
    const h = hex.replace(/^#/, '');
    if (h.length !== 6 && h.length !== 3) return null;
    const r = h.length === 6 ? parseInt(h.slice(0, 2), 16) : parseInt(h[0] + h[0], 16);
    const g = h.length === 6 ? parseInt(h.slice(2, 4), 16) : parseInt(h[1] + h[1], 16);
    const b = h.length === 6 ? parseInt(h.slice(4, 6), 16) : parseInt(h[2] + h[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  };

  const handleExportExcel = async () => {
    if (!canExportProducts) return;
    setExporting(true);
    try {
      const list = await fetchAllProductsForExport();
      if (list.length === 0) {
        toast.error('Nenhum produto para exportar.');
        return;
      }
      const headers = [
        'Nome',
        'Código de Barras',
        'Preço',
        'Preço de Custo',
        'Estoque',
        'Estoque Mínimo',
        'Alerta Estoque',
        'Categoria',
        'Descrição',
        'Validade',
        'Unidade',
        'NCM',
        'CFOP',
        'Fotos (URLs)',
        'Em promoção',
        'Preço promocional',
        'Desconto %',
        'Nome promoção',
        'Preço original',
        'Criado em',
        'Atualizado em',
        'ID',
      ];
      const rows: (string | number)[][] = [headers];
      for (const p of list) {
        const photosStr = Array.isArray(p.photos)
          ? p.photos.join('; ')
          : p.photos != null ? String(p.photos) : '';
        rows.push([
          p.name ?? '',
          p.barcode ?? '',
          typeof p.price === 'number' ? p.price : '',
          p.costPrice != null ? p.costPrice : '',
          p.stockQuantity ?? '',
          p.minStockQuantity ?? '',
          p.lowStockAlertThreshold ?? '',
          p.category ?? '',
          p.description ?? '',
          p.expirationDate && p.expirationDate !== 'null' ? formatDate(p.expirationDate) : '',
          p.unitOfMeasure ?? '',
          p.ncm ?? '',
          p.cfop ?? '',
          photosStr,
          p.isOnPromotion ? 'Sim' : 'Não',
          p.promotionPrice ?? '',
          p.promotionDiscount ?? '',
          p.promotionName ?? '',
          p.originalPrice ?? '',
          p.createdAt ? formatDate(p.createdAt) : '',
          p.updatedAt ? formatDate(p.updatedAt) : '',
          p.id ?? '',
        ]);
      }
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet['!cols'] = [
        { wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 12 },
        { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 40 }, { wch: 10 },
        { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
        { wch: 16 }, { wch: 38 },
      ];
      XLSX.utils.book_append_sheet(workbook, sheet, 'Produtos');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `produtos-${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Produtos exportados em Excel com sucesso!');
    } catch (error) {
      handleApiError(error);
      toast.error('Erro ao exportar produtos.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!canExportProducts) return;
    setExporting(true);
    try {
      const list = await fetchAllProductsForExport();
      if (list.length === 0) {
        toast.error('Nenhum produto para exportar.');
        return;
      }
      const company = await getCompanyForExport();
      const companyName = company.name;
      const brandRgb = company.brandColor ? hexToRgb(company.brandColor) : null;
      const headerColor: [number, number, number] = brandRgb ?? [66, 66, 66];

      const emittedAt = new Date();
      const dateStr = emittedAt.toLocaleDateString('pt-BR');
      const timeStr = emittedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const headerY = 10;
      const titleY = 22;
      const tableStartY = 30;
      const footerY = pageHeight - 10;

      const pdfHeaders = [
        'Nome',
        'Cód. Barras',
        'Preço',
        'Custo',
        'Estoque',
        'Est. Mín.',
        'Categoria',
        'Un.',
        'Validade',
        'Promoção',
        'Preço Promo.',
      ];
      const pdfRows = list.map((p) => {
        const priceNum = Number(p.price);
        const costNum = p.costPrice != null ? Number(p.costPrice) : NaN;
        const stockNum = Number(p.stockQuantity);
        const minStockNum = Number(p.minStockQuantity);
        return [
          (p.name ?? '').slice(0, 35),
          (p.barcode ?? '').slice(0, 14),
          !isNaN(priceNum) ? formatCurrency(priceNum) : '',
          !isNaN(costNum) ? formatCurrency(costNum) : '',
          !isNaN(stockNum) ? String(stockNum) : '0',
          !isNaN(minStockNum) ? String(minStockNum) : '0',
          (p.category ?? '').slice(0, 12),
          (p.unitOfMeasure ?? '').slice(0, 4),
          p.expirationDate && p.expirationDate !== 'null' ? formatDate(p.expirationDate) : '',
          p.isOnPromotion ? 'Sim' : 'Não',
          p.promotionPrice != null && !isNaN(Number(p.promotionPrice)) ? formatCurrency(Number(p.promotionPrice)) : '',
        ];
      });

      autoTable(doc, {
        head: [pdfHeaders],
        body: pdfRows,
        startY: tableStartY,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: headerColor, fontSize: 8, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        showHead: 'everyPage',
        didDrawPage: (data) => {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(companyName, margin, headerY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`Emitido em: ${dateStr} às ${timeStr}`, margin, headerY + 6);
          if (data.pageNumber === 1) {
            const title = `Relatórios de Produtos da ${companyName}`;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            if (brandRgb) doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2]);
            doc.text(title, margin, titleY);
            doc.setTextColor(0, 0, 0);
            if (brandRgb) {
              doc.setDrawColor(brandRgb[0], brandRgb[1], brandRgb[2]);
              doc.setLineWidth(0.5);
              doc.line(margin, titleY + 2, pageWidth - margin, titleY + 2);
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
          }
          doc.setFontSize(7);
          doc.text('MontShop', pageWidth - margin - doc.getTextWidth('MontShop'), footerY);
        },
      });

      const fileName = `produtos-${emittedAt.toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('Produtos exportados em PDF com sucesso!');
    } catch (error) {
      handleApiError(error);
      toast.error('Erro ao exportar produtos em PDF.');
    } finally {
      setExporting(false);
    }
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
        <div className="flex items-center gap-2">
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
          {canExportProducts && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={exporting}
                  aria-label="Exportar produtos"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? 'Exportando...' : 'Exportar produtos'}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel} disabled={exporting}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar em Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf} disabled={exporting}>
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar em PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="icon" onClick={() => setHelpOpen(true)} aria-label="Ajuda" className="shrink-0 hover:scale-105 transition-transform">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
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
        onRegisterLoss={handleRegisterLoss}
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {canManageProducts && (
        <ProductDialog
          open={dialogOpen}
          onClose={handleClose}
          product={selectedProduct}
        />
      )}
      <ProductLossDialog
        open={lossDialogOpen}
        onClose={handleLossClose}
        initialProduct={productForLoss}
      />

      <PageHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={productsHelpTitle}
        description={productsHelpDescription}
        icon={productsHelpIcon}
        tabs={getProductsHelpTabs()}
      />
    </div>
  );
}
