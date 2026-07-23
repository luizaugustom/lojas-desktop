import {
  Settings,
  User,
  Building2,
  FileText,
  FileBadge,
  BookOpen,
  MessageSquare,
  CreditCard,
  Landmark,
  Percent,
  Bell,
  ShieldCheck,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const settingsHelpTitle = 'Central de Ajuda - Configurações';
export const settingsHelpDescription =
  'Perfil, empresa, WhatsApp (Evolution), dados fiscais, certificado digital, catálogo, mensagens automáticas, parcelamento, boletos, taxas de cartão, notificações e administração.';
export const settingsHelpIcon = <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getSettingsHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Configurações</CardTitle>
              <CardDescription>
                Perfis, empresa, fiscal, certificado, catálogo, mensagens automáticas, WhatsApp,
                parcelamento, boletos, taxas de cartão, notificações e administração. Dados
                obrigatórios para emissão de notas e funcionamento do sistema.
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<User className="h-5 w-5 text-green-500" />} title="Perfil" description="Altere nome, e-mail, telefone e senha do usuário logado." delay={0 * STAGGER} />
            <FeatureCard icon={<Building2 className="h-5 w-5 text-blue-500" />} title="Empresa" description="Nome, CNPJ, endereço, logo, cor e apelido. Usado no cabeçalho e impressões." delay={1 * STAGGER} />
            <FeatureCard icon={<FileText className="h-5 w-5 text-purple-500" />} title="Dados fiscais" description="Regime tributário, IE, código IBGE, CSC, séries e alíquotas IBS/CBS. Obrigatório para NF-e/NFC-e." badge="Fiscal" delay={2 * STAGGER} />
            <FeatureCard icon={<FileBadge className="h-5 w-5 text-indigo-500" />} title="Certificado Digital" description="Upload do .pfx/.p12 e senha do certificado A1 para comunicação com a SEFAZ." badge="Fiscal" delay={3 * STAGGER} />
            <FeatureCard icon={<BookOpen className="h-5 w-5 text-orange-500" />} title="Catálogo" description="Página pública para exibir produtos. Disponível no plano PRO." badge="Pro" delay={4 * STAGGER} />
            <FeatureCard icon={<MessageSquare className="h-5 w-5 text-emerald-500" />} title="Mensagens Automáticas" description="Cobrança automática de parcelas vencidas via WhatsApp. Requer PRO/Trial." badge="Pro" delay={5 * STAGGER} />
            <FeatureCard icon={<MessageSquare className="h-5 w-5 text-green-600" />} title="WhatsApp" description="Conexão e status da instância Evolution API para a empresa." delay={6 * STAGGER} />
            <FeatureCard icon={<CreditCard className="h-5 w-5 text-cyan-500" />} title="Parcelamento" description="Limite máximo de parcelas e tabela de juros por faixa." delay={7 * STAGGER} />
            <FeatureCard icon={<Landmark className="h-5 w-5 text-teal-500" />} title="Boletos" description="Ativar emissão de boletos via Unimake e-Boleto." delay={8 * STAGGER} />
            <FeatureCard icon={<Percent className="h-5 w-5 text-pink-500" />} title="Taxas de Cartão" description="Taxas por adquirente (débito, crédito à vista e parcelado)." delay={9 * STAGGER} />
            <FeatureCard icon={<Bell className="h-5 w-5 text-amber-500" />} title="Notificações" description="Preferências de alertas e canais (email, in-app, desktop)." delay={10 * STAGGER} />
            <FeatureCard icon={<ShieldCheck className="h-5 w-5 text-red-500" />} title="Administração" description="Admin: token IBPT global. Gestor: senha de login e token Focus das empresas." badge="Admin/Gestor" delay={11 * STAGGER} />
          </div>
        </div>
      ),
    },
    {
      value: 'howto',
      label: 'Como usar',
      content: (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Alterar perfil</CardTitle><CardDescription>Dados do usuário logado.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Na aba Empresa → Perfil, edite nome, e-mail, telefone. Para alterar senha, preencha senha atual e a nova senha." />
              <StepItem number={2} text="Salve. A nova senha passa a valer na próxima troca de login." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Configurar empresa e fiscal</CardTitle><CardDescription>Necessário para emissão de notas.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Preencha todos os dados fiscais: regime, IE, código IBGE, CSC, séries e alíquotas." />
              <StepItem number={2} text="Vá em Certificado Digital, defina a senha e faça upload do .pfx ou .p12." emphasis="Sem isso, a emissão de NF-e/NFC-e pode falhar." />
              <StepItem number={3} text="Salve. Logo, cor e apelido ficam em Empresa." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Catálogo, Mensagens e WhatsApp</CardTitle><CardDescription>Página pública e cobrança automática.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Defina a URL pública em Catálogo (URL em minúsculas, números, hífen e underscore)." />
              <StepItem number={2} text="No card WhatsApp (Evolution), toque em Conectar e escaneie o QR no aplicativo." />
              <StepItem number={3} text="Com WhatsApp conectado, ative Mensagens Automáticas (apenas PRO/Trial)." emphasis="As mensagens saem do número conectado, não de um número global." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Parcelamento, Boletos e Taxas de Cartão</CardTitle><CardDescription>Configurações financeiras.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Configure Parcelamento: limite máximo (0–24) e taxa de juros por faixa." />
              <StepItem number={2} text="Ative Boletos se a empresa estiver autorizada; tokens Unimake ficam no Admin." />
              <StepItem number={3} text="Cadastre Taxas de Cartão por credenciadora (débito, crédito à vista e parcelado)." />
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      value: 'tips',
      label: 'Dicas',
      content: (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" />Boas práticas</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <TipItem icon={<FileText className="h-4 w-4 text-blue-500" />} text="Mantenha dados fiscais sempre atualizados; alterações legais podem exigir atualização." />
                <TipItem icon={<ImageIcon className="h-4 w-4 text-green-500" />} text="Use uma logo em boa resolução e uma cor que contraste com o texto para melhor leitura." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="O certificado A1 e a senha são credenciais sensíveis; não compartilhe com terceiros." />
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Problemas comuns</CardTitle></CardHeader>
            <CardContent>
              <TroubleshootItem problem="Erro ao emitir nota: dados fiscais incompletos" solution="Volte em Configurações → Dados Fiscais e preencha regime, IE, código IBGE, CSC, séries e alíquotas; configure senha e certificado em Certificado Digital." />
              <TroubleshootItem problem="Logo não aparece" solution="Confirme que o arquivo foi enviado (PNG/JPG até 5MB) e que a marca está aplicada via Empresa → Logo e Cor." />
              <TroubleshootItem problem="Mensagens automáticas não enviam" solution="Verifique se o WhatsApp está conectado e se o plano é PRO/Trial (com autorização). Veja o card Mensagens Automáticas." />
              <TroubleshootItem problem="Catálogo indisponível" solution="Recurso exclusivo do plano PRO. Faça upgrade ou peça liberação ao admin." />
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
