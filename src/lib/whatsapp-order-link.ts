import type { PublicCartItem } from '@/store/public-cart-store';

const brl = (n: number): string =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function buildWhatsappOrderLink(
  rawPhone: string | null | undefined,
  items: PublicCartItem[],
): string {
  const phone = (rawPhone ?? '').replace(/\D/g, '');
  if (!phone) return '#';

  const lines: string[] = items.map((it, idx) => {
    const subtotal = it.price * it.quantity;
    return `${idx + 1}. ${it.name} — ${it.quantity}x ${brl(it.price)} = ${brl(subtotal)}`;
  });
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const message = [
    'Olá! Gostaria de fazer o seguinte pedido:',
    '',
    ...lines,
    '',
    `Total: ${brl(total)}`,
  ].join('\n');

  return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
}