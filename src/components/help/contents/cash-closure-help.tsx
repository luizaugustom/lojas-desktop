import { DollarSign, Lock, Unlock, Printer, CreditCard, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const cashClosureHelpTitle = 'Central de Ajuda - Fechamento de Caixa';
export const cashClosureHelpDescription = 'Abra e feche o caixa diário, confira o resumo por forma de pagamento e imprima o comprovante.';
export const cashClosureHelpIcon = <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getCashClosureHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Fechamento de Caixa</CardTitle>
              <CardDescription>Controle de abertura e fechamento do caixa. Resumo por forma de pagamento e impressão do comprovante.</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Unlock className="h-5 w-5 text-green-500" />} title="Abrir caixa" description="Informe o saldo inicial (dinheiro em caixa) para iniciar o dia. Necessário para realizar vendas." badge="Abertura" delay={0 * STAGGER} />
            <FeatureCard icon={<Lock className="h-5 w-5 text-red-500" />} title="Fechar caixa" description="Ao final do dia, feche o caixa. O sistema calcula o esperado por forma de pagamento e permite conferência." badge="Fechamento" delay={1 * STAGGER} />
            <FeatureCard icon={<CreditCard className="h-5 w-5 text-blue-500" />} title="Resumo por forma de pagamento" description="Visualize totais por dinheiro, cartão, PIX, a prazo, etc., para conferir com o físico." delay={2 * STAGGER} />
            <FeatureCard icon={<Printer className="h-5 w-5 text-purple-500" />} title="Imprimir comprovante" description="Imprima o comprovante de fechamento para arquivo ou conferência." delay={3 * STAGGER} />
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
            <CardHeader><CardTitle>Abrir o caixa</CardTitle><CardDescription>Necessário antes de iniciar vendas no PDV.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Se não houver caixa aberto, o sistema exibirá o diálogo de abertura ao acessar Vendas." />
              <StepItem number={2} text="Informe o saldo inicial em dinheiro (valor que está no caixa físico)." />
              <StepItem number={3} text="Confirme. O caixa ficará aberto e as vendas do dia serão vinculadas a ele." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Fechar o caixa</CardTitle><CardDescription>Ao final do expediente, feche para conferir e imprimir.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Na página Fechamento de Caixa, clique em Fechar caixa (quando o caixa estiver aberto)." />
              <StepItem number={2} text="Confira o resumo por forma de pagamento com os valores físicos (dinheiro, cartão, etc.)." />
              <StepItem number={3} text="Informe valores de conferência se solicitado e confirme. Imprima o comprovante se desejar." />
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
                <TipItem icon={<DollarSign className="h-4 w-4 text-blue-500" />} text="Abra o caixa sempre no início do dia com o saldo inicial correto." />
                <TipItem icon={<Printer className="h-4 w-4 text-green-500" />} text="Imprima o comprovante ao fechar para arquivo e conferência posterior." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="Se houver diferença entre esperado e conferido, verifique as vendas e formas de pagamento antes de fechar." />
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Problemas comuns</CardTitle></CardHeader>
            <CardContent>
              <TroubleshootItem problem="Não consigo fazer vendas" solution="É necessário ter um caixa aberto. Abra o caixa na página Fechamento de Caixa ou pelo diálogo exibido ao acessar Vendas." />
              <TroubleshootItem problem="Valor esperado diferente do conferido" solution="Confira se todas as vendas foram lançadas com a forma de pagamento correta. Ajuste valores de conferência se for diferença de arredondamento ou troco." />
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
