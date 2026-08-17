export type UserRole = 'admin' | 'empresa' | 'vendedor' | 'gestor';

export type DataPeriodFilter =
  | 'ALL'
  | 'THIS_YEAR'
  | 'LAST_6_MONTHS'
  | 'LAST_3_MONTHS'
  | 'LAST_1_MONTH'
  | 'LAST_15_DAYS'
  | 'THIS_WEEK';

export enum PlanType {
  PRO = 'PRO',
  TRIAL_7_DAYS = 'TRIAL_7_DAYS',
}

export interface PlanLimits {
  maxProducts: number | null;
  maxSellers: number | null;
  maxBillsToPay: number | null;
}

export interface PlanUsageStats {
  plan: PlanType;
  limits: PlanLimits;
  usage: {
    products: {
      current: number;
      max: number | null;
      percentage: number;
      available: number | null;
    };
    sellers: {
      current: number;
      max: number | null;
      percentage: number;
      available: number | null;
    };
    billsToPay: {
      current: number;
      max: number | null;
      percentage: number;
      available: number | null;
    };
  };
}

export interface PlanWarnings {
  nearLimit: boolean;
  warnings: string[];
}

export interface User {
  id: string;
  name: string;
  email?: string;
  login?: string;
  role: UserRole;
  companyId?: string | null;
  companyIds?: string[];
  plan?: PlanType;
  dataPeriod?: DataPeriodFilter | null;
  nfeEmissionEnabled?: boolean;
  /** ATO DIAT 38/2020 — habilita o usuário a emitir NFC-e */
  nfceEmissionEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// ATO DIAT 38/2020 — Tipos fiscais NFC-e
// ============================================================

/** NFC-e autorizada exibida no PDV (Art. 8º — idônea como DANFE). */
export interface NfceEmitida {
  id: string;
  documentNumber: string;
  serie: string;
  accessKey: string;
  protocol: string;
  authorizationDateTime: string;
  qrCodeUrl?: string;
  /** Texto base64/URL do QR Code (Art. 14). */
  qrCode?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  totalValue: number;
  contingencia: boolean;
  ttdType?: 'TTD_706' | 'TTD_707' | 'TTD_710';
  pdvCode?: string;
  contingencyMessage?: string;
}

/** Status de contingência NFC-e (Art. 4º §1º). */
export interface ContingencyStatus {
  active: boolean;
  ttdType?: 'TTD_706' | 'TTD_707' | 'TTD_710';
  motivo?: string;
  dataInicio?: string;
  dataFim?: string;
  pendentesCount: number;
}

/** Configuração fiscal da empresa (CSC, ID Token, etc.). */
export interface FiscalConfig {
  cnpj: string;
  ie?: string;
  im?: string;
  cnae?: string;
  /** 1=Simples Nacional, 2=Simples Excesso, 3=Regime Normal */
  taxRegime?: number;
  /** 1=Produção, 2=Homologação */
  sefazEnvironment?: 1 | 2;
  nfceSerie?: string;
  nfeSerie?: string;
  /** Código de Segurança do Contribuinte (NFC-e). */
  csc?: string;
  /** ID do token CSC (até 6 dígitos). */
  idTokenCsc?: string;
  hasCertificateBlob?: boolean;
  hasCertificatePassword?: boolean;
  nfceEmissionEnabled?: boolean;
  nfeEmissionEnabled?: boolean;
  emitOnlyNfe?: boolean;
  isFuelRetailer?: boolean;
  pdvSeries?: Record<string, string>;
  ttdChangeCount?: number;
  ttdChangeAllowed?: boolean;
}

export interface Company {
  id: string;
  name: string;
  fantasyName?: string;
  login: string;
  cnpj: string;
  email: string;
  phone?: string;
  plan?: PlanType;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  brandColor?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Plan Limits Configuration
  maxProducts?: number | null;
  maxCustomers?: number | null;
  maxSellers?: number | null;
  photoUploadEnabled?: boolean;
  maxPhotosPerProduct?: number | null;
  nfceEmissionEnabled?: boolean;
  nfeEmissionEnabled?: boolean;
  // Feature Permissions
  catalogPageAllowed?: boolean;
  autoMessageAllowed?: boolean;
  boletoAllowed?: boolean;
  // Installment Configuration
  installmentInterestRates?: Record<string, number>; // Taxas de juros por parcela: { "1": 0, "2": 2.5, "3": 3.0, ... }
  maxInstallments?: number; // Limite máximo de parcelas
  // Terms of Use Acceptance
  termsAccepted?: boolean;
  termsAcceptedAt?: string | null;
  termsRejectedAt?: string | null;
  // ATO DIAT 38/2020 — Art. 2º (DTEC) e Art. 4º §1º (TTD)
  dtecCredentialed?: boolean;
  dtecCredentialedAt?: string | null;
  dtecCredentialExpiresAt?: string | null;
  dtecCredentialProtocol?: string | null;
  nfcContingencyType?: 'NONE' | 'TTD_706' | 'TTD_707' | 'TTD_710' | null;
}

export interface Admin {
  id: string;
  login: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockEntry {
  id: string;
  batchNumber: string | null;
  expirationDate: string | null;
  quantity: number;
  unitCost: number;
  inboundInvoiceId: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  costPrice?: number;
  stockQuantity: number;
  stockEntries?: StockEntry[];
  nearestExpirationDate?: string | null;
  minStockQuantity?: number;
  lowStockAlertThreshold?: number;
  category?: string;
  description?: string;
  photos?: string[];
  expirationDate?: string;
  unitOfMeasure?: string;
  ncm?: string;
  cfop?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  // Promotion fields
  promotionPrice?: number;
  promotionDiscount?: number;
  isOnPromotion?: boolean;
  promotionName?: string;
  originalPrice?: number;
}

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'installment' | 'store_credit' | 'loss';

export interface PaymentMethodDetail {
  method: PaymentMethod;
  amount: number;
  customerId?: string;
  installments?: number;
  firstDueDate?: Date;
  description?: string;
  // Grupo Card (NT 2025.001) - Obrigatório para pagamentos com cartão
  cardIntegrationType?: string; // '1' = Integrado, '2' = Não integrado
  acquirerCnpj?: string; // CNPJ da credenciadora (14 dígitos)
  cardBrand?: string; // '01' = Visa, '02' = Mastercard, '03' = Amex, '04' = Elo, '05' = Hipercard, '99' = Outras
  cardOperationType?: string; // '01' = Crédito à vista, '02' = Crédito parcelado, '03' = Débito
  installmentCount?: number; // Número de parcelas (obrigatório quando cardOperationType = '02')
}

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  items: SaleItem[];
  total: number;
  discount?: number;
  paymentMethods: PaymentMethod[];
  paymentMethodDetails?: PaymentMethodDetail[];
  totalPaid?: number;
  change?: number;
  clientName?: string;
  customerId?: string;
  sellerId: string;
  seller?: User;
  companyId: string;
  cashClosureId?: string;
  createdAt: string;
  updatedAt: string;
  exchanges?: Exchange[];
}

export type ExchangePaymentType = 'PAYMENT' | 'REFUND';
export type ExchangeStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface ExchangePayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  additionalInfo?: string;
  createdAt: string;
  type?: ExchangePaymentType;
}

export interface ExchangeFiscalDocument {
  id: string;
  documentType: string;
  origin?: string;
  documentNumber?: string | null;
  accessKey?: string | null;
  status?: string;
  totalValue?: number;
  pdfUrl?: string | null;
  qrCodeUrl?: string | null;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface ExchangeDeliveredItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: {
    id: string;
    name: string;
    barcode?: string | null;
  } | null;
}

export interface ExchangeReturnedItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  saleItemId?: string | null;
  product?: {
    id: string;
    name: string;
    barcode?: string | null;
  } | null;
  saleItem?: {
    id: string;
    quantity: number;
    unitPrice: number;
    product?: {
      id: string;
      name: string;
      barcode?: string | null;
    } | null;
  } | null;
}

export interface Exchange {
  id: string;
  reason: string;
  note?: string | null;
  exchangeDate: string;
  returnedTotal: number;
  deliveredTotal: number;
  difference: number;
  storeCreditAmount: number;
  status: ExchangeStatus;
  processedBy?: {
    id: string;
    name: string;
  } | null;
  returnedItems: ExchangeReturnedItem[];
  deliveredItems: ExchangeDeliveredItem[];
  payments: ExchangePayment[];
  refunds: ExchangePayment[];
  createdAt: string;
  fiscalDocuments?: ExchangeFiscalDocument[];
  returnFiscalDocument?: ExchangeFiscalDocument | null;
  deliveryFiscalDocument?: ExchangeFiscalDocument | null;
  fiscalWarnings?: string[];
}

export interface Seller {
  id: string;
  login: string;
  name: string;
  cpf?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  commissionRate?: number;
  hasIndividualCash?: boolean;
  nfeEmissionEnabled?: boolean;
  /** ATO DIAT 38/2020 */
  nfceEmissionEnabled?: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  totalSales?: number;
  totalRevenue?: number;
  averageSaleValue?: number;
}

export interface SellerStats {
  totalSales: number;
  totalRevenue: number;
  averageSaleValue: number;
  salesByPeriod: {
    date: string;
    total: number;
    revenue: number;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
}

export interface SellerSalesResponse {
  data: Sale[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  storeCreditBalance?: number;
  address?: CustomerAddress;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreCreditBalance {
  customerId: string;
  customerName: string;
  cpfCnpj?: string;
  balance: number;
}

export interface StoreCreditTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
  exchangeId?: string;
  saleId?: string;
}

export interface StoreCreditTransactionsResponse {
  transactions: StoreCreditTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BillToPay {
  id: string;
  title?: string;
  description?: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidAt?: string;
  barcode?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashClosure {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingBalance?: number;
  openingAmount?: number;
  closingBalance?: number;
  totalSales?: number;
  totalCash?: number;
  totalCard?: number;
  totalPix?: number;
  sellerId: string;
  seller?: User;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export type ReportType = 'sales' | 'products' | 'invoices' | 'inbound_invoices' | 'complete' | 'cancelled_sales' | 'sales_with_fiscal' | 'sales_without_fiscal' | 'time_clock';
export type ReportFormat = 'json' | 'xml' | 'excel';

export interface GenerateReportDto {
  reportType: ReportType;
  format: ReportFormat;
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  includeDocuments?: boolean;
}

// Enum para filtros de período
export enum ReportHistoryPeriodFilter {
  THIS_MONTH = 'THIS_MONTH',
  LAST_3_MONTHS = 'LAST_3_MONTHS',
  LAST_6_MONTHS = 'LAST_6_MONTHS',
  LAST_YEAR = 'LAST_YEAR',
}

// Interface atualizada de histórico
export interface ReportHistory {
  id: string;
  reportType: ReportType;
  format: ReportFormat;
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  sellerName?: string;
  includeDocuments: boolean;
  filename: string;
  fileSize: number;
  generatedAt: string;
}

// Response com paginação
export interface ReportHistoryResponse {
  data: ReportHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}


export interface DashboardMetrics {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockProducts: number;
  upcomingBills: number;
  salesByPeriod: {
    date: string;
    total: number;
  }[];
  topProducts: {
    product: Product;
    quantity: number;
    revenue: number;
  }[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginDto {
  login: string;
  password: string;
}

export interface CreateProductDto {
  id?: string;
  name: string;
  barcode: string;
  price: number;
  stockQuantity: number;
  category?: string;
  description?: string;
  photos?: string[];
  expirationDate?: string;
  unitOfMeasure?: 'kg' | 'g' | 'ml' | 'l' | 'm' | 'cm' | 'un';
  ncm?: string;
  cfop?: string;
  costPrice?: number;
  minStockQuantity?: number;
  lowStockAlertThreshold?: number;
}

export interface InstallmentData {
  installments: number;
  installmentValue: number;
  firstDueDate: Date;
  description?: string;
}

export interface CreateSaleDto {
  items: {
    productId: string;
    quantity: number;
  }[];
  paymentMethods: {
    method: PaymentMethod;
    amount: number;
    additionalInfo?: string;
    // Grupo Card (NT 2025.001) - Obrigatório para pagamentos com cartão
    cardIntegrationType?: string;
    acquirerCnpj?: string;
    cardBrand?: string;
    cardOperationType?: string;
    // Campos específicos para vendas a prazo
    customerId?: string;
    installments?: number;
    firstDueDate?: string;
    description?: string;
  }[];
  clientName?: string;
  clientCpfCnpj?: string;
  sellerId?: string;
  discount?: number; // Valor do desconto aplicado na venda
  /** Usado quando emitOnlyNfe está ativo: emitir boleto para esta venda */
  emitBoleto?: boolean;
  /** Data de vencimento preferencial do boleto (ISO date). Obrigatório se emitBoleto = true. */
  boletoDueDate?: string;
  /** ID do cliente cadastrado para o boleto. Obrigatório se emitBoleto = true. */
  boletoCustomerId?: string;
  /** Se true, gera NFC-e mock sem enviar à SEFAZ */
  forceMockNfce?: boolean;
  /** Se true, força cupom não fiscal */
  forceNonFiscal?: boolean;
}

export interface CreateCustomerDto {
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  street?: string;
  number?: string;
  complement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface CreateSellerDto {
  login: string;
  password: string;
  name: string;
  cpf?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  commissionRate?: number;
  hasIndividualCash?: boolean;
  nfeEmissionEnabled?: boolean;
}

export interface UpdateSellerDto {
  login?: string;
  name?: string;
  cpf?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  commissionRate?: number;
  hasIndividualCash?: boolean;
  nfeEmissionEnabled?: boolean;
  activityId?: string;
}

export interface UpdateSellerProfileDto {
  name?: string;
  cpf?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
}

export type BillRecurrenceType = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface CreateBillDto {
  title: string;
  amount: number;
  dueDate: string;
  barcode?: string;
  paymentInfo?: string;
  recurrenceType?: BillRecurrenceType;
  recurrenceEndDate?: string;
}

export interface BillRecurrence {
  id: string;
  companyId: string;
  title: string;
  barcode?: string | null;
  paymentInfo?: string | null;
  amount: number;
  recurrenceType: BillRecurrenceType;
  endDate?: string | null;
  nextDueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyDto {
  name: string;
  fantasyName?: string;
  login: string;
  password?: string;
  cnpj: string;
  email: string;
  phone?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  plan?: PlanType;
  logoUrl?: string;
  brandColor?: string;
  zipCode?: string;
  state?: string;
  city?: string;
  district?: string;
  street?: string;
  number?: string;
  complement?: string;
  beneficiaryName?: string;
  beneficiaryCpfCnpj?: string;
  bankCode?: string;
  bankName?: string;
  agency?: string;
  accountNumber?: string;
  accountType?: 'corrente' | 'poupança' | 'pagamento';
  maxProducts?: number | null;
  maxCustomers?: number | null;
  maxSellers?: number | null;
  photoUploadEnabled?: boolean;
  maxPhotosPerProduct?: number | null;
  nfceEmissionEnabled?: boolean;
  nfeEmissionEnabled?: boolean;
  catalogPageAllowed?: boolean;
  autoMessageAllowed?: boolean;
  boletoAllowed?: boolean;
}

export interface CreateAdminDto {
  login: string;
  password: string;
  name: string;
  email: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  discount: number;
}

// ===========================
// Time Clock (Ponto Eletrônico)
// ===========================

export type TimeClockType = 'ENTRY' | 'LUNCH_OUT' | 'LUNCH_IN' | 'EXIT';
export type TimeClockStatus =
  | 'VALID'
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'ADJUSTED';

export interface TimeClock {
  id: string;
  companyId: string;
  sellerId: string;
  type: TimeClockType;
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  distanceMeters?: number | null;
  withinRadius?: boolean | null;
  status: TimeClockStatus;
  notes?: string | null;
  seller?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface TimeClockConfig {
  id: string;
  companyId: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  qrToken: string;
  requireQrCode: boolean;
  requireLocation: boolean;
  notifyOnEntryTime?: string | null;
  notifyOnLunchOutTime?: string | null;
  notifyOnLunchInTime?: string | null;
  notifyOnExitTime?: string | null;
  notificationsEnabled: boolean;
  lateToleranceMinutes: number;
}

export interface TimeClockDaySummary {
  date: string;
  punches: Array<{ type: TimeClockType; timestamp: string }>;
  workedMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  completed: boolean;
  status: 'NORMAL' | 'INCOMPLETE' | 'MISSED' | 'OFF';
}

export interface TimeClockTodayResponse {
  date: string;
  punches: TimeClock[];
  nextExpected: TimeClockType | null;
  daySummary: TimeClockDaySummary | null;
  config: TimeClockConfig;
}

export interface TimeClockStats {
  month: string;
  totalDays?: number;
  workedDays?: number;
  missedDays?: number;
  completedDays?: number;
  incompleteDays?: number;
  totalWorkedMinutes: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  averageDailyMinutes?: number;
}

export interface RegisterTimeClockDto {
  type?: TimeClockType;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  qrToken?: string;
  deviceInfo?: Record<string, any>;
  notes?: string;
}

export interface UpdateTimeClockConfigDto {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  requireQrCode?: boolean;
  requireLocation?: boolean;
  notifyOnEntryTime?: string | null;
  notifyOnLunchOutTime?: string | null;
  notifyOnLunchInTime?: string | null;
  notifyOnExitTime?: string | null;
  notificationsEnabled?: boolean;
  lateToleranceMinutes?: number;
}

export interface AdjustTimeClockDto {
  type?: TimeClockType;
  timestamp?: string;
  latitude?: number;
  longitude?: number;
  reason: string;
}

export interface RejectTimeClockDto {
  reason: string;
}

export interface TimeClockFilterDto {
  sellerId?: string;
  startDate?: string;
  endDate?: string;
  type?: TimeClockType;
  status?: TimeClockStatus;
  page?: number;
  limit?: number;
  companyId?: string;
}

// ============================================================
// Per-seller schedule (jornada individual com fallback para a empresa)
// ============================================================

export interface SellerDayConfig {
  entryTime?: string | null;
  lunchOutTime?: string | null;
  lunchInTime?: string | null;
  exitTime?: string | null;
}

export interface SellerSchedule {
  id: string;
  sellerId: string;
  workDays: number[]; // 0=Dom .. 6=Sáb
  defaultEntryTime?: string | null;
  defaultLunchOutTime?: string | null;
  defaultLunchInTime?: string | null;
  defaultExitTime?: string | null;
  lateToleranceMinutes?: number | null;
  entryToleranceMinutes?: number | null;
  /** Chaves são strings '0'..'6' (dayOfWeek). */
  overrides: Record<string, SellerDayConfig>;
  createdAt: string;
  updatedAt: string;
}

export interface TodaySchedule {
  entry: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  exit: string | null;
  isWorkDay: boolean;
  source: 'seller' | 'company';
}

export interface MyScheduleResponse {
  sellerSchedule: SellerSchedule | null;
  today: TodaySchedule;
}

export interface UpdateSellerScheduleDto {
  workDays: number[];
  defaultEntryTime?: string | null;
  defaultLunchOutTime?: string | null;
  defaultLunchInTime?: string | null;
  defaultExitTime?: string | null;
  lateToleranceMinutes?: number | null;
  entryToleranceMinutes?: number | null;
  overrides: Record<string, SellerDayConfig>;
}

