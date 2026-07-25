import { useEffect } from 'react';
import { useTimeClockTab } from '../../contexts/TimeClockTabContext';

/**
 * Deep link legada — redireciona para a aba "Histórico Geral" do Ponto Eletrônico.
 */
export default function TimeClockManagePage() {
  const { setTab } = useTimeClockTab();

  useEffect(() => {
    setTab('manage');
    window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'time-clock' } }));
  }, [setTab]);

  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      Abrindo Gestão de Ponto...
    </div>
  );
}
