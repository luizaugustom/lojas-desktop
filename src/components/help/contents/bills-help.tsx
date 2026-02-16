import { CreditCard, Plus, Filter, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const billsHelpTitle = 'Central de Ajuda - Contas a Pagar';
export const billsHelpDescription = 'Cadastre contas a pagar, filtre por vencimento e registre pagamentos.';
export const billsHelpIcon = <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getBillsHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Contas a Pagar</CardTitle>
              <CardDescription>Controle de despesas e obrigações com vencimento. Filtre por período e pague.</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Plus className="h-5 w-5 text-green-500" />} title="Nova conta" description="Cadastre uma conta a pagar com descrição, valor e data de vencimento." badge="Cadastro" delay={0 * STAGGER} />
            <FeatureCard icon={<Filter className="h-5 w-5 text-blue-500" />} title="Filtros" description="Filtre por esta semana, próxima semana, próximo mês ou este ano." delay={1 * STAGGER} />
            <FeatureCard icon={<Calendar className="h-5 w-5 text-purple-500" />} title="Vencimento" description="Mantenha as datas de vencimento atualizadas para não perder prazos." delay={2 * STAGGER} />
            <FeatureCard icon={<CheckCircle2 className="h-5 w-5 text-teal-500" />} title="Pagar" description="Registre o pagamento da conta para dar baixa e manter o histórico." delay={3 * STAGGER} />
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
            <CardHeader><CardTitle>Cadastrar conta a pagar</CardTitle><CardDescription>Registre uma despesa com vencimento.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Clique em Nova conta (ou equivalente) no topo da página." />
              <StepItem number={2} text="Preencha descrição, valor e data de vencimento." />
              <StepItem number={3} text="Salve. A conta aparecerá na lista e nos filtros por período." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Registrar pagamento</CardTitle><CardDescription>Dar baixa em uma conta paga.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Localize a conta na lista e clique em Pagar (ou equivalente)." />
              <StepItem number={2} text="Confirme a data e o valor se necessário. A conta será marcada como paga." />
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
                <TipItem icon={<Calendar className="h-4 w-4 text-blue-500" />} text="Use o filtro Esta semana ou Próxima semana para planejar os pagamentos." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="Mantenha as contas cadastradas assim que surgirem para não esquecer vencimentos." />
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
