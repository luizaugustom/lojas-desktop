/**
 * Converte mensagens técnicas de erro de impressão (Electron/sistema) em texto amigável em português.
 */
const PRINT_ERROR_MAP: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /printer.*not found|impressora.*não encontrada|no default printer/i, message: 'Impressora não encontrada. Verifique se está ligada e selecionada.' },
  { pattern: /access denied|permission denied|acesso negado/i, message: 'Sem permissão para imprimir. Verifique as configurações do sistema.' },
  { pattern: /timeout|timed out|tempo esgotado/i, message: 'Tempo esgotado ao comunicar com a impressora. Tente novamente.' },
  { pattern: /invalid printer|impressora inválida/i, message: 'Impressora inválida ou indisponível.' },
  { pattern: /spooler|fila de impressão/i, message: 'Erro na fila de impressão. Reinicie o serviço de impressão se necessário.' },
  { pattern: /paper|papel|out of paper/i, message: 'Verifique se há papel na impressora.' },
  { pattern: /offline|desligada/i, message: 'Impressora parece estar desligada ou offline.' },
  { pattern: /ENOENT|no such file/i, message: 'Arquivo ou recurso de impressão não encontrado.' },
  { pattern: /ECONNREFUSED|connection refused/i, message: 'Não foi possível conectar à impressora.' },
];

const DEFAULT_MESSAGE = 'Falha ao imprimir. Verifique a impressora e tente novamente.';

export function getFriendlyPrintErrorMessage(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_MESSAGE;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_MESSAGE;
  const lower = trimmed.toLowerCase();
  for (const { pattern, message } of PRINT_ERROR_MAP) {
    if (pattern.test(lower)) return message;
  }
  return DEFAULT_MESSAGE;
}
