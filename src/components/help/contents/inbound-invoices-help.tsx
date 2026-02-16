import { FileDown, Upload, RefreshCw, Download, Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const inboundInvoicesHelpTitle = 'Central de Ajuda - Notas de Entrada';
export const inboundInvoicesHelpDescription = 'Importe XML de notas de entrada, vincule ou crie produtos e confira duplicatas.';
export const inboundInvoicesHelpIcon = <FileDown className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getInboundInvoicesHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Notas de Entrada</CardTitle>
              <CardDescription>Importe XML de NF-e de entrada (fornecedores), vincule itens a produtos existentes ou crie novos.</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Upload className="h-5 w-5 text-green-500" />} title="Importar XML" description="Envie o arquivo XML da nota de entrada. O sistema extrai chave, fornecedor, valor e itens." badge="Importar" delay={0 * STAGGER} />
            <FeatureCard icon={<Package className="h-5 w-5 text-blue-500" />} title="Vincular / Criar produtos" description="Para cada item da nota, vincule a um produto cadastrado ou crie um novo produto." delay={1 * STAGGER} />
            <FeatureCard icon={<RefreshCw className="h-5 w-5 text-purple-500" />} title="Duplicatas" description="Confira as duplicatas (parcelas) da nota e registre pagamentos se necessário." delay={2 * STAGGER} />
            <FeatureCard icon={<Download className="h-5 w-5 text-amber-500" />} title="Download PDF/XML" description="Baixe o PDF ou XML da nota após importação para arquivo." delay={3 * STAGGER} />
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
            <CardHeader><CardTitle>Importar uma nota de entrada</CardTitle><CardDescription>Use o XML da NF-e do fornecedor.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Clique em Importar XML (ou equivalente) e selecione o arquivo XML da nota." />
              <StepItem number={2} text="O sistema exibirá chave, fornecedor, valor e itens. Confira os dados." />
              <StepItem number={3} text="Para cada item: vincule a um produto existente (por código/NCM) ou crie um novo produto." />
              <StepItem number={4} text="Salve. A nota ficará registrada e os produtos vinculados ou criados." />
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
                <TipItem icon={<FileDown className="h-4 w-4 text-blue-500" />} text="Mantenha os produtos cadastrados com NCM/CFOP para facilitar o vínculo automático." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="Confira valores e quantidades antes de salvar; a nota de entrada impacta estoque e custos." />
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Problemas comuns</CardTitle></CardHeader>
            <CardContent>
              <TroubleshootItem problem="XML inválido ou rejeitado" solution="Verifique se o arquivo é um XML válido de NF-e (modelo 55). O sistema espera a estrutura padrão da SEFAZ." />
              <TroubleshootItem problem="Produto não encontrado para vincular" solution="Cadastre o produto antes ou use a opção de criar novo produto a partir do item da nota." />
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
