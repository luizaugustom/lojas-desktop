import {
  FileText,
  Plus,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
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

export const budgetsHelpTitle = 'Central de Ajuda - Orçamentos';
export const budgetsHelpDescription =
  'Crie, imprima e gerencie orçamentos. Converta em venda e acompanhe status (pendente, aprovado, cancelado).';

export const budgetsHelpIcon = (
  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
);

export function getBudgetsHelpTabs(): PageHelpTab[] {
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
                  <CardTitle className="text-xl">Bem-vindo aos Orçamentos</CardTitle>
                  <CardDescription>
                    Crie orçamentos a partir do PDV, imprima e converta em venda quando o cliente aprovar.
                  </CardDescription>
                </div>
                <FileText className="h-12 w-12 text-blue-500 animate-pulse" />
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Plus className="h-5 w-5 text-green-500" />} title="Criar orçamento" description="Na página de Vendas, monte o carrinho e clique em Orçamento para gerar um orçamento com os itens e totais." badge="PDV" delay={0 * STAGGER} />
            <FeatureCard icon={<Printer className="h-5 w-5 text-blue-500" />} title="Imprimir" description="Imprima o orçamento para entregar ao cliente ou enviar por e-mail/WhatsApp." delay={1 * STAGGER} />
            <FeatureCard icon={<CheckCircle className="h-5 w-5 text-green-500" />} title="Converter em venda" description="Quando o cliente aprovar, converta o orçamento em venda para registrar o pagamento e dar baixa no estoque." badge="Aprovar" delay={2 * STAGGER} />
            <FeatureCard icon={<Clock className="h-5 w-5 text-amber-500" />} title="Validade" description="Cada orçamento possui data de validade. Acompanhe os status: pendente, aprovado ou cancelado." delay={3 * STAGGER} />
            <FeatureCard icon={<Edit className="h-5 w-5 text-teal-500" />} title="Editar / Excluir" description="Orçamentos pendentes podem ser editados ou excluídos conforme a política da empresa." delay={4 * STAGGER} />
            <FeatureCard icon={<XCircle className="h-5 w-5 text-red-500" />} title="Cancelar" description="Orçamentos não aprovados podem ser cancelados para manter o histórico organizado." delay={5 * STAGGER} />
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
              <CardTitle>Criar um orçamento</CardTitle>
              <CardDescription>O orçamento é criado a partir da página de Vendas (PDV).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Vá em Vendas e adicione os produtos desejados ao carrinho." />
              <StepItem number={2} text="Clique em Orçamento (ou botão equivalente no carrinho)." />
              <StepItem number={3} text="Preencha dados do cliente (nome, telefone, CPF/CNPJ) e validade." />
              <StepItem number={4} text="Salve. O orçamento aparecerá nesta página para impressão e conversão." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Converter orçamento em venda</CardTitle>
              <CardDescription>Quando o cliente aprovar, converta para registrar a venda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Localize o orçamento na lista com status Pendente." />
              <StepItem number={2} text="Clique em Converter em venda (ou equivalente)." />
              <StepItem number={3} text="Informe as formas de pagamento no checkout e confirme." emphasis="O estoque será baixado e a venda registrada no Histórico de Vendas." />
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
                <TipItem icon={<Clock className="h-4 w-4 text-blue-500" />} text="Defina uma validade curta (ex.: 7 dias) para evitar preços desatualizados." />
                <TipItem icon={<CheckCircle className="h-4 w-4 text-green-500" />} text="Converta em venda assim que o cliente aprovar para manter estoque e relatórios corretos." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="Cancele orçamentos que não forem mais utilizados para manter a lista limpa." />
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
                <TroubleshootItem problem="Não encontro o botão Orçamento" solution="O orçamento é criado na página de Vendas, no carrinho. Monte os itens e use o botão Orçamento no carrinho." />
                <TroubleshootItem problem="Converter em venda desabilitado" solution="Apenas orçamentos com status Pendente podem ser convertidos. Orçamentos já aprovados ou cancelados não." />
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
