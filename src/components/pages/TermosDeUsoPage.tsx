import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { FileText, CheckCircle2, XCircle } from 'lucide-react';
import { companyApi } from '@/lib/api-endpoints';
import toast from 'react-hot-toast';

// Conteúdo dos termos (mesmo conteúdo do front-lojas)
const TERMOS_CONTENT = `# TERMOS DE USO DO SISTEMA MONTSHOP

**Última atualização: 16 de fevereiro de 2025**

## 1. PREÂMBULO E ACEITAÇÃO

Os presentes Termos de Uso ("Termos") regulam o uso do sistema MontShop ("Sistema" ou "Serviço"), uma plataforma de software como serviço (SaaS) de gestão de lojas desenvolvida e fornecida pela MONT Tecnologia da Informação ("MONT", "nós", "nosso" ou "prestador").

Ao acessar, utilizar ou fazer login no Sistema, você ("Usuário", "Cliente" ou "Empresa") concorda expressamente em ficar vinculado a estes Termos. Se você não concordar com qualquer parte destes Termos, não deve utilizar o Sistema.

O uso do Sistema está condicionado à aceitação integral e irrestrita destes Termos. A não aceitação dos Termos impede o acesso e uso do Sistema.

## 2. DEFINIÇÕES

Para os fins destes Termos, as seguintes definições se aplicam:

- **Sistema**: Plataforma SaaS MontShop, incluindo todas as suas funcionalidades, módulos, interfaces e serviços relacionados.
- **Usuário/Cliente/Empresa**: Pessoa jurídica que possui conta ativa no Sistema e seus representantes autorizados.
- **Conta**: Registro único de acesso ao Sistema vinculado a uma empresa.
- **Dados**: Todas as informações, arquivos, documentos, transações e conteúdo inseridos ou gerados no Sistema pelo Usuário.
- **Serviço**: Conjunto de funcionalidades disponibilizadas através do Sistema.
- **Plano**: Modalidade de contratação do serviço (TRIAL, PRO, etc.).

## 3. CADASTRO E CONTA DE USUÁRIO

### 3.1. Responsabilidade pelos Dados
O Usuário é integralmente responsável pela veracidade, exatidão, atualidade e completude de todas as informações fornecidas durante o cadastro e uso do Sistema.

### 3.2. Segurança de Credenciais
O Usuário é responsável por manter a confidencialidade de suas credenciais de acesso (login e senha) e por todas as atividades que ocorram em sua conta. O Usuário deve notificar imediatamente a MONT sobre qualquer uso não autorizado de sua conta.

### 3.3. Proibição de Transferência
A conta é intransferível e está vinculada exclusivamente à empresa cadastrada. É vedada a transferência, venda ou cessão da conta a terceiros sem autorização prévia e por escrito da MONT.

### 3.4. Capacidade Legal
O Usuário declara possuir capacidade legal para celebrar este acordo e representar a empresa vinculada à conta.

## 4. USO DO SERVIÇO

### 4.1. Uso Permitido
O Sistema deve ser utilizado exclusivamente para fins legítimos e de acordo com a legislação brasileira vigente. O Usuário compromete-se a utilizar o Sistema de forma adequada, responsável e ética.

### 4.2. Uso Proibido
É expressamente vedado ao Usuário:

- Utilizar o Sistema para atividades ilegais, fraudulentas ou que violem direitos de terceiros;
- Tentar acessar áreas restritas do Sistema ou violar medidas de segurança;
- Realizar engenharia reversa, descompilação ou desmontagem do Sistema;
- Reproduzir, copiar, modificar ou criar trabalhos derivados do Sistema sem autorização;
- Utilizar o Sistema de forma que possa danificar, desabilitar, sobrecarregar ou comprometer a infraestrutura;
- Transmitir vírus, malware ou qualquer código malicioso;
- Utilizar robôs, scripts automatizados ou qualquer meio para acessar o Sistema de forma não autorizada;
- Remover ou alterar avisos de direitos autorais, marcas registradas ou outros avisos de propriedade;
- Utilizar o Sistema de forma que viole qualquer lei, regulamento ou direito de terceiros.

### 4.3. Limites de Uso
O Usuário reconhece que o uso do Sistema está sujeito a limites técnicos e de plano contratado, podendo incluir limitações de armazenamento, número de transações, usuários ou outras restrições conforme o plano contratado.

## 5. PAGAMENTO E COBRANÇA

### 5.1. Pagamento em Dia
O Usuário compromete-se a manter o pagamento das mensalidades e taxas em dia, conforme o plano contratado e condições comerciais acordadas.

### 5.2. Desativação por Atraso
**EM CASO DE ATRASO SUPERIOR A 3 (TRÊS) DIAS CORRIDOS NO PAGAMENTO, A MONT TECNOLOGIA DA INFORMAÇÃO RESERVA-SE O DIREITO DE DESATIVAR TEMPORARIAMENTE O ACESSO À CONTA, SEM PREJUÍZO DA COBRANÇA DOS VALORES DEVIDOS.**

A desativação temporária não exime o Usuário do pagamento dos valores em atraso e juros/multas aplicáveis.

### 5.3. Renovação Automática
Salvo indicação contrária, os planos são renovados automaticamente, e o Usuário autoriza a cobrança automática dos valores devidos.

### 5.4. Reembolsos
Reembolsos serão avaliados caso a caso, conforme a política comercial da MONT e legislação aplicável. Em regra, não há reembolso de mensalidades já utilizadas.

## 6. DESATIVAÇÃO E REMOÇÃO DE DADOS

### 6.1. Desativação Temporária
Contas podem ser desativadas temporariamente por:
- Atraso no pagamento superior a 3 (três) dias corridos;
- Violação dos Termos de Uso;
- Solicitação do próprio Usuário;
- Decisão da MONT por motivos técnicos ou legais.

### 6.2. Remoção Permanente de Dados
**CONTAS DESATIVADAS POR PERÍODO SUPERIOR A 30 (TRINTA) DIAS CORRIDOS TERÃO TODOS OS DADOS PERMANENTEMENTE REMOVIDOS DO SISTEMA, SEM POSSIBILIDADE DE RECUPERAÇÃO.**

O Usuário é responsável por manter backups de seus dados. A MONT não se responsabiliza pela perda de dados após o período de 30 dias de desativação.

### 6.3. Direito de Desativação
A MONT reserva-se o direito de desativar contas que violem estes Termos, sem necessidade de notificação prévia em casos de violação grave ou atividades ilegais.

### 6.4. Notificação Prévia
Quando aplicável e possível, a MONT tentará notificar o Usuário sobre desativações iminentes, mas não se responsabiliza por falhas na entrega de notificações.

## 7. RESPONSABILIDADE FISCAL E TRIBUTÁRIA

### 7.1. Natureza do Sistema
O Sistema MontShop é uma **FERRAMENTA DE GESTÃO** que auxilia na administração de lojas, incluindo funcionalidades relacionadas à emissão de notas fiscais eletrônicas (NFC-e e NF-e).

### 7.2. Responsabilidade Exclusiva do Usuário
**O USUÁRIO RECONHECE E CONCORDA QUE TODA E QUALQUER RESPONSABILIDADE RELACIONADA A OBRIGAÇÕES FISCAIS, TRIBUTÁRIAS E PERANTE A RECEITA FEDERAL É EXCLUSIVA DO USUÁRIO.**

O Usuário é integralmente responsável por:
- A correta emissão de notas fiscais;
- A classificação fiscal adequada de produtos e serviços;
- O cumprimento de todas as obrigações acessórias;
- A veracidade e completude das informações fornecidas ao Sistema;
- O uso adequado e correto das funcionalidades fiscais;
- O cumprimento de todas as normas da Receita Federal do Brasil;
- O pagamento de impostos, taxas e contribuições devidas;
- O atendimento a fiscalizações e auditorias fiscais.

### 7.3. Isenção de Responsabilidade da MONT
**A MONT TECNOLOGIA DA INFORMAÇÃO NÃO SE RESPONSABILIZA POR:**

- Erros na emissão de notas fiscais decorrentes de informações incorretas fornecidas pelo Usuário;
- Classificação fiscal incorreta de produtos ou serviços;
- Omissão de informações obrigatórias nas notas fiscais;
- Uso inadequado, incorreto ou indevido das funcionalidades fiscais do Sistema;
- Multas, penalidades, juros ou sanções aplicadas pela Receita Federal ou outros órgãos fiscalizadores;
- Problemas decorrentes de configurações incorretas realizadas pelo Usuário;
- Falhas na integração com sistemas externos (SEFAZ, prefeituras, etc.) que estejam fora do controle da MONT;
- Consequências de não cumprimento de obrigações fiscais pelo Usuário.

### 7.4. Assessoria Fiscal
O Usuário declara estar ciente de que o Sistema fornece **FERRAMENTAS DE GESTÃO**, não constituindo consultoria fiscal, contábil ou tributária. Recomenda-se que o Usuário mantenha assessoria de contador ou profissional habilitado para orientação fiscal adequada.

### 7.5. Conformidade Legal
O Usuário compromete-se a utilizar o Sistema em conformidade com todas as leis, regulamentos e normas fiscais aplicáveis, assumindo total responsabilidade por eventuais descumprimentos.

## 8. PROPRIEDADE INTELECTUAL

### 8.1. Propriedade do Sistema
O Sistema, incluindo seu código-fonte, design, interface, funcionalidades, marcas, logotipos e documentação, é de propriedade exclusiva da MONT Tecnologia da Informação e está protegido por leis de propriedade intelectual.

### 8.2. Licença de Uso
A MONT concede ao Usuário uma licença limitada, não exclusiva, não transferível e revogável para utilizar o Sistema durante a vigência do contrato e conforme estes Termos.

### 8.3. Proibição de Engenharia Reversa
É expressamente vedado ao Usuário realizar engenharia reversa, descompilação, desmontagem ou qualquer tentativa de descobrir o código-fonte do Sistema.

### 8.4. Propriedade dos Dados do Usuário
Os dados inseridos ou gerados pelo Usuário no Sistema permanecem de propriedade do Usuário. A MONT não reivindica propriedade sobre os dados do Usuário, mas o Usuário concede à MONT licença para utilizar, processar e armazenar tais dados conforme necessário para fornecer o Serviço.

## 9. PROTEÇÃO DE DADOS E PRIVACIDADE

### 9.1. LGPD Compliance
O tratamento de dados pessoais realizado através do Sistema está em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).

### 9.2. Política de Privacidade
O tratamento de dados pessoais está detalhado na Política de Privacidade do Sistema, que faz parte integrante destes Termos.

### 9.3. Direitos do Titular
O Usuário possui direitos garantidos pela LGPD, incluindo confirmação da existência de tratamento, acesso aos dados, correção de dados incompletos ou desatualizados, anonimização ou eliminação de dados, portabilidade dos dados, entre outros.

### 9.4. Segurança dos Dados
A MONT adota medidas técnicas e organizacionais adequadas para proteger os dados do Usuário contra acesso não autorizado, alteração, divulgação ou destruição.

## 10. DISPONIBILIDADE E GARANTIAS

### 10.1. Serviço "Como Está"
O Sistema é fornecido "COMO ESTÁ" ("AS IS"), sem garantias expressas ou implícitas de qualquer natureza.

### 10.2. Disponibilidade
A MONT não garante disponibilidade ininterrupta ou 100% do Sistema. O Sistema pode estar temporariamente indisponível devido a:
- Manutenções programadas ou de emergência;
- Atualizações e melhorias;
- Falhas técnicas ou de infraestrutura;
- Causas de força maior;
- Ações de terceiros.

### 10.3. Manutenções
A MONT pode realizar manutenções programadas, notificando o Usuário quando possível, mas sem obrigação de notificação prévia em casos de emergência.

### 10.4. Limitação de Responsabilidade por Perda de Dados
A MONT não se responsabiliza por perda de dados decorrente de:
- Falhas do Usuário em manter backups adequados;
- Uso incorreto do Sistema;
- Ações de terceiros;
- Causas de força maior;
- Desativação da conta por período superior a 30 dias.

## 11. LIMITAÇÃO DE RESPONSABILIDADE

### 11.1. Exclusão de Danos Indiretos
A MONT NÃO SERÁ RESPONSÁVEL POR DANOS INDIRETOS, INCIDENTAIS, CONSEQUENCIAIS, LUCROS CESSANTES, PERDA DE DADOS, PERDA DE RECEITA OU OUTROS PREJUÍZOS INDIRETOS DECORRENTES DO USO OU IMPOSSIBILIDADE DE USO DO SISTEMA.

### 11.2. Limite Máximo de Responsabilidade
A responsabilidade total da MONT, em qualquer caso, está limitada ao valor pago pelo Usuário nos últimos 12 (doze) meses pelo uso do Sistema.

### 11.3. Força Maior
A MONT não será responsável por falhas ou atrasos no cumprimento de suas obrigações decorrentes de causas de força maior, incluindo desastres naturais, guerras, greves, falhas de infraestrutura de terceiros, alterações legislativas ou outras causas fora de seu controle razoável.

### 11.4. Não Responsabilidade por Terceiros
A MONT não se responsabiliza por ações, produtos, serviços ou conteúdo de terceiros, incluindo integrações com sistemas externos, APIs de terceiros ou serviços de pagamento.

## 12. INDENIZAÇÃO

O Usuário compromete-se a indenizar, defender e isentar a MONT, seus diretores, funcionários, parceiros e afiliados de quaisquer reivindicações, danos, obrigações, perdas, responsabilidades, custos ou despesas (incluindo honorários advocatícios) decorrentes de:

- Uso indevido do Sistema pelo Usuário;
- Violação destes Termos de Uso;
- Violação de direitos de terceiros;
- Problemas fiscais, tributários ou legais decorrentes do uso do Sistema;
- Dados incorretos ou fraudulentos fornecidos pelo Usuário;
- Qualquer atividade ilegal realizada através do Sistema.

## 13. RESCISÃO

### 13.1. Direito de Rescisão
Qualquer uma das partes pode rescindir este acordo a qualquer momento, mediante notificação prévia conforme condições contratuais.

### 13.2. Rescisão pela MONT
A MONT pode rescindir o acesso do Usuário imediatamente em caso de:
- Violação destes Termos;
- Não pagamento de valores devidos;
- Atividades ilegais ou fraudulentas;
- Uso que comprometa a segurança ou integridade do Sistema.

### 13.3. Efeitos da Rescisão
Com a rescisão:
- O acesso ao Sistema será imediatamente encerrado;
- O Usuário permanece responsável por todos os valores devidos até a data de rescisão;
- Os dados do Usuário serão mantidos conforme política de retenção de dados;
- Após 30 dias de desativação, os dados serão permanentemente removidos.

### 13.4. Retenção de Dados
A MONT pode reter dados do Usuário pelo período necessário para cumprimento de obrigações legais, fiscais ou contratuais.

## 14. DISPOSIÇÕES GERAIS

### 14.1. Lei Aplicável
Estes Termos são regidos pelas leis da República Federativa do Brasil.

### 14.2. Foro Competente
Fica eleito o foro da comarca de Florianópolis/SC para dirimir quaisquer controvérsias decorrentes destes Termos, renunciando as partes a qualquer outro, por mais privilegiado que seja.

### 14.3. Alterações dos Termos
A MONT reserva-se o direito de modificar estes Termos a qualquer momento. Alterações substanciais serão comunicadas aos Usuários. O uso continuado do Sistema após alterações constitui aceitação dos novos Termos.

### 14.4. Tolerância
A tolerância da MONT com relação a qualquer violação destes Termos não constitui renúncia de direitos nem impedimento para exigir o cumprimento estrito dos mesmos.

### 14.5. Divisibilidade
Se qualquer disposição destes Termos for considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor e efeito.

### 14.6. Integridade do Acordo
Estes Termos, juntamente com a Política de Privacidade e condições comerciais acordadas, constituem o acordo integral entre as partes sobre o assunto.

### 14.7. Comunicação
As comunicações entre as partes podem ser realizadas através do Sistema, e-mail cadastrado ou outros meios acordados.

## 15. CONTATO E SUPORTE

Para questões relacionadas a estes Termos, suporte técnico ou outras dúvidas, o Usuário pode entrar em contato com a MONT através dos canais disponibilizados no Sistema ou:

- **E-mail**: [e-mail de contato]
- **Telefone**: [telefone de contato]
- **WhatsApp**: 48 99848-2590

A MONT se esforça para responder às solicitações em tempo hábil, mas não garante prazos específicos de resposta.

---

**Ao aceitar estes Termos de Uso, você declara ter lido, compreendido e concordado integralmente com todas as condições aqui estabelecidas.**

**MONT Tecnologia da Informação**  
CNPJ: [CNPJ da empresa]  
Florianópolis/SC, Brasil`;

interface TermosDeUsoPageProps {
  showAcceptButtons?: boolean;
  onAccept?: () => void;
  onClose?: () => void;
}

export default function TermosDeUsoPage({ showAcceptButtons = false, onAccept, onClose }: TermosDeUsoPageProps) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await companyApi.acceptTerms({ accepted: true });
      toast.success('Termos de uso aceitos com sucesso!');
      if (onAccept) {
        onAccept();
      }
    } catch (error: any) {
      console.error('Erro ao aceitar termos:', error);
      const errorMessage = error?.response?.data?.message || 'Erro ao aceitar termos. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await companyApi.acceptTerms({ accepted: false });
      toast.error('O uso do sistema está condicionado à aceitação dos Termos de Uso.');
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao rejeitar termos:', error);
      const errorMessage = error?.response?.data?.message || 'Erro ao processar rejeição. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Processar markdown básico para HTML
  const processMarkdown = (text: string) => {
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-8 mb-4 text-primary">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      // Lists
      .replace(/^- (.*$)/gim, '<li class="ml-6 mb-2">$1</li>')
      // Paragraphs
      .replace(/\n\n/gim, '</p><p class="mb-4 leading-relaxed">')
      // Line breaks
      .replace(/\n/gim, '<br />');

    // Wrap consecutive list items
    html = html.replace(/(<li.*<\/li>(?:\s*<li.*<\/li>)*)/gim, '<ul class="list-disc mb-4 space-y-1">$1</ul>');
    
    return `<p class="mb-4 leading-relaxed">${html}</p>`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Termos de Uso do Sistema MontShop</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Última atualização: 16 de fevereiro de 2025
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <ScrollArea className="h-[calc(100vh-300px)] pr-4">
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: processMarkdown(TERMOS_CONTENT) }}
              />
            </ScrollArea>

            {showAcceptButtons && (
              <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row gap-4 justify-end">
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Rejeitar
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {loading ? 'Processando...' : 'Aceitar Termos'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
