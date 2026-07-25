'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, XCircle, CheckCircle2 } from 'lucide-react';
import { fiscalApi } from '@/lib/api-endpoints';

type TtdType = 'TTD_706' | 'TTD_707' | 'TTD_710' | 'NONE';

interface ContingencyStatus {
  contingenciaEnabled: boolean;
  ttdType: TtdType;
  ttdChangeCount: number;
  ttdChangeAllowed: boolean;
  dtecCredentialed: boolean;
  isFuelRetailer: boolean;
  termAccepted: boolean;
  pendentesCount: number;
}

/**
 * Painel de configuração do TTD (Tratamento Tributário Diferenciado)
 * conforme ATO DIAT 38/2020.
 */
export function TtdConfigPanel({ onUpdate }: { onUpdate?: () => void }) {
  const [status, setStatus] = useState<ContingencyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<TtdType>('TTD_707');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const { data } = await fiscalApi.getContingenciaStatus();
      setStatus(data);
      setSelectedType(data.ttdType === 'NONE' ? 'TTD_707' : data.ttdType);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao carregar status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleChangeTtd = async () => {
    if (!status || selectedType === status.ttdType) return;
    try {
      setSaving(true);
      setError(null);
      await fiscalApi.changeTtdType({ ttdType: selectedType as any });
      await loadStatus();
      onUpdate?.();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao mudar TTD.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>TTD (Tratamento Tributário Diferenciado)</CardTitle>
        </CardHeader>
        <CardContent>Carregando...</CardContent>
      </Card>
    );
  }

  const isCombustivel = status.isFuelRetailer;
  const canChange = status.ttdChangeAllowed && !isCombustivel;
  const isFuelLocked = status.ttdType === 'TTD_710';
  // Art. 5º — mudança é permitida APENAS entre TTD 706 e TTD 707.
  // TTD 710 não participa de mudança (é exclusivo para varejistas de
  // combustíveis — Art. 3º + 4º §3º).
  const ttdOptions = [
    {
      value: 'TTD_706',
      title: 'TTD 706 — Contingência no ECF',
      desc: 'Impressão no ECF físico. NFC-e em contingência é vedada (Art. 8º Parágrafo único).',
      // Permitido se: TTD atual é 707 (mudança 707→706) ou TTD atual é NONE
      allowedAsTarget: status.ttdType === 'TTD_707' || status.ttdType === 'NONE',
    },
    {
      value: 'TTD_707',
      title: 'TTD 707 — Contingência no PAF-NFC-e',
      desc: 'Varejistas substituindo ECF. Numeração sequencial por série/PDV (Art. 13).',
      allowedAsTarget: status.ttdType === 'TTD_706' || status.ttdType === 'NONE',
    },
    {
      value: 'TTD_710',
      title: 'TTD 710 — Combustíveis via PAF-NFC-e',
      desc: 'Obrigatório para comércio varejista de combustíveis (CNAE 4731).',
      // TTD 710 é exclusivo para combustível e não participa de mudança
      allowedAsTarget: status.ttdType === 'TTD_710' || status.ttdType === 'NONE',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>TTD — Tratamento Tributário Diferenciado (Art. 4º)</CardTitle>
        <CardDescription>
          Define o tipo de contingência. Mudança permitida apenas 1 vez e
          <strong> apenas entre TTD 706 e TTD 707</strong> (Art. 5º).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">TTD atual:</span>
          <strong>{status.ttdType}</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Mudanças usadas:</span>
          <strong>{status.ttdChangeCount}/1</strong>
        </div>

        {isCombustivel && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Comércio varejista de combustíveis — TTD 710 é obrigatório (Art. 3º).
            </AlertDescription>
          </Alert>
        )}

        {isFuelLocked && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              TTD 710 é exclusivo para varejistas de combustíveis e não
              participa de mudança (Art. 5º do ATO DIAT 38/2020).
            </AlertDescription>
          </Alert>
        )}

        {!status.ttdChangeAllowed && !isCombustivel && !isFuelLocked && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Limite de mudança de TTD atingido (Art. 5º). Contate o suporte.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {ttdOptions.map((opt) => {
            const isDisabled = !canChange || !opt.allowedAsTarget;
            return (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 border rounded ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="ttd"
                  value={opt.value}
                  checked={selectedType === opt.value}
                  onChange={() => setSelectedType(opt.value as TtdType)}
                  disabled={isDisabled}
                  className="mt-1"
                />
                <div className="flex-1">
                  <strong className="block">{opt.title}</strong>
                  <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                  {isDisabled && !isCombustivel && !isFuelLocked && opt.value !== status.ttdType && (
                    <p className="text-xs text-red-500 mt-1">
                      {opt.value === 'TTD_710'
                        ? 'TTD 710 não participa de mudança (Art. 5º)'
                        : `Transição ${status.ttdType} → ${opt.value} não permitida`}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {selectedType !== status.ttdType && canChange && selectedType !== 'TTD_710' && status.ttdType !== 'TTD_710' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> mudança de TTD é permitida apenas 1 vez
              e <strong>apenas entre TTD 706 e TTD 707</strong> (Art. 5º).
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleChangeTtd}
          disabled={!canChange || selectedType === status.ttdType || saving || (selectedType === 'TTD_710' && !isCombustivel)}
          className="w-full"
        >
          {saving ? 'Salvando...' : <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar TTD {selectedType}</>}
        </Button>
      </CardContent>
    </Card>
  );
}