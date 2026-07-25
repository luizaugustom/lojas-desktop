import { api } from './apiClient';
import type {
  DataPeriodFilter,
  NfceEmitida,
  RegisterTimeClockDto,
  UpdateTimeClockConfigDto,
  AdjustTimeClockDto,
  RejectTimeClockDto,
  TimeClockFilterDto,
  UpdateSellerScheduleDto,
  MyScheduleResponse,
  SellerSchedule,
} from '../types';

/** Auth - alterar senha de login de empresa (admin ou gestor) */
export const authApi = {
  changeCompanyPassword: (companyId: string, newPassword: string) =>
    api.post(`/auth/company/${companyId}/change-password`, { newPassword }),
};

/** GET /ncm - Lista códigos NCM (proxy da API Receita Federal, evita CORS) */
export const ncmApi = {
  list: () => api.get('/ncm'),
};

export const productApi = {
  create: (data: any) => api.post('/product', data),
  createWithPhotos: (formData: FormData) => api.post('/product/upload-and-create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: (params?: { page?: number; limit?: number; search?: string; companyId?: string }) =>
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
  addStock: (id: string, data: { quantity: number; expirationDate?: string; batchNumber?: string; unitCost?: number }) =>
    api.post(`/product/${id}/stock`, data),
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
  exchange: (data: any) => api.post('/sale/exchange', data),
  cancel: (id: string, data: { reason: string }) => api.post(`/sale/${id}/cancel`, data),
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
  updateFiscalConfig: (data: any) => api.patch('/company/my-company/fiscal-config', data),
  uploadCertificate: (file: File) => {
    const formData = new FormData();
    formData.append('certificate', file);
    return api.post('/company/my-company/upload-certificate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getFiscalConfigForAdmin: (id: string) => api.get(`/company/${id}/fiscal-config`),
  updateFiscalConfigForAdmin: (id: string, data: any) =>
    api.patch(`/company/${id}/fiscal-config`, data),
  /**
   * FocusNFE config — como o token é global no Admin, esses endpoints delegam
   * para as rotas /admin/focus-nfe-config. O `id` é ignorado e mantido apenas
   * por compatibilidade de assinatura com o modal.
   */
  getFocusNfeConfigForAdmin: (_id?: string) => api.get('/admin/nfeio-config'),
  updateFocusNfeConfigForAdmin: (_id: string, data: any) =>
    api.patch('/admin/nfeio-config', {
      ...(data.focusNfeApiKey !== undefined && { nfeioApiKey: data.focusNfeApiKey }),
      ...(data.focusNfeEnvironment !== undefined && { nfeioEnvironment: data.focusNfeEnvironment }),
      ...(data.ibptToken !== undefined && { ibptToken: data.ibptToken }),
    }),
  acceptTerms: (data: { accepted: boolean }) => api.post('/company/terms', data),
};

export const billetApi = {
  list: (params?: { page?: number; limit?: number; status?: string; customerId?: string; startDate?: string; endDate?: string }) =>
    api.get('/billet', { params }),
  get: (id: string) => api.get(`/billet/${id}`),
  getPdf: (id: string) => api.get(`/billet/${id}/pdf`, { responseType: 'arraybuffer' }),
  cancel: (id: string) => api.post(`/billet/${id}/cancel`),
  markAsPaid: (id: string) => api.post(`/billet/${id}/mark-paid`),
  sendWhatsApp: (id: string) => api.post(`/billet/${id}/send-whatsapp`),
};

export interface UnimakeCompanyConfig {
  appId: string;
  configurationId: string;
  sandbox: boolean;
  configured: boolean;
}

export interface UnimakeCompanyOverviewRow {
  id: string;
  name: string;
  cnpj?: string | null;
  unimakeConfigured: boolean;
  unimakeSandbox: boolean;
  hasCertificateA1: boolean;
  boletoAllowed: boolean;
  boletoEnabled: boolean;
}

export const fiscalApi = {
  generateNFe: (data: any) => api.post('/fiscal/nfe', data),

  /**
   * POST /fiscal/nfce
   * Roles: COMPANY - Emitir NFC-e dedicada (modelo 65).
   * Retorna dados estruturados (chave, protocolo, QR Code) — Art. 8º.
   */
  emitirNfce: (data: {
    saleId: string;
    sellerName: string;
    clientCpfCnpj?: string;
    clientName?: string;
    clientEmail?: string;
    clientIndIEDest?: 1 | 2 | 9;
    clientIe?: string;
    clientAddress?: {
      zipCode?: string;
      street?: string;
      number?: string;
      district?: string;
      city?: string;
      state?: string;
      complement?: string;
      phone?: string;
    };
    items: Array<{
      productId: string;
      productName: string;
      barcode: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      discount?: number;
    }>;
    totalValue: number;
    valorDesconto?: number;
    troco?: number;
    payments: Array<{
      method: string;
      amount: number;
      cardIntegrationType?: string;
      acquirerCnpj?: string;
      cardBrand?: string;
      cardOperationType?: string;
      installmentCount?: number;
      installmentNumber?: number;
      authorizationCode?: string;
      terminalId?: string;
    }>;
    additionalInfo?: string;
    operationNature?: string;
    emissionPurpose?: number;
    referenceAccessKey?: string;
    pdvCode?: string;
    establishmentId?: string;
    indFinal?: 0 | 1;
    indicadorPresenca?: 1 | 2 | 3 | 4 | 9;
    intermediador?: { cnpj: string; idCadIntTran: string };
  }) => api.post<NfceEmitida>('/fiscal/nfce', data),
  generateReturnNFe: (inboundDocumentId: string) =>
    api.post('/fiscal/nfe-devolucao', { inboundDocumentId }),
  getInboundReturnPreview: (inboundDocumentId: string) =>
    api.get(`/fiscal/inbound-invoice/${inboundDocumentId}/return-preview`),
  getInboundReturns: (inboundDocumentId: string) =>
    api.get(`/fiscal/inbound-invoice/${inboundDocumentId}/returns`),
  parseInboundXml: (xml: string) => api.post('/fiscal/parse-inbound-xml', { xml }),
  fetchInboundXmlByAccessKey: (accessKeyOrBarcode: string) =>
    api.post<{ xml: string }>('/fiscal/inbound-nfe/xml-from-access-key', {
      accessKey: accessKeyOrBarcode,
    }),
  uploadXml: (file: File) => {
    const formData = new FormData();
    formData.append('xmlFile', file);
    return api.post('/fiscal/upload-xml', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (params?: { page?: number; limit?: number; search?: string; documentType?: string; startDate?: string; endDate?: string }) =>
    api.get('/fiscal', { params }),
  stats: () => api.get('/fiscal/stats'),
  validateCompany: () => api.get('/fiscal/validate-company'),
  byAccessKey: (accessKey: string) => api.get(`/fiscal/access-key/${accessKey}`),
  get: (id: string) => api.get(`/fiscal/${id}`),
  downloadInfo: (id: string) => api.get(`/fiscal/${id}/download-info`),
  download: (id: string, format: 'xml' | 'pdf') =>
    api.get(`/fiscal/${id}/download`, { params: { format }, responseType: 'blob' }),
  linkFocusRef: (id: string, focusRef: string) =>
    api.post(`/fiscal/${id}/link-focus-ref`, { focusRef }),
  sendEmail: (
    id: string,
    data: { email: string; format?: 'pdf' | 'xml' | 'both'; recipientName?: string },
  ) => api.post(`/fiscal/${id}/send-email`, data),
  cancel: (id: string, data: { reason: string }) => api.post(`/fiscal/${id}/cancel`, data),
  inutilizarNumeracao: (data: {
    serie: string;
    numeroInicial: number;
    numeroFinal: number;
    justificativa: string;
    modelo: '55' | '65';
  }) => api.post('/fiscal/inutilizacao', data),
  enviarCartaCorrecao: (id: string, data: { correcao: string }) =>
    api.post(`/fiscal/${id}/carta-correcao`, data),
  ativarContingencia: (data?: { motivo?: string; ttdType?: 'TTD_706' | 'TTD_707' | 'TTD_710' }) =>
    api.post('/fiscal/contingencia/ativar', data ?? {}),
  desativarContingencia: () => api.post('/fiscal/contingencia/desativar'),
  getContingenciaStatus: () => api.get('/fiscal/contingencia/status'),
  listarContingenciaPendentes: () => api.get('/fiscal/contingencia/pendentes'),
  changeTtdType: (data: { ttdType: 'TTD_706' | 'TTD_707' | 'TTD_710' }) =>
    api.post('/fiscal/contingencia/change-type', data),
  registrarDtecCredential: (data: { protocol: string; expiresAt: string }) =>
    api.post('/fiscal/contingencia/dtec/credential', data),
  getDtecStatus: () => api.get('/fiscal/contingencia/dtec/status'),
  getTermoCompromissoPdf: (type: 'TTD_706' | 'TTD_707' | 'TTD_710' | 'ALL' = 'ALL') =>
    api.get('/fiscal/contingencia/termo-compromisso/pdf', {
      params: { type },
      responseType: 'blob',
    }),
  aceitarTermoCompromisso: (data: { type: 'TTD_706' | 'TTD_707' | 'TTD_710' | 'ALL' }) =>
    api.post('/fiscal/contingencia/aceitar-termo', data),
  listarTermosCompromisso: () => api.get('/fiscal/contingencia/termo-compromisso/historico'),
  sincronizarContingencia: (id: string) =>
    api.post(`/fiscal/contingencia/sincronizar/${id}`),
  sincronizarTodasContingencias: () =>
    api.post('/fiscal/contingencia/sincronizar-todos'),
  gerarBlocoX: (inicio: string, fim: string) =>
    api.get('/fiscal/contingencia/bloco-x', { params: { inicio, fim } }),
  setFuelRetailer: (data: { isFuelRetailer: boolean; companyId?: string }) =>
    api.patch('/fiscal/contingencia/fuel-retailer', data),
  listarNumeracao: () => api.get('/fiscal/contingencia/numeracao'),
};

// ============================================================================
// ESTABLISHMENTS (Multi-estabelecimento — Art. 4º §2º)
// ============================================================================

export const establishmentApi = {
  list: () => api.get('/establishments'),
  listAll: () => api.get('/establishments/all'),
  get: (id: string) => api.get(`/establishments/${id}`),
  create: (data: any) => api.post('/establishments', data),
  update: (id: string, data: any) => api.patch(`/establishments/${id}`, data),
  deactivate: (id: string) => api.delete(`/establishments/${id}`),
  hardDelete: (id: string) => api.delete(`/establishments/${id}/hard`),
  credentialDtec: (id: string, data: { protocol: string; expiresAt: string }) =>
    api.post(`/establishments/${id}/dtec/credential`, data),
  listNfces: (id: string) => api.get(`/establishments/${id}/nfces`),
};

export const cashClosureApi = {
  create: (data: any) => api.post('/cash-closure', data),
  list: (params?: { page?: number; limit?: number; isClosed?: boolean }) =>
    api.get('/cash-closure', { params }),
  current: () => api.get('/cash-closure/current'),
  stats: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/cash-closure/stats', { params }),
  createWithdrawal: (data: { amount: number; reason: string }) =>
    api.post('/cash-closure/withdrawals', data),
  getWithdrawals: () => api.get('/cash-closure/withdrawals'),
  history: (params?: { page?: number; limit?: number }) =>
    api.get('/cash-closure/history', { params }),
  get: (id: string) => api.get(`/cash-closure/${id}`),
  close: (data: any) => api.patch('/cash-closure/close', data),
  reprint: (id: string, data?: { includeSaleDetails?: boolean }) => api.post(`/cash-closure/${id}/reprint`, data),
  getPrintContent: (id: string, params?: { includeSaleDetails?: boolean }) =>
    api.get(`/cash-closure/${id}/print-content`, { params }),
};

export const uploadApi = {
  single: (file: File, subfolder?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/single', formData, {
      params: subfolder ? { subfolder } : undefined,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  multiple: (files: File[], subfolder?: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post('/upload/multiple', formData, {
      params: subfolder ? { subfolder } : undefined,
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
  list: (params?: { isPaid?: boolean; page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    api.get('/installment', { params }),
  get: (id: string) => api.get(`/installment/${id}`),
  overdue: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/installment/overdue', { params }),
  stats: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/installment/stats', { params }),
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

export const notesApi = {
  list: (params?: { search?: string; authorFilter?: string }) =>
    api.get('/note', { params }),
  create: (data: { title?: string; content: string; visibleToSellers?: boolean }) =>
    api.post('/note', data),
  update: (id: string, data: { title?: string; content?: string; visibleToSellers?: boolean }) =>
    api.patch(`/note/${id}`, data),
  delete: (id: string) => api.delete(`/note/${id}`),
};

export const contactsApi = {
  list: (params?: { search?: string; authorFilter?: string }) =>
    api.get('/contact', { params }),
  create: (data: FormData) =>
    api.post('/contact', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: string, data: FormData) =>
    api.patch(`/contact/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/contact/${id}`),
};

export const taskApi = {
  create: (data: {
    title: string;
    description?: string;
    dueDate: string;
    type: 'PERSONAL' | 'WORK';
    assignedToId?: string;
    assignedToIds?: string[];
    hasExplicitTime?: boolean;
  }) => api.post('/task', data),
  list: (params?: {
    startDate?: string;
    endDate?: string;
    type?: 'PERSONAL' | 'WORK';
    isCompleted?: boolean;
    assignedToId?: string;
    search?: string;
  }) => api.get('/task', { params }),
  get: (id: string) => api.get(`/task/${id}`),
  update: (
    id: string,
    data: {
      title?: string;
      description?: string;
      dueDate?: string;
      type?: 'PERSONAL' | 'WORK';
      assignedToId?: string;
      assignedToIds?: string[];
      hasExplicitTime?: boolean;
    },
  ) => api.patch(`/task/${id}`, data),
  delete: (id: string) => api.delete(`/task/${id}`),
  markComplete: (id: string) => api.patch(`/task/${id}/complete`),
  markIncomplete: (id: string) => api.patch(`/task/${id}/incomplete`),
};

export const notificationApi = {
  list: (params?: { onlyUnread?: boolean }) => api.get('/notification', { params }),
  getUnreadCount: () => api.get('/notification/unread-count'),
  get: (id: string) => api.get(`/notification/${id}`),
  markAsRead: (id: string) => api.put(`/notification/${id}/read`),
  markAllAsRead: () => api.put('/notification/read-all'),
  deleteRead: () => api.delete('/notification/read'),
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
    desktopNotificationsEnabled?: boolean;
  }) => api.put('/notification/preferences', data),
};

export const storeCreditApi = {
  getBalance: (customerId: string) => api.get(`/store-credit/balance/${customerId}`),
  getBalanceByCpfCnpj: (cpfCnpj: string) => api.get(`/store-credit/balance-by-cpf/${cpfCnpj}`),
  getTransactions: (customerId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/store-credit/transactions/${customerId}`, { params }),
  use: (data: { customerId: string; amount: number; saleId?: string; description?: string }) =>
    api.post('/store-credit/use', data),
  printRemainingBalanceVoucher: (data: { customerId: string; amountUsed: number }) =>
    api.post('/store-credit/print-remaining-balance-voucher', data),
};

export const adminApi = {
  broadcastNotification: (data: {
    title: string;
    message: string;
    target: 'all' | 'companies' | 'sellers';
    actionUrl?: string;
    actionLabel?: string;
  }) => api.post('/admin/broadcast-notification', data),

  /**
   * PATCH /admin/nfeio-config
   * Roles: ADMIN - Token IBPT global (rota legada; use principalmente { ibptToken })
   */
  updateFocusNfeConfig: (data: any) =>
    api.patch('/admin/nfeio-config', {
      ...(data.focusNfeApiKey !== undefined && { nfeioApiKey: data.focusNfeApiKey }),
      ...(data.focusNfeEnvironment !== undefined && { nfeioEnvironment: data.focusNfeEnvironment }),
      ...(data.ibptToken !== undefined && { ibptToken: data.ibptToken }),
    }),

  /**
   * GET /admin/nfeio-config
   * Roles: ADMIN - Metadados IBPT global (e campos legados Focus, se existirem)
   */
  getFocusNfeConfig: () => api.get('/admin/nfeio-config'),

  /**
   * GET /admin/companies/unimake-overview
   * Roles: ADMIN - Visão geral das empresas × Unimake (e-Boleto)
   */
  listCompaniesForUnimake: () =>
    api.get<UnimakeCompanyOverviewRow[]>('/admin/companies/unimake-overview'),

  /**
   * GET /admin/companies/:companyId/unimake
   * Roles: ADMIN - Configuração Unimake de uma empresa (sem appKey)
   */
  getCompanyUnimake: (companyId: string) =>
    api.get<UnimakeCompanyConfig>(`/admin/companies/${companyId}/unimake`),

  /**
   * PATCH /admin/companies/:companyId/unimake
   * Roles: ADMIN - Configurar credenciais Unimake de uma empresa
   */
  updateCompanyUnimake: (
    companyId: string,
    data: { appId?: string; appKey?: string; configurationId?: string; sandbox?: boolean },
  ) => api.patch<UnimakeCompanyConfig>(`/admin/companies/${companyId}/unimake`, data),
};

export const whatsappApi = {
  createInstance: () =>
    api.post('/whatsapp/instance/create', {}),
  connect: () =>
    api.get<{ qr: string | null; pairingCode?: string; instanceName?: string }>('/whatsapp/instance/connect'),
  getInstanceStatus: () =>
    api.get<{
      hasInstance: boolean;
      connected: boolean;
      status: string;
      instanceName?: string;
      connectedPhone?: string | null;
    }>('/whatsapp/instance/status'),
  disconnectInstance: () =>
    api.delete('/whatsapp/instance/disconnect'),
  deleteInstance: () =>
    api.delete('/whatsapp/instance/delete'),
  sendMessage: (data: any) => api.post('/whatsapp/send-message', data),
  sendTemplate: (data: any) => api.post('/whatsapp/send-template', data),
  validatePhone: (phone: string) => api.post('/whatsapp/validate-phone', { phone }),
  formatPhone: (phone: string) => api.post('/whatsapp/format-phone', { phone }),
};

export const dashboardApi = {
  metrics: (companyId?: string, startDate?: string, endDate?: string) =>
    api.get('/dashboard/metrics', {
      params: {
        ...(companyId ? { companyId } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      },
    }),
  trends: (params?: {
    companyId?: string;
    period?: '7d' | '30d' | '90d';
    startDate?: string;
    endDate?: string;
  }) =>
    api.get('/dashboard/metrics/trends', { params: params ?? {} }),
  metricsByStore: (params: { startDate: string; endDate: string }) =>
    api.get('/dashboard/metrics/by-store', { params }),
};

export const managerApi = {
  myCompanies: () => api.get('/manager/my-companies'),
  list: () => api.get('/manager'),
  getOne: (id: string) => api.get(`/manager/${id}`),
  create: (data: { login: string; password: string; name?: string }) => api.post('/manager', data),
  update: (id: string, data: { login?: string; password?: string; name?: string }) => api.patch(`/manager/${id}`, data),
  delete: (id: string) => api.delete(`/manager/${id}`),
  setCompanies: (id: string, companyIds: string[]) => api.put(`/manager/${id}/companies`, { companyIds }),
};

export const stockTransferApi = {
  create: (data: { fromCompanyId: string; toCompanyId: string; productId: string; quantity: number }) =>
    api.post('/stock-transfer', data),
  list: (params?: { page?: number; limit?: number; fromCompanyId?: string; toCompanyId?: string; startDate?: string; endDate?: string }) =>
    api.get('/stock-transfer', { params }),
  getPdf: (id: string) => api.get(`/stock-transfer/${id}/pdf`, { responseType: 'blob' }),
};

export const cardAcquirerRateApi = {
  list: () => api.get('/card-acquirer-rates'),
  get: (id: string) => api.get(`/card-acquirer-rates/${id}`),
  create: (data: {
    acquirerCnpj: string;
    acquirerName: string;
    debitRate: number;
    creditRate: number;
    installmentRates?: Record<string, number>;
    isActive?: boolean;
  }) => api.post('/card-acquirer-rates', data),
  update: (id: string, data: {
    acquirerCnpj?: string;
    acquirerName?: string;
    debitRate?: number;
    creditRate?: number;
    installmentRates?: Record<string, number>;
    isActive?: boolean;
  }) => api.patch(`/card-acquirer-rates/${id}`, data),
  delete: (id: string) => api.delete(`/card-acquirer-rates/${id}`),
};

// ============================================================================
// TIME CLOCK (Ponto Eletrônico)
// ============================================================================

export const timeClockApi = {
  register: (data: RegisterTimeClockDto) => api.post('/time-clock/register', data),
  myToday: () => api.get('/time-clock/my-today'),
  myHistory: (params?: TimeClockFilterDto) => api.get('/time-clock/my-history', { params }),
  myStats: (params?: { month?: string }) =>
    api.get('/time-clock/my-stats', { params }),
  /** GET /time-clock/my-schedule — jornada esperada do vendedor logado (com fallback da empresa). */
  mySchedule: () => api.get<MyScheduleResponse>('/time-clock/my-schedule'),
  getConfig: (params?: { companyId?: string }) =>
    api.get('/time-clock/config', { params }),
  updateConfig: (data: UpdateTimeClockConfigDto) => api.put('/time-clock/config', data),
  regenerateQr: () => api.post('/time-clock/config/regenerate-qr'),
  getQrCode: () => api.get('/time-clock/qr-code'),
  list: (params?: TimeClockFilterDto) => api.get('/time-clock', { params }),
  pending: () => api.get('/time-clock/pending'),
  bySeller: (sellerId: string, params?: TimeClockFilterDto) =>
    api.get(`/time-clock/seller/${sellerId}`, { params }),
  approve: (id: string) => api.post(`/time-clock/${id}/approve`),
  reject: (id: string, data: RejectTimeClockDto) =>
    api.post(`/time-clock/${id}/reject`, data),
  adjust: (id: string, data: AdjustTimeClockDto) => api.post(`/time-clock/${id}/adjust`, data),
  stats: (params?: { month?: string }) =>
    api.get('/time-clock/stats', { params }),
  reportPdf: (params?: TimeClockFilterDto) =>
    api.get('/time-clock/report/pdf', { params, responseType: 'blob' }),
  reportCsv: (params?: TimeClockFilterDto) =>
    api.get('/time-clock/report/csv', { params, responseType: 'blob' }),
};

/** Jornada individual por vendedor (admin/gestor). */
export const sellerScheduleApi = {
  get: (sellerId: string) => api.get<{ schedule: SellerSchedule | null }>(`/seller/${sellerId}/schedule`),
  upsert: (sellerId: string, data: UpdateSellerScheduleDto) =>
    api.put<{ schedule: SellerSchedule }>(`/seller/${sellerId}/schedule`, data),
  remove: (sellerId: string) => api.delete<{ removed: boolean }>(`/seller/${sellerId}/schedule`),
};

