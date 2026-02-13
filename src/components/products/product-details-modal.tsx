import { useState } from 'react';
import { Package, Tag, AlertCircle, AlertTriangle, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageViewer } from '@/components/ui/image-viewer';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ProductDetailsModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit?: (product: Product) => void;
  canEdit?: boolean;
}

interface InfoFieldProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const InfoField = ({ label, value, icon, className }: InfoFieldProps) => (
  <div className={cn("flex flex-col space-y-1", className)}>
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {label}
    </span>
    <div className="flex items-center gap-2">
      <span className="text-base font-medium text-foreground">
        {value}
      </span>
      {icon}
    </div>
  </div>
);

export function ProductDetailsModal({
  open,
  onClose,
  product,
  onEdit,
  canEdit = false
}: ProductDetailsModalProps) {
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const { user } = useAuth();

  if (!product) return null;

  // Verificações de status
  const threshold = product.lowStockAlertThreshold ?? 3;
  const isLowStock = product.stockQuantity <= threshold;

  const getExpirationStatus = () => {
    if (!product.expirationDate) return null;
    const date = new Date(product.expirationDate);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (date <= now) return 'expired';
    if (date <= thirtyDays) return 'expiring-soon';
    return 'valid';
  };

  const expirationStatus = getExpirationStatus();
  const canViewCostPrice = user?.role !== 'vendedor';

  // Função para exibir valores com fallback
  const displayValue = (value: any, fallback = 'Não informado') => {
    return value && value !== 'null' ? value : fallback;
  };

  // Obter todas as imagens do produto
  const productImages = product.photos && product.photos.length > 0
    ? product.photos.map(photo => getImageUrl(photo)).filter((url): url is string => url !== null)
    : [];

  const handleEdit = () => {
    if (onEdit && product) {
      onEdit(product);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Foto Principal */}
              <div className="flex-shrink-0">
                {productImages.length > 0 ? (
                  <div
                    className="w-full md:w-80 h-64 md:h-80 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-border"
                    onClick={() => setImageViewerOpen(true)}
                  >
                    <img
                      src={productImages[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full md:w-80 h-64 md:h-80 bg-muted rounded-lg flex items-center justify-center border border-border">
                    <div className="text-center">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Sem foto</p>
                    </div>
                  </div>
                )}

                {/* Thumbnails */}
                {productImages.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {productImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setImageViewerOpen(true)}
                        className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 border-border hover:border-primary transition-colors"
                      >
                        <img
                          src={image}
                          alt={`${product.name} - ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Informações do Header */}
              <div className="flex-1 space-y-3">
                <DialogTitle className="text-2xl font-bold text-foreground">
                  {product.name}
                </DialogTitle>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {product.category && (
                    <Badge variant="secondary">{product.category}</Badge>
                  )}
                  {product.isOnPromotion && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Promoção
                    </Badge>
                  )}
                  {expirationStatus === 'expired' && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Vencido
                    </Badge>
                  )}
                  {expirationStatus === 'expiring-soon' && (
                    <Badge className="bg-orange-500 text-white flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Vence em breve
                    </Badge>
                  )}
                </div>

                {/* Preços em Destaque */}
                <div className="space-y-2 pt-2">
                  {product.isOnPromotion && product.promotionPrice ? (
                    <>
                      <div>
                        <span className="text-xs text-muted-foreground">Preço Promocional</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-red-600">
                            {formatCurrency(product.promotionPrice)}
                          </span>
                          <span className="text-lg text-muted-foreground line-through">
                            {formatCurrency(product.price)}
                          </span>
                          {product.promotionDiscount && (
                            <Badge variant="destructive">
                              -{product.promotionDiscount.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <span className="text-xs text-muted-foreground">Preço de Venda</span>
                      <div className="text-3xl font-bold text-foreground">
                        {formatCurrency(product.price)}
                      </div>
                    </div>
                  )}

                  {product.costPrice && canViewCostPrice && (
                    <div>
                      <span className="text-xs text-muted-foreground">Preço de Custo</span>
                      <div className="text-lg font-medium text-muted-foreground">
                        {formatCurrency(product.costPrice)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BODY - Informações Detalhadas */}
          <div className="p-6 space-y-6">
            {/* Grid de Informações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField
                label="Código de Barras"
                value={product.barcode}
              />

              <InfoField
                label="Estoque"
                value={`${product.stockQuantity} ${product.unitOfMeasure || 'un'}`}
                icon={isLowStock && (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
              />

              <InfoField
                label="Unidade de Medida"
                value={displayValue(product.unitOfMeasure, 'un').toUpperCase()}
              />

              <InfoField
                label="Data de Validade"
                value={product.expirationDate && product.expirationDate !== 'null' ? formatDate(product.expirationDate) : 'Não informada'}
                icon={expirationStatus && expirationStatus !== 'valid' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              />
            </div>

            {/* Seção Fiscal */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                Informações Fiscais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField
                  label="NCM"
                  value={displayValue(product.ncm)}
                />

                <InfoField
                  label="CFOP"
                  value={displayValue(product.cfop)}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                Descrição
              </h3>
              {product.description && product.description !== 'null' ? (
                <p className="text-sm text-foreground leading-relaxed">
                  {product.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma descrição disponível para este produto.
                </p>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <DialogFooter className="border-t border-border p-6">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            {canEdit && onEdit && (
              <Button onClick={handleEdit} className="flex items-center gap-2">
                <Edit2 className="h-4 w-4" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer */}
      {productImages.length > 0 && (
        <ImageViewer
          open={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          images={productImages}
          initialIndex={0}
          alt={product.name}
        />
      )}
    </>
  );
}
