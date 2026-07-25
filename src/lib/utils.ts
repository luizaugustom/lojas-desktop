import { formatISO } from 'date-fns';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function toLocalISOString(date: Date = new Date()): string {
  return formatISO(date);
}

export function getClientTimeContext(now: Date = new Date()) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    iso: toLocalISOString(now),
    timeZone,
    locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
    utcOffsetMinutes: now.getTimezoneOffset(),
  };
}

export function formatCPFCNPJ(value: string): string {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
}

export function formatPhone(value: string): string {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function generateCoherentUUID(seed?: string): string {
  if (seed) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash *= 0x01000193;
      hash &= 0xffffffff;
    }
    const timestamp = Date.now();
    hash ^= timestamp;
    const hex = Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      '4' + hex.substring(13, 16),
      '8' + hex.substring(17, 20),
      hex.substring(20, 32)
    ].join('-').toLowerCase();
  }
  return generateUUID();
}

export function getFileExtension(format: string): string {
  const extensions: Record<string, string> = {
    json: 'json',
    xml: 'xml',
    excel: 'xlsx',
  };
  return extensions[format] || format;
}

export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/** Extrai mensagem de erro de respostas blob (ex.: download com responseType: 'blob'). */
export async function getBlobErrorMessage(error: unknown, fallback: string): Promise<string> {
  const err = error as { response?: { data?: unknown }; message?: string };
  const data = err?.response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text) as { message?: string | string[] };
      if (typeof json?.message === 'string') return json.message;
      if (Array.isArray(json?.message)) return json.message.join(', ');
    } catch {
      /* ignore */
    }
  }
  if (data && typeof data === 'object' && data !== null && 'message' in data) {
    const msg = (data as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
  }
  if (typeof err?.message === 'string' && err.message) return err.message;
  return fallback;
}

export function convertPrismaIdToUUID(prismaId: string): string {
  // Prisma CUIDs são strings de 21 caracteres (base36)
  // Para converter para UUID, vamos usar o hash do CUID
  if (!prismaId || prismaId.length !== 21) {
    return prismaId;
  }
  
  let hash = 0x811c9dc5;
  for (let i = 0; i < prismaId.length; i++) {
    hash ^= prismaId.charCodeAt(i);
    hash *= 0x01000193;
    hash &= 0xffffffff;
  }
  
  const hex = Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(13, 16),
    '8' + hex.substring(17, 20),
    hex.substring(20, 32)
  ].join('-').toLowerCase();
}

export function isValidId(id: string | null | undefined): boolean {
  if (!id) return false;
  // UUID format or Prisma CUID format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
         /^[a-z0-9]{21}$/i.test(id);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

