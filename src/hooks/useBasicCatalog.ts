import { useQuery, keepPreviousData } from '@tanstack/react-query';

export type BasicCatalogCompany = {
  id: string;
  name: string;
  fantasyName: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  catalogColors?: {
    backgroundColor: string;
    headerBackgroundColor: string;
    headerTextColor: string;
    footerBackgroundColor: string;
    footerTextColor: string;
    textColor: string;
  } | null;
  address: string | null;
};

export type BasicCatalogInfo = {
  company: BasicCatalogCompany;
  categories: string[];
};

export type BasicCatalogProduct = {
  id: string;
  name: string;
  photos: string[];
  price: string;
  stockQuantity: number;
  size: string | null;
  category: string | null;
  unitOfMeasure: string | null;
  description: string | null;
};

export type BasicCatalogProductsResponse = {
  products: BasicCatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type BasicCatalogFilters = {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'name-asc' | 'price-asc' | 'price-desc';
  page?: number;
  limit?: number;
};

const API_BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'https://api.montshop.app')
  .replace(/\/+$/, '');

async function fetcher<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function useBasicCatalogInfo(url: string) {
  return useQuery({
    queryKey: ['basic-catalog', 'info', url],
    queryFn: () =>
      fetcher<BasicCatalogInfo>(`/public/catalog/${encodeURIComponent(url)}`),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useBasicCatalogProducts(
  url: string,
  filters: BasicCatalogFilters,
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      params.set(k, String(v));
    }
  });
  const qs = params.toString();

  return useQuery({
    queryKey: ['basic-catalog', 'products', url, filters],
    queryFn: () =>
      fetcher<BasicCatalogProductsResponse>(
        `/public/catalog/${encodeURIComponent(url)}/products${qs ? `?${qs}` : ''}`,
      ),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    retry: 1,
  });
}