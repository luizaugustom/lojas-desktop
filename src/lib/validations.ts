import * as z from 'zod';

export const loginSchema = z.object({
  login: z.string().min(1, 'Login não pode ser vazio'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  barcode: z.string().min(8, 'Código de barras inválido').max(20),
  price: z.number().positive('Preço deve ser positivo'),
  costPrice: z.number().positive('Preço de custo deve ser positivo').optional(),
  stockQuantity: z.number().min(0, 'Quantidade não pode ser negativa'),
  minStockQuantity: z.number().min(0, 'Quantidade mínima não pode ser negativa').optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  expirationDate: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  unitOfMeasure: z.enum(['kg', 'g', 'ml', 'l', 'm', 'cm', 'un']).optional(),
  ncm: z.string()
    .regex(/^\d{8}$/, 'NCM deve conter exatamente 8 dígitos numéricos')
    .optional()
    .or(z.literal('')),
  cfop: z.string()
    .regex(/^\d{4}$/, 'CFOP deve conter exatamente 4 dígitos numéricos')
    .optional()
    .or(z.literal('')),
});

export const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  barcode: z.string().min(8, 'Código de barras inválido').max(20),
  price: z.number().positive('Preço deve ser positivo'),
  costPrice: z.number().positive('Preço de custo deve ser positivo').optional(),
  stockQuantity: z.number().min(0, 'Quantidade não pode ser negativa'),
  minStockQuantity: z.number().min(0, 'Quantidade mínima não pode ser negativa').optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  expirationDate: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  unitOfMeasure: z.enum(['kg', 'g', 'ml', 'l', 'm', 'cm', 'un']).optional(),
  ncm: z.string()
    .regex(/^\d{8}$/, 'NCM deve conter exatamente 8 dígitos numéricos')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),
  cfop: z.string()
    .regex(/^\d{4}$/, 'CFOP deve conter exatamente 4 dígitos numéricos')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),
  activityId: z.any().optional(),
  companyId: z.any().optional(),
});

export const saleItemSchema = z.object({
  productId: z.string().min(1, 'ID do produto é obrigatório'),
  quantity: z.number().positive('Quantidade deve ser positiva'),
});

export const paymentMethodDetailSchema = z.object({
  method: z.enum(['cash', 'credit_card', 'debit_card', 'pix', 'installment']),
  amount: z.number().positive('Valor deve ser positivo'),
});

export const installmentDataSchema = z.object({
  installments: z.number().min(1, 'Mínimo 1 parcela').max(24, 'Máximo 24 parcelas'),
  installmentValue: z.number().positive('Valor da parcela deve ser positivo'),
  firstDueDate: z.date({ required_error: 'Data do primeiro vencimento é obrigatória' }),
  description: z.string().optional(),
});

export const paymentMethodSchema = z.object({
  method: z.enum(['cash', 'credit_card', 'debit_card', 'pix', 'installment']),
  amount: z.number().positive('Valor deve ser positivo'),
  additionalInfo: z.string().optional(),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'Adicione pelo menos um produto'),
  paymentMethods: z.array(paymentMethodSchema).min(1, 'Selecione pelo menos uma forma de pagamento'),
  clientName: z.string().optional(),
  clientCpfCnpj: z.string().optional(),
  sellerId: z.string().optional(),
});

export const customerAddressSchema = z.object({
  street: z.string().min(2, 'Rua deve ter no mínimo 2 caracteres'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro deve ter no mínimo 2 caracteres'),
  city: z.string().min(2, 'Cidade deve ter no mínimo 2 caracteres'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  email: z.string()
    .optional()
    .refine((val) => !val || val === '' || z.string().email().safeParse(val).success, {
      message: 'Email deve ter um formato válido'
    }),
  phone: z.string()
    .optional()
    .refine((val) => !val || val === '' || /^\(\d{2}\) \d{4,5}-\d{4}$/.test(val), {
      message: 'Telefone deve estar no formato (XX) XXXXX-XXXX'
    }),
  cpfCnpj: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string()
    .optional()
    .refine((val) => !val || val === '' || /^\d{5}-?\d{3}$/.test(val), {
      message: 'CEP deve estar no formato XXXXX-XXX'
    }),
});

export const billSchema = z.object({
  title: z.string().min(2, 'Título deve ter no mínimo 2 caracteres'),
  amount: z.number().positive('Valor deve ser positivo'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  barcode: z.string().optional(),
  paymentInfo: z.string().optional(),
});

export const openCashClosureSchema = z.object({
  openingBalance: z.number().min(0, 'Saldo inicial não pode ser negativo'),
});

export const closeCashClosureSchema = z.object({
  closingBalance: z.number().min(0, 'Saldo final não pode ser negativo'),
});

// Seller Schemas
export const createSellerSchema = z.object({
  login: z.string().email('Login deve ser um email válido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  cpf: z.string()
    .refine((val) => val === '' || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val), {
      message: 'CPF deve estar no formato XXX.XXX.XXX-XX'
    })
    .optional(),
  birthDate: z.string()
    .refine((val) => {
      if (val === '') return true;
      try {
        const date = new Date(val);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    }, {
      message: 'Data de nascimento deve ser uma data válida'
    })
    .optional(),
  email: z.string()
    .refine((val) => val === '' || z.string().email().safeParse(val).success, {
      message: 'Email deve ser um email válido'
    })
    .optional(),
  phone: z.string()
    .refine((val) => val === '' || /^\(\d{2}\) \d{4,5}-\d{4}$/.test(val), {
      message: 'Telefone deve estar no formato (XX) XXXXX-XXXX'
    })
    .optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  hasIndividualCash: z.boolean().optional(),
});

export const updateSellerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255).optional(),
  cpf: z.string()
    .refine((val) => val === '' || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val), {
      message: 'CPF deve estar no formato XXX.XXX.XXX-XX'
    })
    .optional(),
  birthDate: z.string()
    .refine((val) => {
      if (val === '') return true;
      try {
        const date = new Date(val);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    }, {
      message: 'Data de nascimento deve ser uma data válida'
    })
    .optional(),
  email: z.string()
    .refine((val) => val === '' || z.string().email().safeParse(val).success, {
      message: 'Email deve ser um email válido'
    })
    .optional(),
  phone: z.string()
    .refine((val) => val === '' || /^\(\d{2}\) \d{4,5}-\d{4}$/.test(val), {
      message: 'Telefone deve estar no formato (XX) XXXXX-XXXX'
    })
    .optional(),
  password: z.string()
    .refine((val) => val === '' || val.length >= 6, {
      message: 'Senha deve ter no mínimo 6 caracteres'
    })
    .optional(),
  confirmPassword: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  hasIndividualCash: z.boolean().optional(),
}).refine((data) => {
  if (data.password && data.password !== '') {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

// Report Schemas
export const reportSchema = z
  .object({
    reportType: z.enum(['sales', 'products', 'invoices', 'complete']),
    format: z.enum(['json', 'xml', 'excel']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sellerId: z.string().optional(),
    includeDocuments: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Data final deve ser maior que data inicial',
      path: ['endDate'],
    }
  );

export const installmentSaleSchema = z.object({
  description: z.string().optional(),
});

export const updateSellerProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255).optional(),
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato XXX.XXX.XXX-XX')
    .optional()
    .or(z.literal('')),
  birthDate: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string()
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone deve estar no formato (XX) XXXXX-XXXX')
    .optional()
    .or(z.literal('')),
});

