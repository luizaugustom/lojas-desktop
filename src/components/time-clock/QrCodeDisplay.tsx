'use client';

import { Printer, RefreshCw, Download, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useRegenerateQr,
  useTimeClockConfig,
  useTimeClockQrCode,
  useUpdateTimeClockConfig,
} from '@/hooks/useTimeClock';

export function QrCodeDisplay() {
  const { data, isLoading } = useTimeClockQrCode(true);
  const { data: config, isLoading: loadingConfig } = useTimeClockConfig();
  const update = useUpdateTimeClockConfig();
  const regen = useRegenerateQr();
  const requireQr = !!config?.requireQrCode;

  const handleToggleQr = (checked: boolean) => {
    update.mutate({ requireQrCode: checked });
  };

  const handlePrint = () => {
    if (!data?.dataUrl) return;
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>QR Code - Ponto Eletrônico</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin-bottom: 8px; }
            p { font-size: 12px; color: #555; margin: 4px 0 16px; }
            img { max-width: 360px; border: 1px solid #ddd; padding: 8px; }
            .footer { margin-top: 16px; font-size: 10px; color: #888; }
          </style>
        </head>
        <body>
          <h1>Bata seu ponto por aqui</h1>
          <p>Aponte a câmera do aplicativo para este QR Code</p>
          <img src="${data.dataUrl}" alt="QR Code" />
          <p class="footer">QR Code único desta loja. Não compartilhe.</p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const handleDownload = () => {
    if (!data?.dataUrl) return;
    const a = document.createElement('a');
    a.href = data.dataUrl;
    a.download = 'qr-code-ponto.png';
    a.click();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Leitura do QR Code
          </CardTitle>
          <CardDescription>
            Quando ativo, o vendedor precisa ler o QR Code da loja para bater o ponto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingConfig ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">
                  {requireQr ? 'QR Code obrigatório' : 'QR Code opcional'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {requireQr
                    ? 'O ponto só é registrado após a leitura do QR gerado pela empresa.'
                    : 'O vendedor pode bater o ponto só com a localização, sem ler o QR.'}
                </p>
              </div>
              <Switch
                checked={requireQr}
                onCheckedChange={handleToggleQr}
                disabled={update.isPending}
                aria-label="Exigir leitura do QR Code para bater ponto"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QR Code da loja</CardTitle>
          <CardDescription>
            Imprima e cole em local visível para os funcionários.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {isLoading ? (
            <Skeleton className="h-64 w-64" />
          ) : data?.dataUrl ? (
            <div className="p-3 bg-white border rounded">
              <img
                src={data.dataUrl}
                alt="QR Code do ponto"
                className="h-64 w-64"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Configure primeiro a localização da loja.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrint} disabled={!data?.dataUrl}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!data?.dataUrl}
            >
              <Download className="h-4 w-4 mr-1" />
              Baixar PNG
            </Button>
            <Button
              variant="outline"
              onClick={() => regen.mutate()}
              disabled={regen.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${regen.isPending ? 'animate-spin' : ''}`}
              />
              Rotacionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
