import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ProductImage } from '../products/ProductImage';
import { ImageViewer } from '../ui/image-viewer';
import { formatCurrency } from '../../lib/utils';
import { getImageUrl } from '../../lib/image-utils';
import { Tag } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stockQuantity?: number;
  photos?: string[];
  [key: string]: any;
}

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onAddToCart: (product: Product, quantity?: number) => void;
}

export function ProductList({ products, isLoading, onAddToCart }: ProductListProps) {
  const [selectedImage, setSelectedImage] = useState<{ images: string[]; index: number } | null>(null);

  const handleImageClick = (product: Product) => {
    if (product.photos && product.photos.length > 0) {
      const validImages = product.photos
        .map((photo) => getImageUrl(photo))
        .filter((url): url is string => url !== null);

      if (validImages.length > 0) {
        setSelectedImage({ images: validImages, index: 0 });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-1">
            <CardContent className="flex items-center gap-3 py-2">
              <div className="h-10 w-10 rounded bg-muted animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                <div className="mt-0.5 h-3 w-24 rounded bg-muted animate-pulse" />
              </div>
              <div className="w-7">
                <div className="h-7 w-full rounded bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {products.map((product) => (
          <Card key={product.id} className="p-1">
            <CardContent className="flex items-center gap-3 py-2">
              <ProductImage
                photos={product.photos}
                name={product.name}
                size="md"
                className="flex-none"
                onClick={() => handleImageClick(product)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-medium truncate">{product.name}</h3>
                      {product.isOnPromotion && (
                        <Tag className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {product.isOnPromotion && product.promotionPrice !== undefined ? (
                      <>
                        <div className="text-sm font-semibold text-red-600">
                          {formatCurrency(product.promotionPrice)}
                        </div>
                        <div className="text-xs text-muted-foreground line-through">
                          {formatCurrency(product.price)}
                        </div>
                        {product.promotionDiscount && (
                          <div className="text-[10px] text-red-600 font-medium">
                            -{product.promotionDiscount.toFixed(0)}%
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm font-semibold">{formatCurrency(product.price)}</div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estoque: {product.stockQuantity ?? 0}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => onAddToCart(product, 1)}
                  disabled={(product.stockQuantity ?? 0) <= 0}
                  aria-label={`Adicionar ${product.name}`}
                  title={`Adicionar ${product.name}`}
                >
                  <Plus className="h-4 w-4 text-primary" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedImage && (
        <ImageViewer
          open={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          images={selectedImage.images}
          initialIndex={selectedImage.index}
          alt="Imagem do produto"
        />
      )}
    </>
  );
}

