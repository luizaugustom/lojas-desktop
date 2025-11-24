import { api } from './apiClient';
import type { DataPeriodFilter } from '../types';

export const productApi = {
  create: (data: any) => api.post('/product', data),
  createWithPhotos: (formData: FormData) => api.post('/product/upload-and-create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/product', { params }),
  stats: () => api.get('/product/stats'),
  lowStock: (threshold?: number) => api.get('/product/low-stock', { params: { threshold } }),
  expiring: (days?: number) => api.get('/product/expiring', { params: { days } }),
  categories: () => api.get('/product/categories'),
  byBarcode: (barcode: string) => api.get(`/product/barcode/${barcode}`),
  get: (id: string) => api.get(`/product/${id}`),
  update: (id: string, data: any) => api.patch(`/product/${id}`, data),
  updateWithPhotos: (id: string, formData: FormData) => api.patch(`/product/${id}/upload-and-update`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateStock: (id: string, data: any) => api.patch(`/product/${id}/stock`, data),
  delete: (id: string, params?: any) => api.delete(`/product/${id}`, { params }),
};

export const customerApi = {
  create: (data: any) => api.post('/customer', data),
  list: (params?: { page?: number; limit?: number; search?: string; companyId?: string }) =>
    api.get('/customer', { params }),
  get: (id: string) => api.get(`/customer/${id}`),
  update: (id: string, data: any) => api.patch(`/customer/${id}`, data),
  delete: (id: string, params?: any) => api.delete(`/customer/${id}`, { params }),
  sendBulkPromotionalEmail: (data: {
    title: string;
    message: string;
    description: string;
    discount: string;
    validUntil: string;
  }) => api.post('/customer/send-bulk-promotional-email', data),
};

export const sellerApi = {
  create: (data: any) => api.post('/seller', data),
  list: (params?: { companyId?: string; search?: string }) => api.get('/seller', { params }),
  get: (id: string) => api.get(`/seller/${id}`),
  update: (id: string, data: any) => api.patch(`/seller/${id}`, data),
  delete: (id: string) => api.delete(`/seller/${id}`),
  stats: (id: string) => api.get(`/seller/${id}/stats`),
  sales: (id: string, params?: { page?: number; limit?: number }) => api.get(`/seller/${id}/sales`, { params }),
  myProfile: {
    get: () => api.get('/seller/my-profile'),
    update: (data: any) => api.patch('/seller/my-profile', data),
  },
  myStats: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/seller/my-stats', { params }),
  mySales: (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    api.get('/seller/my-sales', { params }),
  updateMyDataPeriod: (dataPeriod: DataPeriodFilter) =>
    api.patch('/seller/my-data-period', { dataPeriod }),
};

export const saleApi = {
  create: (data: any) => api.post('/sale', data),
  list: (params?: { page?: number; limit?: number; startDate?: string; endDate?: string; sellerId?: string }) =>
    api.get('/sale', { params }),
  get: (id: string) => api.get(`/sale/${id}`),
  reprint: (id: string) => api.post(`/sale/${id}/reprint`),
  getPrintContent: (id: string) => api.get(`/sale/${id}/print-content`),
};

export const companyApi = {
  create: (data: any) => api.post('/company', data),
  list: () => api.get('/company'),
  myCompany: () => api.get('/company/my-company'),
  stats: () => api.get('/company/stats'),
  get: (id: string) => api.get(`/company/${id}`),
  updateMyCompany: (data: any) => api.patch('/company/my-company', data),
  updateDataPeriod: (dataPeriod: DataPeriodFilter) =>
    api.patch('/company/my-company/data-period', { dataPeriod }),
  update: (id: string, data: any) => api.patch(`/company/${id}`, data),
  delete: (id: string, config?: any) => api.delete(`/company/${id}`, config),
  activate: (id: string) => api.patch(`/company/${id}/activate`),
  deactivate: (id: string) => api.patch(`/company/${id}/deactivate`),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/company/my-company/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeLogo: () => api.delete('/company/my-company/logo'),
  getFiscalConfig: () => api.get('/company/my-company/fiscal-config'),
  hasValidFiscalConfig: () => api.get('/company/my-company/fiscal-config/valid'),
  updateFocusNfeConfig: (id: string, data: any) => api.patch(`/company/${id}/focus-nfe-config`, data),
  getFocusNfeConfig: (id: string) => api.get(`/company/${id}/focus-nfe-config`),
};

export const fiscalApi = {
  generateNFe: (data: any) => api.post('/fiscal/nfe', data),
  uploadXml: (file: File) => {
    const formData = new FormData();
    formData.append('xmlFile', file);
    return api.post('/fiscal/upload-xml', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (params?: { page?: number; limit?: number; search?: string; documentType?: string }) =>
    api.get('/fiscal', { params }),
  stats: () => api.get('/fiscal/stats'),
  validateCompany: () => api.get('/fiscal/validate-company'),
  byAccessKey: (accessKey: string) => api.get(`/fiscal/access-key/${accessKey}`),
  get: (id: string) => api.get(`/fiscal/${id}`),
  download: (id: string, format: 'xml' | 'pdf') =>
    api.get(`/fiscal/${id}/download`, { params: { format }, responseType: 'blob' }),
  cancel: (id: string, data: any) => api.post(`/fiscal/${id}/cancel`, data),
};

export const cashClosureApi = {
  create: (data: any) => api.post('/cash-closure', data),
  list: (params?: { page?: number; limit?: number; isClosed?: boolean }) =>
    api.get('/cash-closure', { params }),
  current: () => api.get('/cash-closure/current'),
  stats: () => api.get('/cash-closure/stats'),
  history: (params?: { page?: number; limit?: number }) =>
    api.get('/cash-closure/history', { params }),
  get: (id: string) => api.get(`/cash-closure/${id}`),
  close: (data: any) => api.patch('/cash-closure/close', data),
  reprint: (id: string, data?: { includeSaleDetails?: boolean }) => api.post(`/cash-closure/${id}/reprint`, data),
  getPrintContent: (id: string, params?: { includeSaleDetails?: boolean }) =>
    api.get(`/cash-closure/${id}/print-content`, { params }),
};

export const uploadApi = {
  single: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  multiple: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteFile: (fileUrl: string) => api.delete('/upload/file', { data: { fileUrl } }),
  deleteFiles: (fileUrls: string[]) => api.delete('/upload/files', { data: { fileUrls } }),
  info: (fileUrl: string) => api.post('/upload/info', { fileUrl }),
  resize: (file: File, maxWidth?: number, maxHeight?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/resize', formData, {
      params: { maxWidth, maxHeight },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  optimize: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/optimize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// printerApi removido - configuração de impressoras removida do sistema

export const scaleApi = {
  available: () => api.get('/scale/available'),
  registerDevices: (data: { computerId: string; scales: any[] }) => api.post('/scale/register-devices', data),
  discover: () => api.post('/scale/discover'),
  list: () => api.get('/scale'),
  create: (data: { name: string; connectionInfo: string }) => api.post('/scale', data),
  checkDrivers: () => api.get('/scale/check-drivers'),
  installDrivers: () => api.post('/scale/install-drivers'),
  status: (id: string) => api.get(`/scale/${id}/status`),
  test: (id: string) => api.post(`/scale/${id}/test`),
};

export const budgetApi = {
  create: (data: any) => api.post('/budget', data),
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/budget', { params }),
  get: (id: string) => api.get(`/budget/${id}`),
  update: (id: string, data: any) => api.patch(`/budget/${id}`, data),
  delete: (id: string) => api.delete(`/budget/${id}`),
  print: (id: string) => api.post(`/budget/${id}/print`),
  pdf: (id: string) => api.get(`/budget/${id}/pdf`, { responseType: 'blob' }),
  getPrintContent: (id: string) => api.get(`/budget/${id}/print-content`),
};

export const installmentApi = {
  create: (data: any) => api.post('/installment', data),
  list: (params?: { isPaid?: boolean; page?: number; limit?: number }) =>
    api.get('/installment', { params }),
  get: (id: string) => api.get(`/installment/${id}`),
  overdue: () => api.get('/installment/overdue'),
  stats: () => api.get('/installment/stats'),
  pay: (id: string, data: any) => api.post(`/installment/${id}/pay`, data),
};

export const billApi = {
  create: (data: any) => api.post('/bill-to-pay', data),
  list: (params?: { page?: number; limit?: number; isPaid?: boolean; startDate?: string; endDate?: string }) =>
    api.get('/bill-to-pay', { params }),
  stats: () => api.get('/bill-to-pay/stats'),
  overdue: () => api.get('/bill-to-pay/overdue'),
  upcoming: (days?: number) => api.get('/bill-to-pay/upcoming', { params: { days } }),
  get: (id: string) => api.get(`/bill-to-pay/${id}`),
  update: (id: string, data: any) => api.patch(`/bill-to-pay/${id}`, data),
  markPaid: (id: string) => api.patch(`/bill-to-pay/${id}/mark-paid`),
  delete: (id: string, data?: any) => api.delete(`/bill-to-pay/${id}`, { data }),
};

export const notificationApi = {
  list: (params?: { onlyUnread?: boolean }) => api.get('/notification', { params }),
  getUnreadCount: () => api.get('/notification/unread-count'),
  get: (id: string) => api.get(`/notification/${id}`),
  markAsRead: (id: string) => api.put(`/notification/${id}/read`),
  markAllAsRead: () => api.put('/notification/read-all'),
  delete: (id: string) => api.delete(`/notification/${id}`),
  getPreferences: () => api.get('/notification/preferences/me'),
  updatePreferences: (data: {
    stockAlerts?: boolean;
    billReminders?: boolean;
    weeklyReports?: boolean;
    salesAlerts?: boolean;
    systemUpdates?: boolean;
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
  }) => api.put('/notification/preferences', data),
};

export const storeCreditApi = {
  getBalance: (customerId: string) => api.get(`/store-credit/balance/${customerId}`),
  getBalanceByCpfCnpj: (cpfCnpj: string) => api.get(`/store-credit/balance-by-cpf/${cpfCnpj}`),
  getTransactions: (customerId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/store-credit/transactions/${customerId}`, { params }),
  use: (data: { customerId: string; amount: number; saleId?: string; description?: string }) =>
    api.post('/store-credit/use', data),
};

export const adminApi = {
  broadcastNotification: (data: {
    title: string;
    message: string;
    target: 'all' | 'companies' | 'sellers';
    actionUrl?: string;
    actionLabel?: string;
  }) => api.post('/admin/broadcast-notification', data),
};

