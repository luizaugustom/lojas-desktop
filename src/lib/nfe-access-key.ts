/**
 * Extrai / normaliza chave de acesso NF-e/NFC-e (44 dígitos).
 *
 * Aceita:
 * - 44 dígitos (chave completa)
 * - 43 dígitos (sem DV) → calcula e acrescenta o DV
 * - 42 dígitos sem UF do emitente (comum em alguns DANFE/leitores)
 * - 42 dígitos com UF mas sem 2 dígitos do CNPJ (leitores que “comem” 2 dígitos
 *   antes do modelo 55/65) → testa inserções 00–99 e filtra pelo DV
 * - QR/URL (chNFe=, p=) e prefixos de leitor (AIM ]C1)
 */

const UF_IBGE_CODES = [
  '11', '12', '13', '14', '15', '16', '17', '21', '22', '23', '24', '25', '26', '27', '28',
  '29', '31', '32', '33', '35', '41', '42', '43', '50', '51', '52', '53',
] as const;

export type ExtractNfeAccessKeyOptions = {
  /** Código IBGE da UF (2 dígitos) para priorizar ao completar chave de 42 dígitos */
  preferredUfCode?: string | null;
};

export function extractNfeAccessKey(
  raw: string,
  options: ExtractNfeAccessKeyOptions = {},
): string | null {
  if (!raw?.trim()) return null;

  const trimmed = raw.trim();

  const fromQuery =
    trimmed.match(/[?&#/](?:chNFe|nfe)=(\d{44})/i) ||
    trimmed.match(/[?&#/]p=(\d{44})/i) ||
    trimmed.match(/(?:chNFe|nfe)[=:](\d{44})/i);
  if (fromQuery?.[1]) return isValidNfeAccessKey(fromQuery[1]) ? fromQuery[1] : null;

  const digits = trimmed.replace(/\D/g, '');
  return normalizeNfeAccessKeyDigits(digits, options);
}

/** Normaliza sequência só com dígitos para chave de 44 posições (quando possível sem ambiguidade). */
export function normalizeNfeAccessKeyDigits(
  digits: string,
  options: ExtractNfeAccessKeyOptions = {},
): string | null {
  if (!digits) return null;

  if (digits.length === 44) {
    return isValidNfeAccessKey(digits) ? digits : null;
  }

  if (digits.length > 44) {
    for (let i = 0; i <= digits.length - 44; i++) {
      const candidate = digits.slice(i, i + 44);
      if (isValidNfeAccessKey(candidate)) return candidate;
    }
    return null;
  }

  if (digits.length === 43) {
    const model = digits.slice(20, 22);
    if (model === '55' || model === '65') {
      const key44 = `${digits}${calcNfeAccessKeyDv(digits)}`;
      return isValidNfeAccessKey(key44) ? key44 : null;
    }
  }

  if (digits.length === 42) {
    const matches = expandNfeAccessKeyCandidates(digits);
    if (matches.length === 0) return null;

    const preferred = options.preferredUfCode?.replace(/\D/g, '').slice(0, 2);
    if (preferred) {
      const preferredMatch = matches.find((m) => m.startsWith(preferred));
      if (preferredMatch) return preferredMatch;
    }

    if (matches.length === 1) return matches[0];
    return null;
  }

  return null;
}

/**
 * Expande 42/43/44 dígitos em uma ou mais chaves de 44 para consulta na SEFAZ.
 */
export function expandNfeAccessKeyCandidates(raw: string): string[] {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 44) {
    return isValidNfeAccessKey(digits) ? [digits] : [];
  }

  if (digits.length === 43) {
    const model = digits.slice(20, 22);
    if (model === '55' || model === '65') {
      const key44 = `${digits}${calcNfeAccessKeyDv(digits)}`;
      return isValidNfeAccessKey(key44) ? [key44] : [];
    }
    return [];
  }

  if (digits.length === 42) {
    if (hasUfAndShiftedModel(digits)) {
      return listAccessKeysMissingCnpjTail(digits);
    }
    if (isMissingUfPattern(digits)) {
      return listAccessKeysMissingUf(digits);
    }
    return [];
  }

  const normalized = extractNfeAccessKey(raw);
  return normalized ? [normalized] : [];
}

/** UF + AAMM válidos no início e modelo 55/65 na posição 18 → faltam 2 dígitos do CNPJ. */
function hasUfAndShiftedModel(digits42: string): boolean {
  const uf = digits42.slice(0, 2);
  if (!(UF_IBGE_CODES as readonly string[]).includes(uf)) return false;

  const year = Number(digits42.slice(2, 4));
  const month = Number(digits42.slice(4, 6));
  const currentYear = new Date().getFullYear() % 100;
  if (year < 6 || year > currentYear || month < 1 || month > 12) return false;

  const model = digits42.slice(18, 20);
  return model === '55' || model === '65';
}

/** Chave sem os 2 dígitos da UF do emitente: modelo fica nas posições 18-19. */
function isMissingUfPattern(digits42: string): boolean {
  const model = digits42.slice(18, 20);
  return model === '55' || model === '65';
}

export function listAccessKeysMissingUf(digits42: string): string[] {
  const matches: string[] = [];
  for (const uf of UF_IBGE_CODES) {
    const body43 = `${uf}${digits42.slice(0, 41)}`;
    const expectedDv = calcNfeAccessKeyDv(body43);
    const actualDv = digits42.slice(41, 42);
    if (String(expectedDv) !== actualDv) continue;
    const key44 = `${uf}${digits42}`;
    if (isValidNfeAccessKey(key44)) matches.push(key44);
  }
  return matches;
}

/**
 * Lê 42 dígitos com UF, mas sem 2 dígitos do CNPJ (antes do modelo).
 * Insere 00–99 na posição 18 e mantém só chaves com DV válido.
 */
export function listAccessKeysMissingCnpjTail(digits42: string): string[] {
  const before = digits42.slice(0, 18);
  const after = digits42.slice(18);
  const matches: string[] = [];
  for (let i = 0; i < 100; i++) {
    const mid = String(i).padStart(2, '0');
    const key44 = `${before}${mid}${after}`;
    if (isValidNfeAccessKey(key44)) matches.push(key44);
  }
  return matches;
}

/** DV módulo 11 da chave NF-e (manual SEFAZ: resto 0 ou 1 → DV 0). */
export function calcNfeAccessKeyDv(body43: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = body43.length - 1; i >= 0; i--) {
    sum += Number(body43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const resto = sum % 11;
  if (resto === 0 || resto === 1) return 0;
  return 11 - resto;
}

function isValidNfeAccessKey(key44: string): boolean {
  if (!/^\d{44}$/.test(key44)) return false;
  if (!(UF_IBGE_CODES as readonly string[]).includes(key44.slice(0, 2))) return false;

  const year = Number(key44.slice(2, 4));
  const month = Number(key44.slice(4, 6));
  const currentYear = new Date().getFullYear() % 100;
  if (year < 6 || year > currentYear || month < 1 || month > 12) return false;

  const model = key44.slice(20, 22);
  if (model !== '55' && model !== '65') return false;

  return calcNfeAccessKeyDv(key44.slice(0, 43)) === Number(key44[43]);
}

/** Mapa sigla UF → código IBGE (para preferir UF da empresa ao completar 42 dígitos). */
export const UF_SIGLA_TO_IBGE: Record<string, string> = {
  AC: '12', AL: '27', AM: '13', AP: '16', BA: '29', CE: '23', DF: '53', ES: '32',
  GO: '52', MA: '21', MG: '31', MS: '50', MT: '51', PA: '15', PB: '25', PE: '26',
  PI: '22', PR: '41', RJ: '33', RN: '24', RO: '11', RR: '14', RS: '43', SC: '42',
  SE: '28', SP: '35', TO: '17',
};

export function ufSiglaToIbge(state?: string | null): string | null {
  if (!state) return null;
  const sigla = state.trim().toUpperCase();
  return UF_SIGLA_TO_IBGE[sigla] ?? null;
}
