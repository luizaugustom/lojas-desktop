import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PublicCartItem = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  maxStock: number;
};

type State = {
  items: PublicCartItem[];
  add: (item: Omit<PublicCartItem, 'quantity'>) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = 'public-cart-v1';
const STORAGE_TS_KEY = 'public-cart-v1-ts';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const usePublicCartStore = create<State>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: Math.min(i.maxStock, i.quantity + 1) }
                  : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: 1 }] };
        }),
      increment: (productId) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.min(i.maxStock, i.quantity + 1) }
              : i,
          ),
        })),
      decrement: (productId) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.productId === productId
                ? { ...i, quantity: i.quantity - 1 }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      remove: (productId) =>
        set((s) => ({
          items: s.items.filter((i) => i.productId !== productId),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (typeof window === 'undefined') return;
        const tsRaw = window.localStorage.getItem(STORAGE_TS_KEY);
        const ts = tsRaw ? Number(tsRaw) : Date.now();
        if (Number.isFinite(ts) && Date.now() - ts > SEVEN_DAYS_MS) {
          state?.clear();
        }
      },
    },
  ),
);

if (typeof window !== 'undefined') {
  usePublicCartStore.subscribe(() => {
    try {
      window.localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
    } catch {
      // localStorage indisponível — segue sem TTL
    }
  });
}

export const selectCartCount = (s: State): number =>
  s.items.reduce((n, i) => n + i.quantity, 0);

export const selectCartTotal = (s: State): number =>
  s.items.reduce((sum, i) => sum + i.price * i.quantity, 0);