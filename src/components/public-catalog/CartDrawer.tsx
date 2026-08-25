import { Minus, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  usePublicCartStore,
  selectCartCount,
  selectCartTotal,
} from '@/store/public-cart-store';
import { buildWhatsappOrderLink } from '@/lib/whatsapp-order-link';
import type { BasicCatalogCompany } from '@/hooks/useBasicCatalog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: BasicCatalogCompany;
};

const brl = (n: number): string =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CartDrawer({ open, onOpenChange, company }: Props) {
  const items = usePublicCartStore((s) => s.items);
  const count = usePublicCartStore(selectCartCount);
  const total = usePublicCartStore(selectCartTotal);
  const increment = usePublicCartStore((s) => s.increment);
  const decrement = usePublicCartStore((s) => s.decrement);
  const remove = usePublicCartStore((s) => s.remove);
  const clear = usePublicCartStore((s) => s.clear);

  const accent =
    company.brandColor && /^#[0-9a-fA-F]{6}$/.test(company.brandColor)
      ? company.brandColor
      : undefined;
  const whatsappLink = buildWhatsappOrderLink(company.phone, items);
  const canCheckout = count > 0 && !!company.phone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="catalog-root flex max-h-[90vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seu carrinho</DialogTitle>
          <DialogDescription>
            {count > 0
              ? `${count} ${count === 1 ? 'item' : 'itens'} no carrinho`
              : 'Adicione produtos para começar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Seu carrinho está vazio.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => (
                <li
                  key={it.productId}
                  className="flex gap-3 rounded-lg border border-slate-200 p-2"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-50">
                    {it.imageUrl ? (
                      <img
                        src={it.imageUrl}
                        alt={it.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-slate-900">
                      {it.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {brl(it.price)} cada
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-md border border-slate-200">
                        <button
                          type="button"
                          aria-label="Diminuir quantidade"
                          className="inline-flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          onClick={() => decrement(it.productId)}
                          disabled={it.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-7 px-2 text-center text-sm font-medium tabular-nums">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Aumentar quantidade"
                          className="inline-flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          onClick={() => increment(it.productId)}
                          disabled={it.quantity >= it.maxStock}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label="Remover item"
                        onClick={() => remove(it.productId)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 self-center text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {brl(it.price * it.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-semibold tabular-nums">{brl(total)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Frete e pagamento são combinados pelo WhatsApp.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!canCheckout}
            onClick={(e) => {
              if (!canCheckout) {
                e.preventDefault();
                if (!company.phone) {
                  alert('Esta loja não cadastrou telefone para contato.');
                }
              }
            }}
            className={`w-full ${canCheckout ? '' : 'pointer-events-none opacity-50'}`}
          >
            <Button
              type="button"
              disabled={!canCheckout}
              className="w-full"
              style={
                accent ? { backgroundColor: accent, borderColor: accent } : undefined
              }
            >
              Finalizar no WhatsApp
            </Button>
          </a>
          {items.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-slate-500"
              onClick={clear}
            >
              Esvaziar carrinho
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}