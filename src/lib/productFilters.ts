import type { Product } from '../types';

export interface ProductFilters {
  expiringSoon: boolean;
  lowStock: boolean;
}

export function applyProductFilters(products: Product[], filters: ProductFilters): Product[] {
  if (!filters.expiringSoon && !filters.lowStock) {
    return products;
  }

  return products.filter((product) => {
    let matches = true;

    if (filters.expiringSoon) {
      const hasExpirationDate = product.expirationDate && product.expirationDate !== 'null';
      if (hasExpirationDate && product.expirationDate) {
        const expirationDate = new Date(product.expirationDate);
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const isExpiringSoon = expirationDate <= thirtyDaysFromNow;
        matches = matches && isExpiringSoon;
      } else {
        matches = false;
      }
    }

    if (filters.lowStock) {
      const stockNum = Number(product.stockQuantity ?? 0);
      const threshold = product.lowStockAlertThreshold ?? 3;
      const isLowStock = !Number.isNaN(stockNum) && stockNum <= threshold;
      matches = matches && isLowStock;
    }

    return matches;
  });
}

export function getActiveFiltersCount(filters: ProductFilters): number {
  let count = 0;
  if (filters.expiringSoon) count++;
  if (filters.lowStock) count++;
  return count;
}

