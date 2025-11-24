export type UserRole = 'admin' | 'empresa' | 'vendedor';

export type DataPeriodFilter =
  | 'ALL'
  | 'THIS_YEAR'
  | 'LAST_6_MONTHS'
  | 'LAST_3_MONTHS'
  | 'LAST_1_MONTH'
  | 'LAST_15_DAYS'
  | 'THIS_WEEK';

export enum PlanType {
  BASIC = 'BASIC',
  PLUS = 'PLUS',
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
  plan?: PlanType;
  dataPeriod?: DataPeriodFilter | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id: string;
  name: string;
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

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  costPrice?: number;
  stockQuantity: number;
  minStockQuantity?: number;
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
}

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'installment' | 'store_credit' | 'loss';

export interface PaymentMethodDetail {
  method: PaymentMethod;
  amount: number;
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

export type ReportType = 'sales' | 'products' | 'invoices' | 'complete';
export type ReportFormat = 'json' | 'xml' | 'excel';

export interface GenerateReportDto {
  reportType: ReportType;
  format: ReportFormat;
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  includeDocuments?: boolean;
}

export interface ReportHistory {
  id: string;
  type: ReportType;
  format: ReportFormat;
  date: string;
  size: number;
  filename: string;
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
  }[];
  clientName?: string;
  clientCpfCnpj?: string;
  sellerId?: string;
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
}

export interface UpdateSellerDto {
  name?: string;
  cpf?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  commissionRate?: number;
  hasIndividualCash?: boolean;
  activityId?: string;
}

export interface UpdateSellerProfileDto {
  name?: string;
  cpf?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
}

export interface CreateBillDto {
  title: string;
  amount: number;
  dueDate: string;
  barcode?: string;
  paymentInfo?: string;
}

export interface CreateCompanyDto {
  name: string;
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

