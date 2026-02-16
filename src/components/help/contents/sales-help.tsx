import {
  ShoppingCart,
  Search,
  Barcode,
  FileText,
  CreditCard,
  Keyboard,
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

const shortcuts = [
  { category: 'Foco', items: [{ keys: ['←'], desc: 'Mover foco para a lista de produtos' }, { keys: ['→'], desc: 'Mover foco para o carrinho' }] },
  { category: 'Navegação (produtos)', items: [{ keys: ['↑', '↓'], desc: 'Navegar entre produtos' }, { keys: ['Enter'], desc: 'Adicionar produto selecionado ao carrinho' }] },
  { category: 'Carrinho', items: [{ keys: ['+'], desc: 'Aumentar quantidade' }, { keys: ['-'], desc: 'Diminuir quantidade' }, { keys: ['Delete'], desc: 'Remover item' }, { keys: ['Ctrl', 'D'], desc: 'Focar desconto' }] },
  { category: 'Ações gerais', items: [{ keys: ['F6'], desc: 'Abrir checkout' }, { keys: ['Ctrl', 'Enter'], desc: 'Checkout (alternativa)' }, { keys: ['Ctrl', 'L'], desc: 'Limpar carrinho' }, { keys: ['Ctrl', 'B'], desc: 'Buscar produtos' }] },
  { category: 'Checkout', items: [{ keys: ['1', '2', '3', '4', '5'], desc: 'Selecionar forma de pagamento (Dinheiro, Crédito, Débito, PIX, A prazo)' }, { keys: ['Esc'], desc: 'Cancelar' }] },
];

export const salesHelpTitle = 'Central de Ajuda - Vendas (PDV)';
export const salesHelpDescription =
  'Ponto de venda: carrinho, busca, leitor de código de barras, orçamento, checkout e atalhos de teclado.';

export const salesHelpIcon = (
  <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
);

export function getSalesHelpTabs(): PageHelpTab[] {
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
                  <CardTitle className="text-xl">Bem-vindo ao PDV</CardTitle>
                  <CardDescription>
                    Adicione produtos ao carrinho, finalize vendas ou crie orçamentos.
                  </CardDescription>
                </div>
                <ShoppingCart className="h-12 w-12 text-blue-500 animate-pulse" />
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Search className="h-5 w-5 text-green-500" />} title="Buscar produtos" description="Digite nome ou código de barras no campo de busca. Use setas para navegar e Enter para adicionar." badge="Busca" delay={0 * STAGGER} />
            <FeatureCard icon={<Barcode className="h-5 w-5 text-blue-500" />} title="Leitor de código de barras" description="Conecte um leitor USB ou use a câmera. Códigos são lidos automaticamente e o produto é adicionado ao carrinho." delay={1 * STAGGER} />
            <FeatureCard icon={<ShoppingCart className="h-5 w-5 text-purple-500" />} title="Carrinho" description="Ajuste quantidades com + e -, remova itens, aplique desconto. Setas ← → alternam foco entre produtos e carrinho." delay={2 * STAGGER} />
            <FeatureCard icon={<FileText className="h-5 w-5 text-amber-500" />} title="Orçamento" description="Gere orçamento a partir do carrinho sem finalizar venda. Útil para enviar ao cliente ou imprimir." badge="Orçamento" delay={3 * STAGGER} />
            <FeatureCard icon={<CreditCard className="h-5 w-5 text-teal-500" />} title="Checkout" description="Finalize a venda: informe cliente, formas de pagamento (dinheiro, cartão, PIX, a prazo). F6 ou Ctrl+Enter abre o checkout." badge="Finalizar" delay={4 * STAGGER} />
            <FeatureCard icon={<Keyboard className="h-5 w-5 text-indigo-500" />} title="Atalhos de teclado" description="Use atalhos para agilizar: F6 checkout, Ctrl+B busca, Ctrl+L limpar carrinho. Veja a aba Atalhos." badge="Teclado" delay={5 * STAGGER} />
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
              <CardTitle>Fazer uma venda</CardTitle>
              <CardDescription>Do carrinho ao pagamento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Busque ou escaneie os produtos e adicione ao carrinho (clique ou Enter)." />
              <StepItem number={2} text="Ajuste quantidades e descontos no carrinho se necessário." />
              <StepItem number={3} text="Clique em Finalizar venda ou pressione F6 (ou Ctrl+Enter)." />
              <StepItem number={4} text="No checkout: informe cliente (opcional), adicione formas de pagamento e confirme." emphasis="Caixa deve estar aberto (Fechamento de Caixa)." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Criar orçamento</CardTitle>
              <CardDescription>Gere orçamento sem finalizar a venda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Monte o carrinho com os produtos desejados." />
              <StepItem number={2} text="Clique em Orçamento (ou botão equivalente no carrinho)." />
              <StepItem number={3} text="Preencha dados do cliente e validade. Imprima ou envie se necessário." />
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      value: 'shortcuts',
      label: 'Atalhos',
      content: (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                Atalhos de teclado
              </CardTitle>
              <CardDescription>Use estes atalhos para agilizar o PDV (desabilitados quando um modal está aberto).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shortcuts.map((cat) => (
                <div key={cat.category}>
                  <h4 className="font-semibold text-sm mb-2">{cat.category}</h4>
                  <ul className="space-y-2">
                    {cat.items.map((item, i) => (
                      <li key={i} className="flex justify-between gap-4 py-1 border-b last:border-0 text-sm">
                        <span className="flex gap-1 flex-wrap">
                          {(Array.isArray(item.keys) ? item.keys : [item.keys]).flat().map((k, j) => (
                            <kbd key={j} className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">{k}</kbd>
                          ))}
                        </span>
                        <span className="text-muted-foreground">{(item as any).desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                Use ← e → para alternar foco entre lista de produtos e carrinho. Apenas a área com foco responde às setas e ações.
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
                <TipItem icon={<Barcode className="h-4 w-4 text-blue-500" />} text="Mantenha o leitor de código de barras conectado para agilizar a inclusão de produtos." />
                <TipItem icon={<CreditCard className="h-4 w-4 text-green-500" />} text="Abra o caixa em Fechamento de Caixa antes de iniciar vendas do dia." />
                <TipItem icon={<Keyboard className="h-4 w-4 text-yellow-500" />} text="Use F6 e Ctrl+B para reduzir o uso do mouse e acelerar o atendimento." />
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
                <TroubleshootItem problem="Checkout não abre" solution="Verifique se o caixa está aberto (página Fechamento de Caixa). Se não houver caixa aberto, o sistema solicitará o saldo inicial." />
                <TroubleshootItem problem="Leitor não adiciona produto" solution="Confirme que o produto está cadastrado com o mesmo código de barras. Teste a busca manual pelo código." />
                <TroubleshootItem problem="Atalhos não funcionam" solution="Atalhos são desabilitados quando um modal está aberto (checkout, orçamento, etc.). Feche o modal ou use o mouse." />
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
