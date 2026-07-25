'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, Loader2 } from 'lucide-react';
import { fiscalApi } from '@/lib/api-endpoints';
import { api } from '@/lib/apiClient';

/**
 * Consulta e exportação do Bloco X — Art. 19 §único (ATO DIAT 38/2020).
 */
export function BlocoXPanel() {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = new Date();
  inicioMes.setDate(1);

  const [inicio, setInicio] = useState(inicioMes.toISOString().slice(0, 10));
  const [fim, setFim] = useState(hoje);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ totalRegistros: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consultar = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fiscalApi.gerarBlocoX(inicio, fim);
      setPreview({ totalRegistros: response.data?.totalRegistros ?? 0 });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao consultar Bloco X.');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const download = async (formato: 'txt' | 'xml') => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/fiscal/contingencia/bloco-x', {
        params: { inicio, fim, formato },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: formato === 'xml' ? 'application/xml' : 'text/plain',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bloco-x-${inicio}-${fim}.${formato}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? `Erro ao exportar Bloco X (${formato}).`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Bloco X — Operações em contingência
        </CardTitle>
        <CardDescription>
          Art. 19 §único do ATO DIAT 38/2020. Exporte o relatório de NFC-e emitidas em contingência no período.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bloco-x-inicio">Data início</Label>
            <Input
              id="bloco-x-inicio"
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bloco-x-fim">Data fim</Label>
            <Input id="bloco-x-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {preview && (
          <p className="text-sm text-muted-foreground">
            {preview.totalRegistros} registro(s) de NFC-e em contingência no período.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={consultar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Consultar
          </Button>
          <Button type="button" variant="secondary" onClick={() => download('txt')} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Exportar TXT
          </Button>
          <Button type="button" variant="secondary" onClick={() => download('xml')} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Exportar XML
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
