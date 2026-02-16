import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit,
  Trash2,
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

export const productsHelpTitle = 'Central de Ajuda - Produtos';
export const productsHelpDescription =
  'Cadastro, busca, filtros e registro de perdas do seu catálogo de produtos.';

export const productsHelpIcon = (
  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
);

export function getProductsHelpTabs(): PageHelpTab[] {
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
                  <CardTitle className="text-xl">Bem-vindo à Gestão de Produtos</CardTitle>
                  <CardDescription>
                    Cadastre produtos, filtre por estoque ou vencimento e registre perdas.
                  </CardDescription>
                </div>
                <Package className="h-12 w-12 text-blue-500 animate-pulse" />
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard
              icon={<Plus className="h-5 w-5 text-green-500" />}
              title="Novo Produto"
              description="Cadastre produtos com nome, código de barras, preço, estoque, NCM, CFOP e categoria (empresa/admin)."
              badge="Cadastro"
              delay={0 * STAGGER}
            />
            <FeatureCard
              icon={<Search className="h-5 w-5 text-blue-500" />}
              title="Busca"
              description="Pesquise por nome ou código de barras no campo de busca acima da tabela."
              delay={1 * STAGGER}
            />
            <FeatureCard
              icon={<Filter className="h-5 w-5 text-purple-500" />}
              title="Filtros"
              description="Filtre por estoque baixo ou produtos próximos ao vencimento para controle rápido."
              badge="Filtros"
              delay={2 * STAGGER}
            />
            <FeatureCard
              icon={<Edit className="h-5 w-5 text-amber-500" />}
              title="Editar Produto"
              description="Clique na linha do produto para editar (empresa/admin). Vendedores não editam cadastro."
              delay={3 * STAGGER}
            />
            <FeatureCard
              icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
              title="Registrar Perda"
              description="Registre perdas (vencimento, quebra, etc.) a partir da linha do produto; vendedores também podem registrar."
              badge="Perdas"
              delay={4 * STAGGER}
            />
            <FeatureCard
              icon={<Package className="h-5 w-5 text-teal-500" />}
              title="Limite do plano"
              description="O contador no subtítulo mostra quantos produtos você já cadastrou em relação ao limite do seu plano."
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
              <CardTitle>Cadastrar um produto</CardTitle>
              <CardDescription>
                Preencha os dados obrigatórios e opcionais (NCM, CFOP) para emissão de notas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Clique em 'Novo Produto' no topo da página." />
              <StepItem number={2} text="Preencha nome, código de barras, preço e estoque." emphasis="NCM e CFOP são importantes para NF-e." />
              <StepItem number={3} text="Salve. O produto passará a aparecer na página de Vendas e em relatórios." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usar filtros</CardTitle>
              <CardDescription>
                Ative os filtros para ver apenas produtos com estoque baixo ou próximos ao vencimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Use os botões de filtro acima da tabela (Estoque baixo / Próximos ao vencimento)." />
              <StepItem number={2} text="A tabela será atualizada para mostrar apenas os produtos que atendem aos critérios." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registrar perda</CardTitle>
              <CardDescription>
                Quando houver perda de produto (vencimento, quebra, furto, etc.), registre para controle de estoque e custo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Na linha do produto, clique no botão de registrar perda." />
              <StepItem number={2} text="Informe a quantidade perdida, o custo unitário (se aplicável) e o motivo." />
              <StepItem number={3} text="Salve. O registro aparecerá na página Perdas de Produtos e pode impactar relatórios." />
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
                  icon={<Package className="h-4 w-4 text-blue-500" />}
                  text="Mantenha NCM e CFOP preenchidos para emissão correta de notas fiscais."
                />
                <TipItem
                  icon={<Filter className="h-4 w-4 text-green-500" />}
                  text="Use os filtros regularmente para repor estoque baixo e dar baixa em produtos próximos ao vencimento."
                />
                <TipItem
                  icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  text="Registre perdas assim que ocorrerem para relatórios e controle de custo precisos."
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
                  problem="Não consigo adicionar produto"
                  solution="Verifique o limite do seu plano (contador no subtítulo). Se atingiu o limite, faça upgrade. Vendedores não podem cadastrar produtos."
                />
                <TroubleshootItem
                  problem="Código de barras duplicado"
                  solution="Cada produto deve ter um código de barras único. Altere o código ou edite o produto existente."
                />
                <TroubleshootItem
                  problem="Produto não aparece na venda"
                  solution="Confirme que o produto está cadastrado e com estoque. Use a busca na página de Vendas por nome ou código."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
