import {
  Users,
  Plus,
  Search,
  ShoppingCart,
  CalendarClock,
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

export const customersHelpTitle = 'Central de Ajuda - Clientes';
export const customersHelpDescription =
  'Cadastre clientes, busque por nome ou documento e use em vendas e parcelas a prazo.';

export const customersHelpIcon = (
  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
);

export function getCustomersHelpTabs(): PageHelpTab[] {
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
                  <CardTitle className="text-xl">Bem-vindo à Gestão de Clientes</CardTitle>
                  <CardDescription>
                    Cadastre clientes para usar em vendas, orçamentos e parcelas a prazo.
                  </CardDescription>
                </div>
                <Users className="h-12 w-12 text-blue-500 animate-pulse" />
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Plus className="h-5 w-5 text-green-500" />} title="Novo cliente" description="Cadastre nome, CPF/CNPJ, telefone, e-mail e endereço. Obrigatório para vendas com NFC-e acima do valor configurado." badge="Cadastro" delay={0 * STAGGER} />
            <FeatureCard icon={<Search className="h-5 w-5 text-blue-500" />} title="Busca" description="Pesquise por nome ou documento no campo de busca acima da tabela." delay={1 * STAGGER} />
            <FeatureCard icon={<ShoppingCart className="h-5 w-5 text-purple-500" />} title="Uso em vendas" description="Selecione o cliente no checkout para vincular a venda e emitir NFC-e em nome dele." delay={2 * STAGGER} />
            <FeatureCard icon={<CalendarClock className="h-5 w-5 text-amber-500" />} title="Parcelas a prazo" description="Clientes com vendas a prazo aparecem em Pagamentos a Prazo para acompanhamento de parcelas." delay={3 * STAGGER} />
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
              <CardTitle>Cadastrar um cliente</CardTitle>
              <CardDescription>Preencha os dados obrigatórios (nome e CPF ou CNPJ).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Clique em Novo Cliente no topo da página." />
              <StepItem number={2} text="Informe nome e CPF (11 dígitos) ou CNPJ (14 dígitos)." emphasis="Telefone e e-mail ajudam em cobranças e envio de notas." />
              <StepItem number={3} text="Salve. O cliente poderá ser selecionado na venda e em orçamentos." />
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
                <TipItem icon={<Users className="h-4 w-4 text-blue-500" />} text="Mantenha CPF/CNPJ correto para emissão de notas fiscais e conformidade fiscal." />
                <TipItem icon={<CalendarClock className="h-4 w-4 text-green-500" />} text="Clientes com parcelas em aberto podem ser consultados em Pagamentos a Prazo." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="Para vendas acima do valor configurado pela empresa, o CPF ou CNPJ do cliente é obrigatório por lei na NFC-e." />
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
                <TroubleshootItem problem="CPF/CNPJ inválido" solution="Verifique se o documento tem 11 dígitos (CPF) ou 14 (CNPJ) e se os dígitos verificadores estão corretos." />
                <TroubleshootItem problem="Cliente não aparece na venda" solution="Certifique-se de que o cliente foi salvo. Na tela de checkout, use a busca por nome ou documento para selecionar." />
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
