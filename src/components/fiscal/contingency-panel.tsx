'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Power, PowerOff, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { fiscalApi } from '@/lib/api-endpoints';
import { TermoCompromissoModal } from './termo-compromisso-modal';

interface ContingencyStatus {
  contingenciaEnabled: boolean;
  contingenciaInicio?: string;
  contingenciaMotivo?: string;
  ttdType: string;
  ttdChangeCount: number;
  ttdChangeAllowed: boolean;
  dtecCredentialed: boolean;
  isFuelRetailer: boolean;
  termAccepted: boolean;
  pendentesCount: number;
}

/**
 * Painel principal de contingência NFC-e (ATO DIAT 38/2020).
 *
 * Mostra o status atual, permite ativar/desativar contingência e
 * dispara sincronização com a SEFAZ (FocusNFE).
 */
export function ContingencyPanel() {
  const [status, setStatus] = useState<ContingencyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [termoModalOpen, setTermoModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [ttdType, setTtdType] = useState<'TTD_706' | 'TTD_707' | 'TTD_710'>('TTD_707');
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const { data } = await fiscalApi.getContingenciaStatus();
      setStatus(data);
      if (data.ttdType !== 'NONE') setTtdType(data.ttdType as any);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao carregar status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [refreshKey]);

  const handleAtivar = async () => {
    try {
      setError(null);
      await fiscalApi.ativarContingencia({
        motivo: motivo || 'Indisponibilidade do ambiente de autorização',
        ttdType,
      } as any);
      setMotivo('');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao ativar contingência.');
    }
  };

  const handleDesativar = async () => {
    try {
      setError(null);
      await fiscalApi.desativarContingencia();
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao desativar contingência.');
    }
  };

  const handleSincronizar = async () => {
    try {
      setSyncing(true);
      setError(null);
      await fiscalApi.sincronizarTodasContingencias();
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao sincronizar.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contingência NFC-e</CardTitle>
        </CardHeader>
        <CardContent>Carregando...</CardContent>
      </Card>
    );
  }

  const isTtd706 = status.ttdType === 'TTD_706';
  const canActivate =
    !status.contingenciaEnabled &&
    status.dtecCredentialed &&
    status.termAccepted &&
    (status.ttdType !== 'TTD_706' || status.isFuelRetailer);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Contingência NFC-e — ATO DIAT 38/2020
              </CardTitle>
              <CardDescription>
                Emissão offline de NFC-e em caso de indisponibilidade da SEFAZ.
              </CardDescription>
            </div>
            {status.contingenciaEnabled ? (
              <Badge variant="destructive">Ativa</Badge>
            ) : (
              <Badge variant="outline">Inativa</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status.dtecCredentialed && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Empresa não credenciada no DTEC (Art. 2º). Configure em Configurações.
              </AlertDescription>
            </Alert>
          )}

          {!status.termAccepted && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Termo de Compromisso não aceito (Anexos I/II).{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => setTermoModalOpen(true)}
                >
                  Aceitar agora
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {status.contingenciaEnabled && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Ativada em {new Date(status.contingenciaInicio!).toLocaleString('pt-BR')}.
                {status.contingenciaMotivo && (
                  <>
                    {' '}Motivo: <em>{status.contingenciaMotivo}</em>
                  </>
                )}
                {status.pendentesCount > 0 && (
                  <div className="mt-1">
                    <strong>{status.pendentesCount}</strong> NFC-e pendente(s) de sincronização.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isTtd706 && status.contingenciaEnabled && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>TTD 706 ativo</strong> — emissão de NFC-e em contingência é vedada (Art. 8º
                Parágrafo único). Use o ECF físico.
              </AlertDescription>
            </Alert>
          )}

          {!status.contingenciaEnabled && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Motivo (tipificado pelo ATO DIAT 38/2020)</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded bg-background"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                >
                  <option value="">Selecione um motivo…</option>
                  <option value="SEFAZ indisponível (sem resposta da SEFAZ)">
                    SEFAZ indisponível (sem resposta da SEFAZ)
                  </option>
                  <option value="Falha de internet / link de comunicação">
                    Falha de internet / link de comunicação
                  </option>
                  <option value="Falha no certificado digital A1">
                    Falha no certificado digital A1
                  </option>
                  <option value="Timeout do Focus NFe">Timeout do Focus NFe</option>
                  <option value="Erro genérico do Focus NFe">Erro genérico do Focus NFe</option>
                  <option value="Manutenção programada">Manutenção programada</option>
                  <option value="OUTRO">Outro (descrever)</option>
                </select>
                {motivo === 'OUTRO' && (
                  <input
                    className="w-full mt-2 px-3 py-2 border rounded"
                    placeholder="Descreva o motivo"
                    onChange={(e) => setMotivo(`Outro: ${e.target.value}`)}
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Tipo de TTD</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded"
                  value={ttdType}
                  onChange={(e) => setTtdType(e.target.value as any)}
                  disabled={status.isFuelRetailer}
                >
                  <option value="TTD_706">TTD 706 (ECF)</option>
                  <option value="TTD_707">TTD 707 (PAF-NFC-e)</option>
                  {status.isFuelRetailer && (
                    <option value="TTD_710">TTD 710 (Combustíveis — obrigatório)</option>
                  )}
                </select>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {!status.contingenciaEnabled ? (
              <Button onClick={handleAtivar} disabled={!canActivate} className="flex-1">
                <Power className="mr-2 h-4 w-4" />
                Ativar contingência
              </Button>
            ) : (
              <>
                <Button onClick={handleDesativar} variant="outline" className="flex-1">
                  <PowerOff className="mr-2 h-4 w-4" />
                  Desativar
                </Button>
                {status.pendentesCount > 0 && (
                  <Button onClick={handleSincronizar} disabled={syncing} className="flex-1">
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar ({status.pendentesCount})
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <TermoCompromissoModal
        open={termoModalOpen}
        onClose={() => {
          setTermoModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
        onAccepted={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}