import { useEffect } from 'react';
import { useTimeClockTab } from '../../contexts/TimeClockTabContext';

/**
 * Deep link legada — redireciona para a aba "Histórico" do Ponto Eletrônico.
 */
export default function TimeClockHistoryPage() {
  const { setTab } = useTimeClockTab();

  useEffect(() => {
    setTab('history');
    window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'time-clock' } }));
  }, [setTab]);

  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      Abrindo Histórico de Ponto...
    </div>
  );
}
