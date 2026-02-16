import { CreditCard, Percent, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const cardRatesHelpTitle = 'Central de Ajuda - Taxas de Cartão';
export const cardRatesHelpDescription = 'Configure credenciadoras e taxas por bandeira/tipo de operação para NFC-e.';
export const cardRatesHelpIcon = <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getCardRatesHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Taxas de Cartão</CardTitle>
              <CardDescription>Credenciadoras e taxas por bandeira e tipo de operação. Usado na emissão de NFC-e (pagamento com cartão).</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Building2 className="h-5 w-5 text-green-500" />} title="Credenciadoras" description="Cadastre o CNPJ e dados da credenciadora de cartão." delay={0 * STAGGER} />
            <FeatureCard icon={<Percent className="h-5 w-5 text-blue-500" />} title="Taxas por bandeira/tipo" description="Configure as taxas aplicadas por bandeira (Visa, Master, etc.) e tipo (crédito/débito)." delay={1 * STAGGER} />
            <FeatureCard icon={<CreditCard className="h-5 w-5 text-purple-500" />} title="Impacto na NFC-e" description="Os dados de pagamento com cartão na NFC-e (NT 2025.001) usam as credenciadoras cadastradas." badge="Fiscal" delay={2 * STAGGER} />
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
            <CardHeader><CardTitle>Cadastrar credenciadora e taxas</CardTitle><CardDescription>Necessário para informar pagamento com cartão na NFC-e.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Adicione a credenciadora (CNPJ e nome) se ainda não existir." />
              <StepItem number={2} text="Configure as taxas por bandeira e tipo de operação (crédito/débito)." />
              <StepItem number={3} text="Ao emitir NFC-e com pagamento em cartão, selecione a credenciadora e o tipo; os dados serão enviados na nota." />
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
                <TipItem icon={<CreditCard className="h-4 w-4 text-blue-500" />} text="Mantenha as taxas atualizadas conforme o contrato com a credenciadora." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="A NFC-e exige dados da credenciadora e tipo de operação quando o pagamento for com cartão (legislação)." />
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
