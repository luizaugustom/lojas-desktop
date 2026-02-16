import { FileBarChart, Download, FileText, Package, ShoppingCart, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const reportsHelpTitle = 'Central de Ajuda - Relatórios';
export const reportsHelpDescription = 'Gere relatórios de vendas, produtos, notas fiscais e completo. Exporte em Excel, XML ou JSON.';
export const reportsHelpIcon = <FileBarChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getReportsHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Relatórios</CardTitle>
              <CardDescription>Tipos: vendas, vendas canceladas, produtos, notas fiscais e relatório completo. Período e formato configuráveis.</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<ShoppingCart className="h-5 w-5 text-green-500" />} title="Relatório de Vendas" description="Vendas realizadas no período com itens e totais." delay={0 * STAGGER} />
            <FeatureCard icon={<XCircle className="h-5 w-5 text-red-500" />} title="Vendas Canceladas" description="Vendas canceladas no período para análise." delay={1 * STAGGER} />
            <FeatureCard icon={<Package className="h-5 w-5 text-blue-500" />} title="Relatório de Produtos" description="Produtos cadastrados, estoque e movimentação." delay={2 * STAGGER} />
            <FeatureCard icon={<FileText className="h-5 w-5 text-purple-500" />} title="Relatório de Notas Fiscais" description="Notas emitidas no período." delay={3 * STAGGER} />
            <FeatureCard icon={<FileBarChart className="h-5 w-5 text-amber-500" />} title="Relatório Completo" description="Consolidação de vendas, produtos e notas no período." badge="Completo" delay={4 * STAGGER} />
            <FeatureCard icon={<Download className="h-5 w-5 text-teal-500" />} title="Formatos" description="Exporte em Excel (.xlsx), XML ou JSON conforme necessidade." delay={5 * STAGGER} />
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
            <CardHeader><CardTitle>Gerar um relatório</CardTitle><CardDescription>Selecione tipo, período e formato.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Escolha o tipo de relatório (Vendas, Produtos, Notas Fiscais, Completo, etc.)." />
              <StepItem number={2} text="Defina o período (datas inicial e final) e, se disponível, o vendedor." />
              <StepItem number={3} text="Escolha o formato (Excel, XML ou JSON). Marque 'Incluir documentos' se quiser anexos." />
              <StepItem number={4} text="Clique em Gerar. O arquivo será baixado quando estiver pronto." />
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
                <TipItem icon={<FileBarChart className="h-4 w-4 text-blue-500" />} text="Use o Relatório Completo para análise mensal ou anual consolidada." />
                <TipItem icon={<Download className="h-4 w-4 text-green-500" />} text="Excel é o mais prático para abrir em planilhas; XML/JSON para integração com outros sistemas." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="Períodos muito longos podem demorar; use filtros de vendedor para reduzir o volume." />
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Problemas comuns</CardTitle></CardHeader>
            <CardContent>
              <TroubleshootItem problem="Download não inicia" solution="Verifique se o período não está vazio e se há permissão. Tente um período menor." />
              <TroubleshootItem problem="Relatório vazio" solution="Confirme que existem dados no período selecionado (vendas, produtos ou notas)." />
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
