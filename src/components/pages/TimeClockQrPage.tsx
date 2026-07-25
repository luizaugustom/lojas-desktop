import { useEffect } from 'react';

/**
 * Deep link legado — redireciona para Configurações > Ponto Eletrônico (QR).
 */
export default function TimeClockQrPage() {
  useEffect(() => {
    try {
      sessionStorage.setItem('settings-ponto-section', 'qr');
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'settings/ponto' } }));
  }, []);

  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      Abrindo QR da Loja...
    </div>
  );
}
