'use client';

/**
 * CredentialingWizard — Wizard de credenciamento inicial NFC-e.
 *
 * ATO DIAT 38/2020:
 *   - Art. 2º: credenciamento no DTEC
 *   - Art. 4º §1º: escolha de TTD 706 (ECF) ou 707 (PAF-NFC-e) na credenciação
 *   - Anexos I/II: aceite do Termo de Compromisso
 *
 * Dispara automaticamente quando a empresa ainda não:
 *   - Está credenciada no DTEC (dtecCredentialed === false), ou
 *   - Escolheu TTD (nfcContingencyType ausente), ou
 *   - Aceitou o Termo de Compromisso (termAccepted === false)
 *
 * Bloqueia a emissão de NFC-e até a conclusão completa.
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  FileSignature,
  Cog,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fiscalApi } from '@/lib/api-endpoints';

interface CredentialingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback ao concluir todas as etapas. */
  onCompleted?: () => void;
}

type Step = 'dtec' | 'ttd' | 'termo';

interface StatusFiscal {
  dtecCredentialed: boolean;
  dtecCredentialedAt?: string;
  dtecCredentialExpiresAt?: string;
  dtecCredentialProtocol?: string;
  nfcContingencyType?: string;
  ttdChangeAllowed?: boolean;
  termAccepted?: boolean;
}

export function CredentialingWizard({
  open,
  onOpenChange,
  onCompleted,
}: CredentialingWizardProps) {
  const [step, setStep] = useState<Step>('dtec');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusFiscal | null>(null);

  // DTEC
  const [dtecProtocol, setDtecProtocol] = useState('');
  const [dtecExpiresAt, setDtecExpiresAt] = useState('');

  // TTD
  const [selectedTtd, setSelectedTtd] = useState<'TTD_706' | 'TTD_707' | ''>('');

  // Termo
  const [termoType, setTermoType] = useState<'TTD_706' | 'TTD_707' | 'TTD_710' | 'ALL'>('TTD_707');
  const [termoAccepted, setTermoAccepted] = useState(false);

  // Carregar status fiscal ao abrir
  useEffect(() => {
    if (open) {
      loadStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Avançar para a próxima etapa automaticamente quando a anterior for concluída
  useEffect(() => {
    if (!status) return;
    if (step === 'dtec' && status.dtecCredentialed) {
      setStep('ttd');
    } else if (step === 'ttd' && status.nfcContingencyType) {
      setStep('termo');
    } else if (step === 'termo' && status.termAccepted) {
      onCompleted?.();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [dtecRes, contingenciaRes, termosRes] = await Promise.allSettled([
        fiscalApi.getDtecStatus(),
        fiscalApi.getContingenciaStatus(),
        fiscalApi.listarTermosCompromisso(),
      ]);

      const dtec = dtecRes.status === 'fulfilled' ? dtecRes.value?.data : null;
      const contingencia =
        contingenciaRes.status === 'fulfilled' ? contingenciaRes.value?.data : null;
      const termos =
        termosRes.status === 'fulfilled' ? termosRes.value?.data : null;

      const termAccepted =
        Array.isArray(termos) &&
        termos.some((t: any) => t.accepted === true && t.type !== null);

      const nextStatus: StatusFiscal = {
        dtecCredentialed: !!dtec?.credentialed,
        dtecCredentialedAt: dtec?.credentialedAt,
        dtecCredentialExpiresAt: dtec?.credentialExpiresAt,
        dtecCredentialProtocol: dtec?.protocol,
        nfcContingencyType: contingencia?.ttdType || contingencia?.nfcContingencyType,
        ttdChangeAllowed: contingencia?.ttdChangeAllowed,
        termAccepted,
      };
      setStatus(nextStatus);

      // Pré-preencher campos se já houver escolha
      if (nextStatus.nfcContingencyType) {
        setSelectedTtd(nextStatus.nfcContingencyType as any);
      }
      if (dtecProtocol === '' && dtec?.protocol) setDtecProtocol(dtec.protocol);
    } catch (error) {
      console.error('Erro ao carregar status fiscal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDtec = async () => {
    if (!dtecProtocol || !dtecExpiresAt) {
      toast.error('Informe o protocolo DTEC e a data de expiração.');
      return;
    }
    setLoading(true);
    try {
      await fiscalApi.registrarDtecCredential({
        protocol: dtecProtocol,
        expiresAt: dtecExpiresAt,
      });
      toast.success('Credenciamento DTEC registrado.');
      await loadStatus();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao registrar credenciamento DTEC.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTtd = async () => {
    if (!selectedTtd) {
      toast.error('Selecione o tipo de TTD.');
      return;
    }
    setLoading(true);
    try {
      // Se ainda não escolheu TTD, "entrar em contingência" com o TTD faz
      // a escolha inicial (Art. 4º §1º). Se já existe e quer trocar, vai usar
      // changeTtdType, mas respeitando o limite de Art. 5º.
      if (!status?.nfcContingencyType) {
        await fiscalApi.ativarContingencia({
          ttdType: selectedTtd,
          motivo: 'Credenciamento inicial — ATO DIAT 38/2020 Art. 4º §1º',
        });
      } else if (status.nfcContingencyType !== selectedTtd) {
        if (!status.ttdChangeAllowed) {
          toast.error('Mudança de TTD não permitida (Art. 5º — apenas uma troca).');
          return;
        }
        await fiscalApi.changeTtdType({ ttdType: selectedTtd });
      }
      toast.success(`TTD ${selectedTtd} configurado.`);
      await loadStatus();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao configurar TTD.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTermo = async () => {
    if (!termoAccepted) {
      toast.error('Você precisa marcar que leu e aceita o termo.');
      return;
    }
    setLoading(true);
    try {
      await fiscalApi.aceitarTermoCompromisso({ type: termoType });
      toast.success('Termo de Compromisso aceito.');
      await loadStatus();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao aceitar termo.');
    } finally {
      setLoading(false);
    }
  };

  const stepsConfig: Array<{
    id: Step;
    label: string;
    icon: any;
    completed: boolean;
  }> = [
    {
      id: 'dtec',
      label: 'Credenciamento DTEC',
      icon: Building2,
      completed: !!status?.dtecCredentialed,
    },
    {
      id: 'ttd',
      label: 'Escolha de TTD',
      icon: Cog,
      completed: !!status?.nfcContingencyType,
    },
    {
      id: 'termo',
      label: 'Termo de Compromisso',
      icon: FileSignature,
      completed: !!status?.termAccepted,
    },
  ];

  const currentStepIndex = stepsConfig.findIndex((s) => s.id === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Credenciamento Inicial — NFC-e
          </DialogTitle>
          <DialogDescription>
            ATO DIAT 38/2020 — Art. 2º, Art. 4º §1º e Anexos I/II. Conclua as etapas para
            habilitar a emissão de NFC-e.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper visual */}
        <ol className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
          {stepsConfig.map((s, idx) => {
            const Icon = s.icon;
            const isCurrent = s.id === step;
            return (
              <li key={s.id} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    s.completed
                      ? 'border-green-600 bg-green-100 text-green-700'
                      : isCurrent
                      ? 'border-blue-600 bg-blue-100 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {s.completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium leading-tight">{s.label}</p>
                  {s.completed && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      Concluído
                    </Badge>
                  )}
                </div>
                {idx < stepsConfig.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </li>
            );
          })}
        </ol>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando...
          </div>
        )}

        {/* Etapa 1 — DTEC */}
        {step === 'dtec' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Credenciamento DTEC</CardTitle>
              <CardDescription>
                Art. 2º — Somente credenciados no DTEC podem emitir NFC-e.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {status?.dtecCredentialed ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Já credenciado</AlertTitle>
                  <AlertDescription>
                    Protocolo {status.dtecCredentialProtocol} — expira em{' '}
                    {status.dtecCredentialExpiresAt
                      ? new Date(status.dtecCredentialExpiresAt).toLocaleDateString('pt-BR')
                      : '—'}
                    .
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="dtecProtocol">Protocolo DTEC</Label>
                    <Input
                      id="dtecProtocol"
                      value={dtecProtocol}
                      onChange={(e) => setDtecProtocol(e.target.value)}
                      placeholder="DTEC-2025-000123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dtecExpiresAt">Data de expiração</Label>
                    <Input
                      id="dtecExpiresAt"
                      type="date"
                      value={dtecExpiresAt}
                      onChange={(e) => setDtecExpiresAt(e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Etapa 2 — TTD */}
        {step === 'ttd' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Escolha do TTD</CardTitle>
              <CardDescription>
                Art. 4º §1º — Escolha inicial entre ECF (TTD 706) e PAF-NFC-e (TTD 707).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Você poderá trocar o TTD uma única vez (Art. 5º).
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 gap-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                    selectedTtd === 'TTD_706' ? 'border-blue-600 bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="ttd"
                    value="TTD_706"
                    checked={selectedTtd === 'TTD_706'}
                    onChange={() => setSelectedTtd('TTD_706')}
                    className="mt-1"
                    disabled={!!status?.nfcContingencyType && !status?.ttdChangeAllowed}
                  />
                  <div>
                    <p className="font-semibold">TTD 706 — Emissão com ECF em contingência</p>
                    <p className="text-xs text-muted-foreground">
                      Cupom Fiscal impresso pelo próprio ECF. Vantagem: alta disponibilidade.
                    </p>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                    selectedTtd === 'TTD_707' ? 'border-blue-600 bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="ttd"
                    value="TTD_707"
                    checked={selectedTtd === 'TTD_707'}
                    onChange={() => setSelectedTtd('TTD_707')}
                    className="mt-1"
                    disabled={!!status?.nfcContingencyType && !status?.ttdChangeAllowed}
                  />
                  <div>
                    <p className="font-semibold">TTD 707 — Emissão por PAF-NFC-e em contingência</p>
                    <p className="text-xs text-muted-foreground">
                      Aplicativo PAF-NFC-e transmite a NFC-e autorizada pela SEFAZ.
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Etapa 3 — Termo */}
        {step === 'termo' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Termo de Compromisso</CardTitle>
              <CardDescription>
                Anexos I e II do ATO DIAT 38/2020 — Aceite obrigatório com hash de auditoria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await fiscalApi.getTermoCompromissoPdf(termoType);
                    const blob = new Blob([res.data], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  } catch {
                    /* silencioso */
                  }
                }}
              >
                Baixar PDF do Termo
              </Button>

              <div className="space-y-2">
                <Label>Tipo do termo</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={termoType}
                  onChange={(e) => setTermoType(e.target.value as any)}
                >
                  <option value="TTD_706">TTD 706 — ECF</option>
                  <option value="TTD_707">TTD 707 — PAF-NFC-e</option>
                  <option value="TTD_710">TTD 710 — Combustíveis</option>
                  <option value="ALL">Todos</option>
                </select>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={termoAccepted}
                  onChange={(e) => setTermoAccepted(e.target.checked)}
                  className="mt-1"
                />
                Li, compreendi e aceito os termos do ATO DIAT 38/2020.
              </label>
            </CardContent>
          </Card>
        )}

        <DialogFooter className="flex justify-between gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => {
              const prev = stepsConfig[currentStepIndex - 1];
              if (prev) setStep(prev.id);
            }}
            disabled={currentStepIndex === 0 || loading}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>

          {step === 'dtec' && (
            <Button onClick={handleSubmitDtec} disabled={loading}>
              {status?.dtecCredentialed ? 'Avançar' : 'Registrar credenciamento'}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 'ttd' && (
            <Button onClick={handleSubmitTtd} disabled={loading || !selectedTtd}>
              Confirmar TTD
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 'termo' && (
            <Button onClick={handleAcceptTermo} disabled={loading || !termoAccepted}>
              Aceitar e Concluir
              <CheckCircle2 className="ml-1 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CredentialingWizard;