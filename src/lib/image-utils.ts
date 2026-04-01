/**
 * Utilitários para trabalhar com URLs de imagens
 * Suporta URLs do DigitalOcean Spaces, Firebase Storage (legado) e caminhos relativos
 */

export function getImageUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl || photoUrl.trim() === '') {
    return null;
  }

  // URLs absolutas (DO Spaces, Firebase Storage, ou qualquer CDN) — usar como está
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }

  // Caminhos relativos: retornar como estão (serão resolvidos pelo componente ou API)
  return photoUrl;
}

