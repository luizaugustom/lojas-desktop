import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Calendar,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
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

export const dashboardHelpTitle = 'Central de Ajuda - Dashboard';
export const dashboardHelpDescription =
  'Visão geral das métricas, gráficos e período de dados da sua empresa.';

export const dashboardHelpIcon = (
  <LayoutDashboard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
);

export function getDashboardHelpTabs(): PageHelpTab[] {
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
                  <CardTitle className="text-xl">Bem-vindo ao Dashboard</CardTitle>
                  <CardDescription>
                    Métricas, gráficos e indicadores conforme o período selecionado no sistema.
                  </CardDescription>
                </div>
                <LayoutDashboard className="h-12 w-12 text-blue-500 animate-pulse" />
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard
              icon={<DollarSign className="h-5 w-5 text-green-500" />}
              title="Vendas no período"
              description="Total de vendas e quantidade de vendas no intervalo de datas selecionado (filtro global)."
              badge="Principal"
              delay={0 * STAGGER}
            />
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
              title="Comparativo com mês anterior"
              description="Percentual de variação em relação ao mês anterior para vendas e outros indicadores."
              delay={1 * STAGGER}
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5 text-purple-500" />}
              title="Gráfico dos últimos 7 dias"
              description="Visualização diária do faturamento e número de vendas nos últimos sete dias."
              delay={2 * STAGGER}
            />
            <FeatureCard
              icon={<Package className="h-5 w-5 text-amber-500" />}
              title="Produtos e clientes"
              description="Quantidade de produtos cadastrados e de clientes da empresa."
              delay={3 * STAGGER}
            />
            <FeatureCard
              icon={<Users className="h-5 w-5 text-teal-500" />}
              title="Clientes em débito"
              description="Alerta de clientes com parcelas em atraso (mais de 30 dias), quando aplicável."
              delay={4 * STAGGER}
            />
            <FeatureCard
              icon={<Calendar className="h-5 w-5 text-indigo-500" />}
              title="Período global"
              description="O seletor de período no topo da aplicação define o intervalo usado no dashboard e em outras telas."
              badge="Filtro global"
              delay={5 * STAGGER}
            />
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
              <CardTitle>Alterar o período</CardTitle>
              <CardDescription>
                O período exibido no dashboard é controlado pelo filtro de datas no header da aplicação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Clique no seletor de datas no topo da tela (ao lado do logo ou no header)." />
              <StepItem number={2} text="Escolha um intervalo (ex.: último mês, últimos 15 dias, este ano)." />
              <StepItem number={3} text="As métricas e gráficos do dashboard serão atualizados automaticamente." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entender os cards</CardTitle>
              <CardDescription>
                Cada card mostra um indicador; quando há comparação com o mês anterior, a seta indica tendência de alta ou baixa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                O gráfico de barras exibe o total de vendas e a quantidade de vendas por dia nos últimos 7 dias, independente do período global.
              </p>
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
                <TipItem
                  icon={<Calendar className="h-4 w-4 text-blue-500" />}
                  text="Use o mesmo período em Relatórios para manter consistência nas análises."
                />
                <TipItem
                  icon={<TrendingUp className="h-4 w-4 text-green-500" />}
                  text="Acompanhe a variação percentual vs. mês anterior para identificar tendências."
                />
                <TipItem
                  icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  text="Fique atento ao card de clientes em débito para cobrança de parcelas atrasadas."
                />
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
                <TroubleshootItem
                  problem="Dashboard vazio ou zerado"
                  solution="Verifique se há vendas no período selecionado e se o filtro de datas está correto."
                />
                <TroubleshootItem
                  problem="Gráfico não aparece"
                  solution="É necessário ter pelo menos um dia com dados nos últimos 7 dias para o gráfico ser exibido."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
