import { Settings, User, Building2, FileText, Bell, Image as ImageIcon, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const settingsHelpTitle = 'Central de Ajuda - Configurações';
export const settingsHelpDescription = 'Perfil do usuário, dados da empresa, configuração fiscal, logo, cor da marca e notificações.';
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
              <CardDescription>Perfil, empresa, fiscal, notificações e aparência. Dados obrigatórios para emissão de notas e funcionamento do sistema.</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<User className="h-5 w-5 text-green-500" />} title="Perfil" description="Altere nome, e-mail, telefone e senha do usuário logado." delay={0 * STAGGER} />
            <FeatureCard icon={<Building2 className="h-5 w-5 text-blue-500" />} title="Empresa" description="Nome, CNPJ, endereço, logo e cor da marca. Usado no cabeçalho e impressões." delay={1 * STAGGER} />
            <FeatureCard icon={<FileText className="h-5 w-5 text-purple-500" />} title="Dados fiscais" description="IE, Código IBGE, CEP, API Key Focus NFe. Obrigatório para emissão de NF-e/NFC-e." badge="Fiscal" delay={2 * STAGGER} />
            <FeatureCard icon={<ImageIcon className="h-5 w-5 text-amber-500" />} title="Logo e cor" description="Logo da empresa e cor principal (marca). Afetam o header e o PDV." delay={3 * STAGGER} />
            <FeatureCard icon={<Bell className="h-5 w-5 text-teal-500" />} title="Notificações" description="Configurações de notificações e avisos do sistema." delay={4 * STAGGER} />
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
              <StepItem number={1} text="Na aba Perfil, edite nome, e-mail, telefone. Para alterar senha, use o campo de senha e confirme." />
              <StepItem number={2} text="Salve. As alterações valem na próxima sessão (exceto senha, que vale na próxima troca)." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Configurar empresa e fiscal</CardTitle><CardDescription>Necessário para emissão de notas.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Preencha todos os dados fiscais: CNPJ, IE, Código IBGE, CEP, API Key Focus NFe." emphasis="Sem isso, a emissão de NF-e/NFC-e pode falhar." />
              <StepItem number={2} text="Salve. A logo e a cor da marca podem ser alteradas na mesma seção ou em Empresa." />
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
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="A API Key Focus NFe é fornecida pelo provedor de emissão; não compartilhe com terceiros." />
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Problemas comuns</CardTitle></CardHeader>
            <CardContent>
              <TroubleshootItem problem="Erro ao emitir nota: dados fiscais incompletos" solution="Volte em Configurações e preencha CNPJ, IE, Código IBGE, CEP e API Key Focus NFe." />
              <TroubleshootItem problem="Logo não aparece" solution="Confirme que o arquivo foi enviado e que o formato é suportado (ex.: PNG, JPG). Tamanho recomendado para evitar lentidão." />
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
