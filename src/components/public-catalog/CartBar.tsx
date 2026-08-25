import { ShoppingCart } from 'lucide-react';
import {
  usePublicCartStore,
  selectCartCount,
  selectCartTotal,
} from '@/store/public-cart-store';

type Props = {
  brandColor: string | null;
  onOpen: () => void;
  hidden?: boolean;
};

const brl = (n: number): string =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CartBar({ brandColor, onOpen, hidden }: Props) {
  const count = usePublicCartStore(selectCartCount);
  const total = usePublicCartStore(selectCartTotal);
  const accent =
    brandColor && /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : '#0F172A';

  if (hidden) return null;

  return (
    <div className="fixed bottom-5 right-4 z-40 flex items-end gap-2 md:hidden">
      {count > 0 ? (
        <div
          role="status"
          className="mb-1.5 max-w-[11rem] rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          {count} {count === 1 ? 'item' : 'itens'} · {brl(total)}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-lg"
        style={{ backgroundColor: accent }}
        aria-label={
          count > 0
            ? `Abrir carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`
            : 'Abrir carrinho'
        }
      >
        <ShoppingCart className="h-6 w-6" aria-hidden />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>
    </div>
  );
}
