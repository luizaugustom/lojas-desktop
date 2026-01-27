// Lista de CNPJs das principais adquirentes/credenciadoras do Brasil
export interface AcquirerInfo {
  cnpj: string; // 14 dígitos sem formatação
  name: string;
}

export const DEFAULT_ACQUIRERS: AcquirerInfo[] = [
  { cnpj: '01027058000191', name: 'Cielo' },
  { cnpj: '03007331000175', name: 'Rede (Elavon)' },
  { cnpj: '16501555000157', name: 'Stone' },
  { cnpj: '08561701000101', name: 'PagSeguro' },
  { cnpj: '01203026000140', name: 'GetNet' },
  { cnpj: '58160789000128', name: 'SafraPay' },
  { cnpj: '10278908000163', name: 'Mercado Pago' },
  { cnpj: '06271476000120', name: 'Braspag' },
  { cnpj: '01027058000272', name: 'Cielo Soluções' },
  { cnpj: '01027058000353', name: 'Cielo Pagamentos' },
  { cnpj: '04544714000105', name: 'Vero' },
  { cnpj: '09017336000152', name: 'Adyen' },
  { cnpj: '10278908000163', name: 'Mercado Pago Pagamentos' },
  { cnpj: '08561701000282', name: 'PagSeguro Instituição de Pagamento' },
  { cnpj: '16501555000238', name: 'Stone Pagamentos' },
  { cnpj: '01203026000221', name: 'GetNet Instituição de Pagamento' },
  { cnpj: '02038232000164', name: 'Sicoob' },
  { cnpj: '03106213000271', name: 'Sicredi' },
];

const STORAGE_KEY = 'montshop_acquirer_cnpjs';
const LAST_SELECTED_KEY = 'montshop_last_acquirer_cnpj';

/**
 * Obtém a lista completa de adquirentes (padrão + personalizados)
 */
export function getAcquirerList(): AcquirerInfo[] {
  if (typeof window === 'undefined') return DEFAULT_ACQUIRERS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_ACQUIRERS;
    
    const custom: AcquirerInfo[] = JSON.parse(stored);
    // Combinar lista padrão com personalizados, removendo duplicatas
    const all = [...DEFAULT_ACQUIRERS];
    custom.forEach(customItem => {
      if (!all.find(item => item.cnpj === customItem.cnpj)) {
        all.push(customItem);
      }
    });
    
    return all;
  } catch {
    return DEFAULT_ACQUIRERS;
  }
}

/**
 * Adiciona um novo CNPJ à lista personalizada
 */
export function addCustomAcquirer(cnpj: string, name: string): void {
  if (typeof window === 'undefined') return;
  
  const cnpjCleaned = cnpj.replace(/\D/g, '');
  if (cnpjCleaned.length !== 14) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const custom: AcquirerInfo[] = stored ? JSON.parse(stored) : [];
    
    // Verificar se já existe
    if (custom.find(item => item.cnpj === cnpjCleaned)) return;
    
    custom.push({ cnpj: cnpjCleaned, name: name.trim() || 'Outra' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch (error) {
    console.error('Erro ao salvar CNPJ personalizado:', error);
  }
}

/**
 * Obtém o último CNPJ selecionado
 */
export function getLastSelectedAcquirer(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(LAST_SELECTED_KEY);
  } catch {
    return null;
  }
}

/**
 * Salva o último CNPJ selecionado
 */
export function setLastSelectedAcquirer(cnpj: string): void {
  if (typeof window === 'undefined') return;
  
  const cnpjCleaned = cnpj.replace(/\D/g, '');
  if (cnpjCleaned.length !== 14) return;
  
  try {
    localStorage.setItem(LAST_SELECTED_KEY, cnpjCleaned);
  } catch (error) {
    console.error('Erro ao salvar último CNPJ selecionado:', error);
  }
}

