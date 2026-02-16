import {
  UserCheck,
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import {
  FeatureCard,
  StepItem,
  TipItem,
  TroubleshootItem,
  type PageHelpTab,
} from '../page-help-modal';

const STAGGER = 50;

export const sellersHelpTitle = 'Central de Ajuda - Vendedores';
export const sellersHelpDescription =
  'Cadastre vendedores, vincule à empresa e acompanhe comissões e desempenho.';

export const sellersHelpIcon = (
  <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
);

export function getSellersHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Bem-vindo à Gestão de Vendedores</CardTitle>
                  <CardDescription>
                    Cadastre vendedores da empresa, acompanhe vendas e comissões.
                  </CardDescription>
                </div>
                <UserCheck className="h-12 w-12 text-blue-500 animate-pulse" />
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Plus className="h-5 w-5 text-green-500" />} title="Novo vendedor" description="Cadastre vendedores vinculados à empresa. Eles terão acesso ao sistema com perfil vendedor (PDV, clientes, parcelas)." badge="Cadastro" delay={0 * STAGGER} />
            <FeatureCard icon={<Search className="h-5 w-5 text-blue-500" />} title="Busca" description="Pesquise vendedores por nome no campo de busca." delay={1 * STAGGER} />
            <FeatureCard icon={<DollarSign className="h-5 w-5 text-green-500" />} title="Comissões" description="Configure e visualize comissões por vendedor. As vendas ficam vinculadas ao vendedor que realizou." badge="Comissão" delay={2 * STAGGER} />
            <FeatureCard icon={<TrendingUp className="h-5 w-5 text-purple-500" />} title="Desempenho" description="No Histórico de Vendas e Relatórios você pode filtrar por vendedor para analisar desempenho." delay={3 * STAGGER} />
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
            <CardHeader>
              <CardTitle>Cadastrar um vendedor</CardTitle>
              <CardDescription>
                Apenas empresa e admin podem cadastrar vendedores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Clique em Novo Vendedor no topo da página." />
              <StepItem number={2} text="Preencha nome, e-mail/login e senha. O vendedor será vinculado à sua empresa." />
              <StepItem number={3} text="Salve. O vendedor poderá acessar o sistema e suas vendas serão associadas a ele." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ver detalhes e comissões</CardTitle>
              <CardDescription>
                Clique em um vendedor para ver detalhes e totais de vendas/comissões.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Na tabela, clique na linha do vendedor ou no botão de detalhes." />
              <StepItem number={2} text="Visualize vendas realizadas e comissões configuradas." />
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Boas práticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <TipItem icon={<UserCheck className="h-4 w-4 text-blue-500" />} text="Cada vendedor deve ter seu próprio login para que as vendas fiquem corretamente vinculadas." />
                <TipItem icon={<DollarSign className="h-4 w-4 text-green-500" />} text="Configure as comissões no cadastro ou na área de detalhes do vendedor para relatórios precisos." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="Vendedores não podem cadastrar produtos ou acessar configurações da empresa; apenas PDV, clientes e parcelas." />
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Problemas comuns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TroubleshootItem problem="Vendedor não consegue logar" solution="Confirme que o usuário foi criado como vendedor e que o e-mail/login e senha estão corretos. Verifique se a empresa está ativa." />
                <TroubleshootItem problem="Vendas não aparecem para o vendedor" solution="As vendas são vinculadas ao usuário logado no momento do checkout. Certifique-se de que o vendedor está logado na sua conta ao finalizar a venda." />
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
