'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldCheck, ShieldX, AlertTriangle } from 'lucide-react';
import { fiscalApi } from '@/lib/api-endpoints';

interface DtecStatus {
  dtecCredentialed: boolean;
  dtecCredentialedAt?: string;
  dtecCredentialExpiresAt?: string;
  dtecCredentialProtocol?: string;
  isExpired: boolean;
  daysToExpire?: number | null;
  valid: boolean;
}

/**
 * Card de status do credenciamento DTEC (Art. 2º do ATO DIAT 38/2020).
 *
 * Permite visualizar o status atual e registrar um novo credenciamento.
 */
export function DtecStatusCard({ onUpdate }: { onUpdate?: () => void }) {
  const [status, setStatus] = useState<DtecStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const { data } = await fiscalApi.getDtecStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao carregar status DTEC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleCredential = async () => {
    try {
      setSaving(true);
      setError(null);
      await fiscalApi.registrarDtecCredential({ protocol, expiresAt });
      setProtocol('');
      setExpiresAt('');
      await loadStatus();
      onUpdate?.();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao registrar credenciamento.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Credenciamento DTEC
          </CardTitle>
        </CardHeader>
        <CardContent>Carregando...</CardContent>
      </Card>
    );
  }

  const Icon = status?.valid ? ShieldCheck : status?.isExpired ? ShieldX : Shield;
  const iconColor = status?.valid
    ? 'text-green-600'
    : status?.isExpired
    ? 'text-red-600'
    : 'text-gray-400';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          Credenciamento DTEC (Art. 2º)
        </CardTitle>
        <CardDescription>
          Obrigatório para emissão de NFC-e em contingência.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.valid && (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Credenciado em {new Date(status.dtecCredentialedAt!).toLocaleDateString('pt-BR')}.
              {' '}Protocolo: <strong>{status.dtecCredentialProtocol}</strong>.
              {' '}Expira em {status.daysToExpire} dia(s).
            </AlertDescription>
          </Alert>
        )}

        {status?.isExpired && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Credenciamento DTEC vencido. Renove para continuar emitindo NFC-e em contingência.
            </AlertDescription>
          </Alert>
        )}

        {!status?.dtecCredentialed && (
          <Alert variant="destructive">
            <ShieldX className="h-4 w-4" />
            <AlertDescription>
              Empresa não credenciada no DTEC. Realize o credenciamento junto à SEFAZ-SC.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="protocol">Protocolo DTEC</Label>
            <Input
              id="protocol"
              placeholder="DTEC-2025-000123"
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="expiresAt">Data de expiração</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleCredential}
          disabled={saving || !protocol || !expiresAt}
          className="w-full"
        >
          {saving ? 'Salvando...' : status?.valid ? 'Renovar credenciamento' : 'Registrar credenciamento'}
        </Button>
      </CardContent>
    </Card>
  );
}
