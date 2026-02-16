import { Building2, Plus, Search, Settings, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const companiesHelpTitle = 'Central de Ajuda - Empresas';
export const companiesHelpDescription = 'Gerencie empresas (admin): cadastro, status ativo/inativo e configuração Focus NFe.';
export const companiesHelpIcon = <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getCompaniesHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Gerenciar Empresas</CardTitle>
              <CardDescription>Página exclusiva para administradores. Cadastre empresas, ative/desative e configure emissão fiscal.</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<Plus className="h-5 w-5 text-green-500" />} title="Nova empresa" description="Cadastre uma nova empresa com nome, CNPJ e dados de acesso." badge="Admin" delay={0 * STAGGER} />
            <FeatureCard icon={<Search className="h-5 w-5 text-blue-500" />} title="Busca" description="Pesquise empresas por nome ou CNPJ." delay={1 * STAGGER} />
            <FeatureCard icon={<Building2 className="h-5 w-5 text-purple-500" />} title="Status ativo/inativo" description="Ative ou desative empresas. Empresas inativas não acessam o sistema." delay={2 * STAGGER} />
            <FeatureCard icon={<Settings className="h-5 w-5 text-amber-500" />} title="Configuração Focus NFe" description="Configure API Key e dados fiscais da empresa para emissão de NF-e/NFC-e." delay={3 * STAGGER} />
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
            <CardHeader><CardTitle>Cadastrar empresa</CardTitle><CardDescription>Apenas administradores.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Clique em Nova empresa (ou equivalente)." />
              <StepItem number={2} text="Preencha nome, CNPJ e dados de acesso (login/senha do primeiro usuário)." />
              <StepItem number={3} text="Salve. A empresa poderá acessar o sistema e configurar dados fiscais em Configurações." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ativar/Desativar empresa</CardTitle><CardDescription>Controle de acesso.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Na linha da empresa, use o botão ou switch de status (Ativo/Inativo)." />
              <StepItem number={2} text="Empresas inativas não conseguem fazer login." />
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
                <TipItem icon={<Building2 className="h-4 w-4 text-blue-500" />} text="Mantenha os dados fiscais corretos; a emissão de notas depende da configuração da empresa." />
                <TipItem icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} text="Desative empresas em vez de excluir para preservar histórico." />
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Problemas comuns</CardTitle></CardHeader>
            <CardContent>
              <TroubleshootItem problem="Empresa não consegue emitir nota" solution="Verifique a configuração Focus NFe (API Key e dados fiscais) na empresa. A empresa deve preencher em Configurações ou o admin pode configurar aqui." />
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
