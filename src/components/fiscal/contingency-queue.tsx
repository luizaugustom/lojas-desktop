'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, FileText } from 'lucide-react';
import { fiscalApi } from '@/lib/api-endpoints';

interface PendingDoc {
  id: string;
  documentNumber: string;
  accessKey?: string;
  emissionDate: string;
  nfcContingencyType?: string;
  nfcContingencySeries?: string;
  nfcContingencyNumber?: number;
  pdvCode?: string;
  totalValue: number | string;
  syncAttempts: number;
  syncLastError?: string;
}

/**
 * Fila de NFC-e contingenciais pendentes de sincronização com a SEFAZ.
 */
export function ContingencyQueue() {
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await fiscalApi.listarContingenciaPendentes();
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSync = async (id: string) => {
    try {
      setSyncingId(id);
      await fiscalApi.sincronizarContingencia(id);
      await load();
    } catch {
      // silencioso
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Fila de sincronização</span>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>NFC-e em contingência aguardando autorização da SEFAZ.</CardDescription>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum documento pendente.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="border rounded p-3 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <strong className="text-sm">{d.documentNumber}</strong>
                    {d.nfcContingencyType && (
                      <Badge variant="outline">{d.nfcContingencyType}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(d.emissionDate).toLocaleString('pt-BR')} • R${' '}
                    {Number(d.totalValue).toFixed(2)}
                  </div>
                  {d.syncAttempts > 0 && (
                    <div className="text-xs text-red-600">
                      {d.syncAttempts} tentativa(s){d.syncLastError ? ` — ${d.syncLastError}` : ''}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSync(d.id)}
                  disabled={syncingId === d.id}
                >
                  {syncingId === d.id ? 'Enviando...' : 'Sincronizar'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}