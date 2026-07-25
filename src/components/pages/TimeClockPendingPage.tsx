import { useEffect } from 'react';
import { useTimeClockTab } from '../../contexts/TimeClockTabContext';

/**
 * Deep link legada — redireciona para a aba "Pendentes" do Ponto Eletrônico.
 */
export default function TimeClockPendingPage() {
  const { setTab } = useTimeClockTab();

  useEffect(() => {
    setTab('pending');
    window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'time-clock' } }));
  }, [setTab]);

  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      Abrindo Pontos Pendentes...
    </div>
  );
}
