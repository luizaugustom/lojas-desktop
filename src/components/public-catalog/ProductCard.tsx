import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BasicCatalogProduct } from '@/hooks/useBasicCatalog';
import { usePublicCartStore } from '@/store/public-cart-store';

type Props = {
  product: BasicCatalogProduct;
  brandColor: string | null;
};

const brl = (n: string): string =>
  Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProductCard({ product, brandColor }: Props) {
  const add = usePublicCartStore((s) => s.add);
  const photo = product.photos[0] ?? null;
  const accent =
    brandColor && /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : undefined;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
        {photo ? (
          <img
            src={photo}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Package className="h-12 w-12" aria-hidden />
          </div>
        )}
        {product.category ? (
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 bg-white/90 text-xs"
          >
            {product.category}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-[color:var(--catalog-text)]">
          {product.name}
        </h3>
        {product.description ? (
          <p className="line-clamp-2 text-xs text-slate-500">
            {product.description}
          </p>
        ) : null}
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="text-base font-semibold text-[color:var(--catalog-text)]">
            {brl(product.price)}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={product.stockQuantity <= 0}
            onClick={() =>
              add({
                productId: product.id,
                name: product.name,
                price: Number(product.price),
                imageUrl: photo,
                maxStock: product.stockQuantity,
              })
            }
            style={accent ? { backgroundColor: accent, borderColor: accent } : undefined}
            className="gap-1"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar
          </Button>
        </div>
      </div>
    </article>
  );
}