import axios, { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

export interface ApiErrorDetails {
  message: string;
  status?: number;
  code?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
}

const TECHNICAL_PATTERNS = [
  /must be a UUID|uuid is expected|expected.*uuid/i,
  /Request failed with status code/i,
  /P2\d{3}/,
  /at\s+.*\s+\(.*\)/,
  /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ENETUNREACH/i,
  /SyntaxError|TypeError|ReferenceError/i,
];

function isTechnicalMessage(msg: string): boolean {
  if (!msg || typeof msg !== 'string') return true;
  const trimmed = msg.trim();
  if (trimmed.length > 500) return true;
  return TECHNICAL_PATTERNS.some((p) => p.test(trimmed));
}

function friendlyFallbackByStatus(status: number | undefined): string {
  switch (status) {
    case 400:
      return 'Dados inválidos. Verifique as informações e tente novamente.';
    case 404:
      return 'Recurso não encontrado.';
    case 409:
      return 'Conflito: os dados já existem ou estão em uso.';
    case 422:
      return 'Dados não puderam ser processados. Verifique os campos.';
    default:
      if (status && status >= 500) {
        return 'Erro no servidor. Tente novamente em alguns instantes.';
      }
      return 'Ocorreu um erro. Verifique os dados ou tente novamente.';
  }
}

/**
 * Trata erros de API. Garante mensagem compreensível ao usuário (nunca técnica).
 */
export function handleApiError(
  error: unknown,
  context?: {
    endpoint?: string;
    method?: string;
    userId?: string;
    showToast?: boolean;
  }
): ApiErrorDetails {
  const showToast = context?.showToast !== false;
  let message = 'Ocorreu um erro inesperado. Tente novamente.';
  let status: number | undefined;
  let code: string | undefined;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    status = axiosError.response?.status;
    const data = axiosError.response?.data as Record<string, unknown> | undefined;
    const endpoint = context?.endpoint || axiosError.config?.url || 'unknown';
    const method = context?.method || axiosError.config?.method?.toUpperCase() || 'unknown';

    if (axiosError.response) {
      let rawMessage: string | undefined;
      if (data?.message) {
        rawMessage = Array.isArray(data.message) ? data.message.join(', ') : String(data.message);
      } else if (data?.error) {
        rawMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (data?.errors) {
        if (Array.isArray(data.errors)) {
          rawMessage = (data.errors as unknown[])
            .map((err: unknown) => {
              if (typeof err === 'string') return err;
              if (err && typeof err === 'object' && 'message' in err) return (err as { message: string }).message;
              if (err && typeof err === 'object' && 'field' in err && 'message' in err)
                return `${(err as { field: string }).field}: ${(err as { message: string }).message}`;
              return JSON.stringify(err);
            })
            .join(', ');
        } else if (typeof data.errors === 'object' && data.errors !== null) {
          const fieldErrors = Object.entries(data.errors as Record<string, unknown>)
            .map(([field, messages]) => {
              const msgs = Array.isArray(messages) ? messages.join(', ') : String(messages ?? '');
              return `${field}: ${msgs}`;
            })
            .join('; ');
          rawMessage = fieldErrors || JSON.stringify(data.errors);
        } else {
          rawMessage = JSON.stringify(data.errors);
        }
      }

      if (rawMessage && !isTechnicalMessage(rawMessage)) {
        message = rawMessage;
      } else if (status === 400 && rawMessage?.toLowerCase().includes('uuid')) {
        message = 'O sistema espera IDs no formato correto. Entre em contato com o suporte técnico se o problema persistir.';
      } else {
        message = friendlyFallbackByStatus(status);
      }

      code = (data?.code as string) ?? (data?.errorCode as string);
    } else if (axiosError.request) {
      message = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
    } else {
      message = 'Ocorreu um erro ao processar a requisição. Tente novamente.';
    }
  } else if (error instanceof Error) {
    message = 'Ocorreu um erro inesperado. Tente novamente.';
  } else {
    message = 'Ocorreu um erro inesperado. Tente novamente.';
  }

  if (showToast) {
    toast.error(message, {
      duration: status && status >= 500 ? 6000 : 4000,
    });
  }

  return {
    message,
    status,
    code,
    endpoint: context?.endpoint,
    method: context?.method,
    userId: context?.userId,
  };
}
