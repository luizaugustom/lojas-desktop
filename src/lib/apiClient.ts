import axios, { AxiosInstance, AxiosError } from 'axios';
import { getClientTimeContext } from './utils';

const API_BASE_URL = 'https://montshop-api-qi3v4.ondigitalocean.app';

// Armazenamento do access token
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }
}

export function getAccessToken(): string | null {
  if (accessToken) {
    return accessToken;
  }
  if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      accessToken = storedToken;
      return storedToken;
    }
  }
  return null;
}

export function clearAccessToken() {
  accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
  }
}

// Obter ID do computador
async function getComputerId(): Promise<string> {
  if (window.electronAPI) {
    return await window.electronAPI.devices.getComputerId();
  }
  // Fallback para navegador
  return 'browser-' + navigator.userAgent;
}

// Axios instance
const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
instance.interceptors.request.use(
  async (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    // Adicionar ID do computador
    try {
      const computerId = await getComputerId();
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)['x-computer-id'] = computerId;
    } catch (error) {
      console.error('Erro ao obter computerId:', error);
    }

    if (typeof window !== 'undefined') {
      const { iso, timeZone, locale, utcOffsetMinutes } = getClientTimeContext();
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)['x-client-datetime'] = iso;
      if (timeZone) {
        (config.headers as Record<string, string>)['x-client-timezone'] = timeZone;
      }
      if (typeof utcOffsetMinutes === 'number') {
        (config.headers as Record<string, string>)['x-client-utc-offset'] = String(utcOffsetMinutes);
      }
      if (locale) {
        (config.headers as Record<string, string>)['x-client-locale'] = locale;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor para refresh token
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function requestRefresh(): Promise<{ access_token: string; user: any }> {
  const refreshClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
  });
  const response = await refreshClient.post('/auth/refresh');
  return response.data;
}

function processRefreshQueue(newToken: string | null) {
  refreshQueue.forEach((cb) => {
    try {
      cb(newToken);
    } catch {}
  });
  refreshQueue = [];
}

instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    const status = error.response?.status;
    const originalUrl = originalRequest?.url || '';

    if (status === 401 && originalRequest && !/\/auth\/(login|refresh)/.test(originalUrl)) {
      if (originalRequest._retry) {
        clearAccessToken();
        return Promise.reject(error);
      }
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((newToken) => {
            if (!newToken) {
              reject(error);
              return;
            }
            originalRequest.headers = originalRequest.headers ?? {};
            (originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
            resolve(instance(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const data = await requestRefresh();
        const newToken = data.access_token;
        setAccessToken(newToken);

        processRefreshQueue(newToken);
        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        return instance(originalRequest);
      } catch (refreshErr) {
        clearAccessToken();
        processRefreshQueue(null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const api = instance;

// API methods - authLogin movido para depois das interfaces

export async function authLogout(): Promise<void> {
  try {
    await instance.post('/auth/logout');
  } finally {
    clearAccessToken();
  }
}

export async function authRefresh(): Promise<{ access_token: string; user: any }> {
  const data = await requestRefresh();
  return data;
}

export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
}

export interface ActiveSession {
  id: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceName: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export async function authLogin(
  login: string, 
  password: string, 
  deviceInfo?: DeviceInfo
): Promise<{ access_token: string; user: any }> {
  const res = await instance.post('/auth/login', { 
    login, 
    password,
    deviceId: deviceInfo?.deviceId,
    deviceName: deviceInfo?.deviceName,
  });
  return res.data;
}

/**
 * GET /auth/sessions
 * Listar sessões ativas do usuário
 */
export async function getActiveSessions(): Promise<ActiveSession[]> {
  const res = await instance.get('/auth/sessions');
  return res.data;
}

/**
 * POST /auth/sessions/:sessionId/revoke
 * Invalidar uma sessão específica
 */
export async function revokeSession(sessionId: string): Promise<{ message: string }> {
  const res = await instance.post(`/auth/sessions/${sessionId}/revoke`);
  return res.data;
}

/**
 * POST /auth/sessions/revoke-others
 * Invalidar todas as outras sessões (exceto a atual)
 */
export async function revokeOtherSessions(): Promise<{ message: string; revokedCount: number }> {
  const res = await instance.post('/auth/sessions/revoke-others');
  return res.data;
}

