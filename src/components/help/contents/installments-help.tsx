import { CalendarClock, DollarSign, Users, Filter, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const installmentsHelpTitle = 'Central de Ajuda - Pagamentos a Prazo';
export const installmentsHelpDescription = 'Acompanhe parcelas de vendas a prazo, registre pagamentos e filtre por data ou cliente.';
export const installmentsHelpIcon = <CalendarClock className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getInstallmentsHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Pagamentos a Prazo</CardTitle>
              <CardDescription>Parcelas vinculadas a vendas a prazo. Registre pagamentos e acompanhe por parcela ou por cliente.</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<DollarSign className="h-5 w-5 text-green-500" />} title="Parcelas" description="Lista de parcelas com vencimento, valor e status (pago/pendente)." badge="Principal" delay={0 * STAGGER} />
            <FeatureCard icon={<Users className="h-5 w-5 text-blue-500" />} title="Por cliente" description="Aba que agrupa o débito total por cliente para cobrança." delay={1 * STAGGER} />
            <FeatureCard icon={<Filter className="h-5 w-5 text-purple-500" />} title="Filtro por data" description="Filtre por esta semana, último mês, este ano, etc." delay={2 * STAGGER} />
            <FeatureCard icon={<CheckCircle2 className="h-5 w-5 text-teal-500" />} title="Registrar pagamento" description="Clique na parcela ou no cliente para registrar o pagamento e dar baixa." delay={3 * STAGGER} />
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
            <CardHeader><CardTitle>Registrar pagamento</CardTitle><CardDescription>Dar baixa em uma parcela ou no débito do cliente.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Na aba Parcelas: clique no botão de pagar na linha da parcela. Na aba Clientes: clique no cliente e depois em registrar pagamento." />
              <StepItem number={2} text="Informe o valor pago e a forma de pagamento (se solicitado)." />
              <StepItem number={3} text="Confirme. A parcela será marcada como paga." />
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
                <TipItem icon={<CalendarClock className="h-4 w-4 text-blue-500" />} text="Use o filtro por data para ver vencimentos da semana ou do mês." />
                <TipItem icon={<Users className="h-4 w-4 text-green-500" />} text="A aba Por cliente é útil para cobrança: mostra o total em aberto por cliente." />
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Problemas comuns</CardTitle></CardHeader>
            <CardContent>
              <TroubleshootItem problem="Parcela não aparece" solution="Verifique o filtro de datas. Parcelas são criadas quando a venda é finalizada com forma de pagamento A prazo." />
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
