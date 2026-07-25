'use client';

import { useState } from 'react';
import { ScanLine, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Props {
  onScan: (token: string) => void;
  onClose?: () => void;
  containerId?: string;
  className?: string;
}

/**
 * Versão simplificada para o desktop (sem câmera).
 * Aceita o token do QR colado/digitado manualmente.
 */
export function QrScanner({ onScan, onClose, className }: Props) {
  const [token, setToken] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = () => {
    if (token.trim().length < 5) return;
    setSuccess(true);
    onScan(token.trim());
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            <span className="text-sm font-medium">QR Code da Loja</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {success ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Token enviado!
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Cole ou digite o token do QR Code exibido na loja.
            </p>
            <div className="space-y-2">
              <Label htmlFor="qr-token" className="text-xs">
                Token
              </Label>
              <Input
                id="qr-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                autoFocus
              />
            </div>
            <Button onClick={submit} disabled={token.trim().length < 5} className="w-full">
              Confirmar token
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
