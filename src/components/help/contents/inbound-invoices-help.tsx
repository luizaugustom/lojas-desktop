import { FileDown, Upload, RefreshCw, Download, Package, CheckCircle2, AlertTriangle, RotateCcw, FileText } from 'lucide-react';
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
      value: 'devolucao',
      label: 'Devolução de notas',
      content: (
        <div className="space-y-6">
          <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <RotateCcw className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                Emissão de NFe de devolução
              </CardTitle>
              <CardDescription>
                A NFe de devolução é a nota fiscal de saída que sua empresa emite para o fornecedor quando devolve mercadorias que foram recebidas em uma nota de entrada. Ela referencia a nota de entrada original e é transmitida pela Focus NFe (mesmo provedor das demais NF-e).
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requisitos para emitir a devolução</CardTitle>
              <CardDescription>Antes de iniciar, confira se a nota de entrada atende aos requisitos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                  <span><strong className="text-foreground">XML da nota de entrada:</strong> a nota precisa ter sido importada com o arquivo XML (não apenas dados manuais). Sem o XML, o sistema não consegue montar a NFe de devolução.</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                  <span><strong className="text-foreground">Chave de acesso com 44 dígitos:</strong> a chave da NF-e deve estar completa e válida para referenciar a devolução na SEFAZ.</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                  <span><strong className="text-foreground">Configuração fiscal:</strong> a API Key do Focus NFe deve estar configurada (pela empresa ou pelo administrador) para que a emissão seja enviada à SEFAZ.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Passo a passo: como emitir a NFe de devolução</CardTitle>
              <CardDescription>Siga cada etapa para garantir a emissão correta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StepItem number={1} text="Na lista de Notas Fiscais de Entrada, localize a nota do fornecedor que você deseja devolver. Verifique se a nota possui o botão «Emitir Devolução» ativo (se estiver desabilitado, a nota não tem XML ou chave válida)." />
              <StepItem number={2} text="Clique no botão «Emitir Devolução». Será aberto um modal com o título «Emitir nota de devolução»." />
              <StepItem number={3} text="Aguarde o carregamento do preview. O sistema exibirá o resumo da nota de entrada: fornecedor, chave de acesso e valor total, além de uma tabela com todos os itens (descrição, quantidade, valor unitário e total por item)." />
              <StepItem number={4} text="Confira atentamente os dados exibidos. A NFe de devolução será emitida com todos os itens da nota de entrada (devolução total). Certifique-se de que é realmente essa a nota e os itens que deseja devolver." />
              <StepItem number={5} text="Se estiver tudo correto, clique em «Confirmar e emitir». O sistema enviará a NFe de devolução para a Focus NFe; a emissão pode levar alguns segundos." />
              <StepItem number={6} text="Ao concluir, uma mensagem de sucesso será exibida e a nota de devolução ficará registrada. Você pode acessá-la pelo botão «Ver devoluções» na mesma linha da nota de entrada e baixar o PDF/XML da NFe de devolução a partir dali." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ver devoluções já emitidas</CardTitle>
              <CardDescription>Como consultar e baixar as NFe de devolução.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Na linha da nota de entrada, clique em «Ver devoluções» (ou «Devoluções (N)» se já houver N devoluções emitidas)." />
              <StepItem number={2} text="Será aberto um diálogo listando todas as NFe de devolução emitidas para aquela nota: número da NFe, status, data de emissão e chave." />
              <StepItem number={3} text="Use o botão «Download» em cada devolução para baixar o PDF ou XML da NFe de devolução, conforme disponível no sistema." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Dicas e problemas comuns – Devolução</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TipItem icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} text="Só é possível emitir devolução para notas que foram importadas com XML. Notas cadastradas apenas com chave/fornecedor/valor manual não possuem os dados necessários para a NFe de devolução." />
              <TroubleshootItem problem="Botão «Emitir Devolução» desabilitado" solution="Verifique se a nota foi importada com o arquivo XML e se a chave de acesso tem 44 dígitos. Passe o mouse sobre o botão para ver a dica: «É necessário ter o XML e a chave de 44 dígitos para emitir a devolução.»" />
              <TroubleshootItem problem="Erro ao carregar o preview no modal" solution="A nota pode não ser uma NF-e de entrada válida, o XML pode estar incompleto ou o endereço do fornecedor no XML pode estar incompleto. Confira o XML original e, se necessário, reimporte a nota com o XML correto." />
              <TroubleshootItem problem="Falha ao emitir (Focus NFe / SEFAZ)" solution="Verifique a configuração da API Key do Focus NFe nas configurações da empresa. Erros de timeout ou conexão indicam problema de rede ou indisponibilidade do serviço; tente novamente em alguns instantes." />
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
