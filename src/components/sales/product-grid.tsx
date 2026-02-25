import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { ProductImage } from '../products/ProductImage';
import { ImageViewer } from '../ui/image-viewer';
import { formatCurrency } from '../../lib/utils';
import { getImageUrl } from '../../lib/image-utils';
import type { Product } from '../../types';
import { Tag } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  onAddToCart: (product: Product, quantity?: number) => void;
}

export function ProductGrid({ products, isLoading, onAddToCart }: ProductGridProps) {
  const [selectedImage, setSelectedImage] = useState<{ images: string[], index: number } | null>(null);

  const handleImageClick = (product: Product) => {
    if (product.photos && product.photos.length > 0) {
      const imageUrls = product.photos.map(photo => getImageUrl(photo));
      const validImages: string[] = imageUrls.filter((url): url is string => url !== null);
      
      if (validImages.length > 0) {
        setSelectedImage({ images: validImages, index: 0 });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-1.5">
            <CardHeader>
              <div className="h-3 w-16 sm:h-4 sm:w-20 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-10 sm:h-5 sm:w-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <div className="p-4 sm:p-8 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {products.map((product) => (
          <Card key={product.id} className="flex flex-col p-1.5">
            <CardHeader className="pb-0.5">
              <div className="flex items-start gap-1.5">
                <ProductImage 
                  photos={product.photos} 
                  name={product.name} 
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => handleImageClick(product)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <CardTitle className="text-xs line-clamp-2 flex-1 leading-tight">{product.name}</CardTitle>
                    {product.isOnPromotion && (
                      <Tag className="h-3 w-3 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  {product.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-tight">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 py-0.5">
              <div className="space-y-0.5">
                {product.isOnPromotion && product.promotionPrice !== undefined ? (
                  <>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-bold text-red-600">{formatCurrency(product.promotionPrice)}</p>
                      {product.promotionDiscount && (
                        <span className="text-[10px] text-red-600 font-medium bg-red-50 px-1 rounded">
                          -{product.promotionDiscount.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</p>
                  </>
                ) : (
                  <p className="text-sm font-bold">{formatCurrency(product.price)}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Estoque: {product.stockQuantity}
                </p>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onAddToCart(product, 1)}
                disabled={product.stockQuantity <= 0}
                aria-label={`Adicionar ${product.name}`}
                title={`Adicionar ${product.name}`}
              >
                <Plus className="h-4 w-4 text-primary" />
              </Button>
            </CardFooter>
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

