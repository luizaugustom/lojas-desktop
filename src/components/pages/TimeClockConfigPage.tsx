import { useEffect } from 'react';

/**
 * Deep link legado — redireciona para Configurações > Ponto Eletrônico.
 */
export default function TimeClockConfigPage() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'settings/ponto' } }));
  }, []);

  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      Abrindo Configuração de Ponto...
    </div>
  );
}
