export type PhotoLimit = number | null;

export const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};
export const ACCEPTED_IMAGE_STRING = 'image/jpeg,image/jpg,image/png,image/webp,image/gif';
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function formatPhotoLimitDisplay(count: number, max: PhotoLimit): string {
  if (max === null) return String(count);
  return `${count} / ${max}`;
}

export function canAddMorePhotos(count: number, max: PhotoLimit): boolean {
  return max === null || count < max;
}

export function getAvailablePhotoSlots(count: number, max: PhotoLimit): number {
  if (max === null) return Infinity;
  return Math.max(0, max - count);
}

export function getTooManyFilesMessage(max: PhotoLimit): string {
  if (max === null) return 'Limite de fotos excedido';
  return `Você pode adicionar no máximo ${max} foto(s) por produto`;
}

export const UPLOAD_ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'Arquivo muito grande. Tamanho máximo: 5MB',
  INVALID_TYPE: 'Tipo de arquivo inválido. Use apenas imagens (JPG, PNG, WEBP, GIF)',
};

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: UPLOAD_ERROR_MESSAGES.INVALID_TYPE };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE };
  }
  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
