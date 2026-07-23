import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  Building2,
  CreditCard,
  FileBadge,
  FileText,
  Landmark,
  MessageSquare,
  Percent,
  ShieldCheck,
} from 'lucide-react';

export type SettingsCategoryId =
  | 'empresa'
  | 'dados-fiscais'
  | 'certificado-digital'
  | 'catalogo'
  | 'mensagens-automaticas'
  | 'whatsapp'
  | 'parcelamento'
  | 'boletos'
  | 'taxas-cartao'
  | 'notificacoes'
  | 'administracao';

export type SettingsRole = 'empresa' | 'admin' | 'gestor' | 'vendedor';

export interface SettingsCompany {
  plan?: string | null;
  catalogPageAllowed?: boolean;
  autoMessageAllowed?: boolean;
  boletoAllowed?: boolean;
}

export interface SettingsCategory {
  id: SettingsCategoryId;
  slug: SettingsCategoryId;
  /** Rota de navegação interna (sem a barra inicial). */
  route: string;
  title: string;
  description: string;
  icon: LucideIcon;
  roles: readonly SettingsRole[];
}

export interface VisibleSettingsCategory extends SettingsCategory {
  locked: boolean;
  lockReason?: string;
}

const COMPANY_ONLY: readonly SettingsRole[] = ['empresa'];

const SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
  {
    id: 'empresa',
    slug: 'empresa',
    route: 'settings/empresa',
    title: 'Empresa',
    description: 'Perfil, identidade visual e dados da empresa.',
    icon: Building2,
    roles: ['empresa', 'admin', 'gestor'],
  },
  {
    id: 'dados-fiscais',
    slug: 'dados-fiscais',
    route: 'settings/dados-fiscais',
    title: 'Dados Fiscais',
    description: 'Regime tributário e parâmetros de emissão fiscal.',
    icon: FileText,
    roles: COMPANY_ONLY,
  },
  {
    id: 'certificado-digital',
    slug: 'certificado-digital',
    route: 'settings/certificado-digital',
    title: 'Certificado Digital',
    description: 'Certificado usado na comunicação com a SEFAZ.',
    icon: FileBadge,
    roles: COMPANY_ONLY,
  },
  {
    id: 'catalogo',
    slug: 'catalogo',
    route: 'settings/catalogo',
    title: 'Catálogo',
    description: 'Página pública e endereço do catálogo de produtos.',
    icon: BookOpen,
    roles: COMPANY_ONLY,
  },
  {
    id: 'mensagens-automaticas',
    slug: 'mensagens-automaticas',
    route: 'settings/mensagens-automaticas',
    title: 'Mensagens Automáticas',
    description: 'Envio automático de mensagens de cobrança.',
    icon: MessageSquare,
    roles: COMPANY_ONLY,
  },
  {
    id: 'whatsapp',
    slug: 'whatsapp',
    route: 'settings/whatsapp',
    title: 'WhatsApp',
    description: 'Conexão e status do WhatsApp da empresa.',
    icon: MessageSquare,
    roles: ['empresa', 'admin'],
  },
  {
    id: 'parcelamento',
    slug: 'parcelamento',
    route: 'settings/parcelamento',
    title: 'Parcelamento',
    description: 'Limites e taxas de juros por parcela.',
    icon: CreditCard,
    roles: COMPANY_ONLY,
  },
  {
    id: 'boletos',
    slug: 'boletos',
    route: 'settings/boletos',
    title: 'Boletos',
    description: 'Ativação da emissão de boletos bancários.',
    icon: Landmark,
    roles: COMPANY_ONLY,
  },
  {
    id: 'taxas-cartao',
    slug: 'taxas-cartao',
    route: 'settings/taxas-cartao',
    title: 'Taxas de Cartão',
    description: 'Taxas por adquirente e modalidade de pagamento.',
    icon: Percent,
    roles: COMPANY_ONLY,
  },
  {
    id: 'notificacoes',
    slug: 'notificacoes',
    route: 'settings/notificacoes',
    title: 'Notificações',
    description: 'Preferências de alertas e notificações do sistema.',
    icon: Bell,
    roles: ['empresa', 'admin', 'gestor'],
  },
  {
    id: 'administracao',
    slug: 'administracao',
    route: 'settings/administracao',
    title: 'Administração',
    description: 'Acesso, credenciais e configurações administrativas.',
    icon: ShieldCheck,
    roles: ['admin', 'gestor'],
  },
] as const;

const CATEGORY_BY_ID = new Map(
  SETTINGS_CATEGORIES.map((category) => [category.id, category]),
);

const CATEGORY_BY_SLUG = new Map(
  SETTINGS_CATEGORIES.map((category) => [category.slug, category]),
);

export const getAllSettingsCategories = (): readonly SettingsCategory[] =>
  SETTINGS_CATEGORIES;

const normalizedPlan = (company?: SettingsCompany): string | undefined => {
  if (!company?.plan || typeof company.plan !== 'string') return undefined;
  return company.plan.toUpperCase();
};

const getCompanyLockReason = (
  id: SettingsCategoryId,
  company?: SettingsCompany,
): string | undefined => {
  const plan = normalizedPlan(company);

  if (id === 'catalogo' && (plan !== 'PRO' || company?.catalogPageAllowed === false)) {
    return 'O catálogo está disponível apenas no plano PRO e para empresas autorizadas.';
  }

  if (
    id === 'mensagens-automaticas' &&
    (!['PRO', 'TRIAL_7_DAYS'].includes(plan ?? '') || company?.autoMessageAllowed === false)
  ) {
    return 'As mensagens automáticas exigem plano PRO ou teste grátis e autorização.';
  }

  if (id === 'boletos' && company?.boletoAllowed === false) {
    return 'A emissão de boletos não está disponível para esta empresa.';
  }

  return undefined;
};

export const getSettingsCategories = (
  role: SettingsRole,
  company?: SettingsCompany,
): VisibleSettingsCategory[] =>
  SETTINGS_CATEGORIES.filter((category) => category.roles.includes(role)).map((category) => {
    const lockReason = role === 'empresa' ? getCompanyLockReason(category.id, company) : undefined;

    return {
      ...category,
      locked: lockReason !== undefined,
      lockReason,
    };
  });

export const getSettingsCategory = (id: SettingsCategoryId): SettingsCategory => {
  const category = CATEGORY_BY_ID.get(id);

  if (!category) {
    throw new Error(`Unknown settings category: ${id}`);
  }

  return category;
};

export const getSettingsCategoryBySlug = (
  slug: string,
): SettingsCategory | undefined => CATEGORY_BY_SLUG.get(slug as SettingsCategoryId);

export const isUserRole = (value: unknown): value is SettingsRole =>
  value === 'empresa' ||
  value === 'admin' ||
  value === 'gestor' ||
  value === 'vendedor';

export interface CompanySnapshot {
  plan?: string | null;
  catalogPageAllowed?: boolean;
  autoMessageAllowed?: boolean;
  boletoAllowed?: boolean;
}

export const toCompanySnapshot = (company: unknown): CompanySnapshot | undefined => {
  if (!company || typeof company !== 'object') return undefined;
  const source = company as Record<string, unknown>;
  return {
    plan: typeof source.plan === 'string' ? source.plan : null,
    catalogPageAllowed:
      typeof source.catalogPageAllowed === 'boolean'
        ? source.catalogPageAllowed
        : undefined,
    autoMessageAllowed:
      typeof source.autoMessageAllowed === 'boolean'
        ? source.autoMessageAllowed
        : undefined,
    boletoAllowed:
      typeof source.boletoAllowed === 'boolean' ? source.boletoAllowed : undefined,
  };
};
