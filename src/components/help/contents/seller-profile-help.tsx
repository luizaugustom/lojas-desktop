import { User, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const sellerProfileHelpTitle = 'Central de Ajuda - Perfil do Vendedor';
export const sellerProfileHelpDescription = 'Altere seus dados pessoais e senha. Acesso apenas ao próprio perfil.';
export const sellerProfileHelpIcon = <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getSellerProfileHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Perfil do Vendedor</CardTitle>
              <CardDescription>Página de perfil do usuário com perfil vendedor. Altere nome, telefone e senha.</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<User className="h-5 w-5 text-green-500" />} title="Dados pessoais" description="Altere nome, e-mail e telefone do seu usuário." delay={0 * STAGGER} />
            <FeatureCard icon={<Lock className="h-5 w-5 text-blue-500" />} title="Alterar senha" description="Altere sua senha de acesso. Use uma senha forte e não compartilhe." delay={1 * STAGGER} />
            <FeatureCard icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} title="Acesso limitado" description="Vendedores têm acesso apenas ao próprio perfil; não acessam configurações da empresa." badge="Vendedor" delay={2 * STAGGER} />
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
            <CardHeader><CardTitle>Alterar dados ou senha</CardTitle><CardDescription>Edite os campos e salve.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Altere nome, e-mail ou telefone nos campos exibidos e clique em Salvar." />
              <StepItem number={2} text="Para alterar senha: preencha a senha atual e a nova senha (com confirmação). Salve." />
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
                <TipItem icon={<Lock className="h-4 w-4 text-blue-500" />} text="Use uma senha forte e troque-a periodicamente." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="Configurações da empresa (fiscal, logo, etc.) são acessadas apenas por usuários com perfil empresa ou admin." />
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
