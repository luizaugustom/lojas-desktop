import { Scale as ScaleIcon, Usb, Wifi, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { FeatureCard, StepItem, TipItem, TroubleshootItem, type PageHelpTab } from '../page-help-modal';

const STAGGER = 50;

export const devicesHelpTitle = 'Central de Ajuda - Dispositivos';
export const devicesHelpDescription = 'Gerencie balanças: descoberta, instalação de drivers e uso no PDV.';
export const devicesHelpIcon = <ScaleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />;

export function getDevicesHelpTabs(): PageHelpTab[] {
  return [
    {
      value: 'overview',
      label: 'Visão Geral',
      content: (
        <div className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20">
            <CardHeader>
              <CardTitle className="text-xl">Dispositivos</CardTitle>
              <CardDescription>Balanças e outros dispositivos. Conecte balanças para pesar produtos no PDV (etiquetas de peso/preço).</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard icon={<ScaleIcon className="h-5 w-5 text-green-500" />} title="Balanças" description="Lista de balanças do sistema e balanças já cadastradas no banco. Descubra e instale drivers." badge="Principal" delay={0 * STAGGER} />
            <FeatureCard icon={<Usb className="h-5 w-5 text-blue-500" />} title="Descoberta" description="O sistema pode descobrir balanças conectadas via USB ou rede (conforme driver)." delay={1 * STAGGER} />
            <FeatureCard icon={<CheckCircle2 className="h-5 w-5 text-purple-500" />} title="Instalação" description="Instale o driver da balança para que o PDV reconheça as etiquetas (código de barras com peso/preço)." delay={2 * STAGGER} />
            <FeatureCard icon={<Wifi className="h-5 w-5 text-amber-500" />} title="Uso no PDV" description="Na página de Vendas, ao escanear etiqueta de balança, o produto e a quantidade (peso ou valor) são preenchidos automaticamente." delay={3 * STAGGER} />
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
            <CardHeader><CardTitle>Conectar uma balança</CardTitle><CardDescription>Conecte via USB ou rede e instale o driver.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StepItem number={1} text="Conecte a balança ao computador (USB ou rede, conforme modelo)." />
              <StepItem number={2} text="Na aba Balanças, use a opção de descoberta para listar dispositivos encontrados." />
              <StepItem number={3} text="Selecione a balança e instale o driver (se disponível). Após isso, as etiquetas poderão ser lidas no PDV." />
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
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Problemas comuns</CardTitle></CardHeader>
            <CardContent>
              <TroubleshootItem problem="Balança não aparece na descoberta" solution="Verifique se o cabo/rede está conectado e se o driver do fabricante está instalado no sistema operacional." />
              <TroubleshootItem problem="Etiqueta lida no PDV não reconhecida" solution="O código de barras da etiqueta deve seguir o padrão suportado (ex.: EAN-13 com peso ou preço). O produto deve estar cadastrado com o código interno correspondente." />
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
}
