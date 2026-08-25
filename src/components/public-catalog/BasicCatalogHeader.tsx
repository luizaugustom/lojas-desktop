import { Phone, ShoppingCart } from 'lucide-react';
import type { BasicCatalogCompany } from '@/hooks/useBasicCatalog';
import {
  usePublicCartStore,
  selectCartCount,
} from '@/store/public-cart-store';

type Props = {
  company: BasicCatalogCompany;
  onOpenCart: () => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function BasicCatalogHeader({ company, onOpenCart }: Props) {
  const displayName = company.fantasyName?.trim() || company.name;
  const phoneDigits = (company.phone ?? '').replace(/\D/g, '');
  const count = usePublicCartStore(selectCartCount);
  const accent =
    company.brandColor && /^#[0-9a-fA-F]{6}$/.test(company.brandColor)
      ? company.brandColor
      : '#0F172A';

  return (
    <header
      className="sticky top-0 z-30 w-full border-b border-slate-200 shadow-sm"
      style={{
        backgroundColor: 'var(--catalog-header-bg)',
        color: 'var(--catalog-header-text)',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:gap-4 md:px-6 md:py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 md:h-14 md:w-14">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-base font-semibold opacity-70 md:text-lg">
              {getInitials(displayName)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold md:text-xl">
            {displayName}
          </h1>
          {company.phone ? (
            <a
              href={phoneDigits ? `tel:+55${phoneDigits}` : undefined}
              className="mt-0.5 inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 md:text-sm"
            >
              <Phone className="h-4 w-4" aria-hidden />
              <span>{company.phone}</span>
            </a>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onOpenCart}
          className="relative shrink-0 rounded-full p-2.5 text-white shadow-sm"
          style={{ backgroundColor: accent }}
          aria-label={
            count > 0
              ? `Abrir carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`
              : 'Abrir carrinho'
          }
        >
          <ShoppingCart className="h-5 w-5" aria-hidden />
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white">
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}