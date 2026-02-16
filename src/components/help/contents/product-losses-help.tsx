import { AlertTriangle, Plus, Filter, Package, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const productLossesHelpTitle = 'Central de Ajuda - Perdas de Produtos';
export const productLossesHelpDescription = 'Registre perdas (vencimento, quebra, furto, etc.) e filtre por data.';
export const productLossesHelpIcon = <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getProductLossesHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Perdas de Produtos</CardTitle>
              <CardDescription>Registre perdas de estoque (vencimento, quebra, furto, etc.) e acompanhe por período.</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Plus className="h-5 w-5 text-green-500" />} title="Registrar perda" description="Registre a perda informando produto, quantidade, custo unitário e motivo. Pode ser feito a partir da página Produtos ou aqui." badge="Registro" delay={0 * STAGGER} />
            <FeatureCard icon={<Filter className="h-5 w-5 text-blue-500" />} title="Filtro por data" description="Filtre por período (data inicial e final) para ver as perdas do intervalo." delay={1 * STAGGER} />
            <FeatureCard icon={<Package className="h-5 w-5 text-purple-500" />} title="Impacto no estoque" description="O registro de perda pode impactar o estoque do produto (conforme configuração do sistema)." delay={2 * STAGGER} />
            <FeatureCard icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} title="Relatório e custo" description="Use os dados para relatórios de custo e controle de perdas." delay={3 * STAGGER} />
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
            <CardHeader><CardTitle>Registrar uma perda</CardTitle><CardDescription>Na página Produtos ou aqui.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Na página Produtos: clique no botão de registrar perda na linha do produto. Ou aqui: use o botão de nova perda e selecione o produto." />
              <StepItem number={2} text="Informe a quantidade perdida, o custo unitário (se aplicável) e o motivo (vencimento, quebra, furto, etc.)." />
              <StepItem number={3} text="Salve. O registro aparecerá na lista e poderá ser usado em relatórios." />
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
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-blue-500" />} text="Registre as perdas assim que ocorrerem para relatórios e custos precisos." />
                <TipItem icon={<Package className="h-4 w-4 text-green-500" />} text="Mantenha o custo unitário atualizado para que o valor total da perda reflita o custo real." />
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
