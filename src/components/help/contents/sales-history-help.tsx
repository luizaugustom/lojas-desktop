import {
  ClipboardList,
  Calendar,
  Download,
  Eye,
  Filter,
  XCircle,
  Printer,
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

export const salesHistoryHelpTitle = 'Central de Ajuda - Histórico de Vendas';
export const salesHistoryHelpDescription =
  'Consulte vendas realizadas, filtre por período, veja detalhes, cancele vendas e exporte para Excel.';

export const salesHistoryHelpIcon = (
  <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
);

export function getSalesHistoryHelpTabs(): PageHelpTab[] {
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
                  <CardTitle className="text-xl">Bem-vindo ao Histórico de Vendas</CardTitle>
                  <CardDescription>
                    Todas as vendas finalizadas aparecem aqui. Filtre por período, veja detalhes e exporte.
                  </CardDescription>
                </div>
                <ClipboardList className="h-12 w-12 text-blue-500 animate-pulse" />
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Calendar className="h-5 w-5 text-green-500" />} title="Filtro por período" description="Escolha o intervalo de datas: hoje, esta semana, último mês, últimos 3/6 meses, este ano ou todos." badge="Filtro" delay={0 * STAGGER} />
            <FeatureCard icon={<Eye className="h-5 w-5 text-blue-500" />} title="Detalhes da venda" description="Clique em uma venda para ver itens, formas de pagamento, cliente e valor total." delay={1 * STAGGER} />
            <FeatureCard icon={<XCircle className="h-5 w-5 text-red-500" />} title="Cancelar venda" description="Cancele vendas que precisarem ser estornadas. O estoque é devolvido e a venda fica marcada como cancelada." badge="Estorno" delay={2 * STAGGER} />
            <FeatureCard icon={<Download className="h-5 w-5 text-purple-500" />} title="Exportar Excel" description="Exporte a lista de vendas do período filtrado para Excel (.xlsx) para análises externas." delay={3 * STAGGER} />
            <FeatureCard icon={<Printer className="h-5 w-5 text-amber-500" />} title="Imprimir" description="Imprima o comprovante ou detalhes da venda quando necessário." delay={4 * STAGGER} />
            <FeatureCard icon={<Filter className="h-5 w-5 text-teal-500" />} title="Vendedor" description="Empresas podem filtrar por vendedor para ver o desempenho de cada um." delay={5 * STAGGER} />
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
              <CardTitle>Consultar vendas</CardTitle>
              <CardDescription>Use o filtro de período no topo da página.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Selecione o período desejado (ex.: Último mês, Esta semana)." />
              <StepItem number={2} text="A tabela será atualizada com as vendas do intervalo." />
              <StepItem number={3} text="Clique em uma linha para abrir os detalhes da venda (itens, pagamento, cliente)." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cancelar uma venda</CardTitle>
              <CardDescription>Use com cuidado: o cancelamento devolve o estoque e marca a venda como cancelada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Localize a venda na lista e abra os detalhes se necessário." />
              <StepItem number={2} text="Clique no botão Cancelar venda." />
              <StepItem number={3} text="Confirme. Os itens voltarão ao estoque e a venda constará como cancelada nos relatórios." />
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
                <TipItem icon={<ClipboardList className="h-4 w-4 text-blue-500" />} text="O Histórico mostra vendas já finalizadas; para registrar uma nova venda, use a página Vendas (PDV)." />
                <TipItem icon={<Download className="h-4 w-4 text-green-500" />} text="Exporte para Excel periodicamente para backup e análise em planilhas." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="Cancele apenas vendas realmente incorretas; o estoque é devolvido automaticamente." />
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
                <TroubleshootItem problem="Lista vazia" solution="Verifique o período selecionado e se há vendas finalizadas nesse intervalo. Vendas só aparecem após o checkout na página Vendas." />
                <TroubleshootItem problem="Não consigo cancelar" solution="Algumas vendas podem estar bloqueadas para cancelamento (ex.: após certo prazo). Verifique as permissões da empresa." />
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
