import type { CSSProperties } from 'react';

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export type CatalogColors = {
  backgroundColor: string;
  headerBackgroundColor: string;
  headerTextColor: string;
  footerBackgroundColor: string;
  footerTextColor: string;
  textColor: string;
};

export const DEFAULT_CATALOG_COLORS: CatalogColors = {
  backgroundColor: '#F8FAFC',
  headerBackgroundColor: '#FFFFFF',
  headerTextColor: '#0F172A',
  footerBackgroundColor: '#F8FAFC',
  footerTextColor: '#475569',
  textColor: '#0F172A',
};

const COLOR_KEYS: (keyof CatalogColors)[] = [
  'backgroundColor',
  'headerBackgroundColor',
  'headerTextColor',
  'footerBackgroundColor',
  'footerTextColor',
  'textColor',
];

export function mergeCatalogColors(
  ...sources: Array<unknown | null | undefined>
): CatalogColors {
  const merged: CatalogColors = { ...DEFAULT_CATALOG_COLORS };
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    const src = source as Record<string, unknown>;
    for (const key of COLOR_KEYS) {
      const value = src[key];
      if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value)) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

export function catalogColorsToStyle(colors: CatalogColors): CSSProperties {
  return {
    '--catalog-bg': colors.backgroundColor,
    '--catalog-header-bg': colors.headerBackgroundColor,
    '--catalog-header-text': colors.headerTextColor,
    '--catalog-footer-bg': colors.footerBackgroundColor,
    '--catalog-footer-text': colors.footerTextColor,
    '--catalog-text': colors.textColor,
    colorScheme: 'light',
  } as CSSProperties;
}
