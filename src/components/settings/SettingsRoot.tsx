import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Settings as SettingsIcon } from 'lucide-react';
import {
  getAllSettingsCategories,
  getSettingsCategoryBySlug,
  type SettingsCategoryId,
} from './settings-categories';
import SettingsHub from './SettingsHub';
import SettingsShell from './SettingsShell';
import EmpresaSettings from './categories/empresa-settings';
import DadosFiscaisSettings from './categories/dados-fiscais-settings';
import CertificadoDigitalSettings from './categories/certificado-digital-settings';
import CatalogoSettings from './categories/catalogo-settings';
import MensagensAutomaticasSettings from './categories/mensagens-automaticas-settings';
import WhatsAppSettings from './categories/whatsapp-settings';
import ParcelamentoSettings from './categories/parcelamento-settings';
import BoletosSettings from './categories/boletos-settings';
import TaxasCartaoSettings from './categories/taxas-cartao-settings';
import NotificacoesSettings from './categories/notificacoes-settings';
import AdministracaoSettings from './categories/administracao-settings';

export interface SettingsRootProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

const isKnownSlug = (slug: string): slug is SettingsCategoryId =>
  getAllSettingsCategories().some((category) => category.slug === slug);

const extractSlug = (route: string): string | null => {
  const segments = route.split('/').filter(Boolean);
  if (segments[0] !== 'settings') return null;
  if (segments.length < 2) return null;
  return segments[1];
};

type CategoryComponentProps = {
  locked?: boolean;
  lockReason?: string;
  onNavigate?: (route: string) => void;
};

const CATEGORY_COMPONENTS: Record<
  SettingsCategoryId,
  React.ComponentType<CategoryComponentProps>
> = {
  empresa: EmpresaSettings,
  'dados-fiscais': DadosFiscaisSettings,
  'certificado-digital': CertificadoDigitalSettings,
  catalogo: CatalogoSettings,
  'mensagens-automaticas': MensagensAutomaticasSettings,
  whatsapp: WhatsAppSettings,
  parcelamento: ParcelamentoSettings,
  boletos: BoletosSettings,
  'taxas-cartao': TaxasCartaoSettings,
  notificacoes: NotificacoesSettings,
  administracao: AdministracaoSettings,
};

interface MigrationPlaceholderProps {
  slug: SettingsCategoryId;
  onBack: () => void;
}

function MigrationPlaceholder({ slug, onBack }: MigrationPlaceholderProps) {
  const category = getSettingsCategoryBySlug(slug);

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          {category ? (
            <category.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          ) : (
            <SettingsIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          )}
          <CardTitle>
            {category?.title ?? 'Configurações'} em migração
          </CardTitle>
        </div>
        <CardDescription>
          Conteúdo em migração. Veja a página antiga em Configurações.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar para Configurações
        </Button>
      </CardContent>
    </Card>
  );
}

export function SettingsRoot({ currentRoute, onNavigate }: SettingsRootProps) {
  const slug = extractSlug(currentRoute);

  // Hub: /settings → grade de cards
  if (slug === null) {
    return <SettingsHub onNavigate={onNavigate} />;
  }

  // Categoria desconhecida (não faz parte do registry) — delegamos para a página
  // monolítica legada para preservar compatibilidade.
  if (!isKnownSlug(slug)) {
    return null;
  }

  const Component = CATEGORY_COMPONENTS[slug];

  // Categoria conhecida: renderiza o shell com o componente extraído.
  // Se ainda houver slug sem componente (não esperado), preserva o fallback.
  if (!Component) {
    return (
      <SettingsShell currentRoute={currentRoute} onNavigate={onNavigate}>
        <MigrationPlaceholder slug={slug} onBack={() => onNavigate('settings')} />
      </SettingsShell>
    );
  }

  return (
    <SettingsShell currentRoute={currentRoute} onNavigate={onNavigate}>
      <Component onNavigate={onNavigate} />
    </SettingsShell>
  );
}

export default SettingsRoot;
