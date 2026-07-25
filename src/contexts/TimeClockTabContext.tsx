import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type TimeClockTab = 'punch' | 'history' | 'pending' | 'manage';

interface TimeClockTabContextValue {
  tab: TimeClockTab;
  setTab: (tab: TimeClockTab) => void;
}

const TimeClockTabContext = createContext<TimeClockTabContextValue | undefined>(undefined);

export function TimeClockTabProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<TimeClockTab>('punch');
  const setTab = useCallback((next: TimeClockTab) => setTabState(next), []);
  return (
    <TimeClockTabContext.Provider value={{ tab, setTab }}>
      {children}
    </TimeClockTabContext.Provider>
  );
}

export function useTimeClockTab() {
  const ctx = useContext(TimeClockTabContext);
  if (!ctx) {
    throw new Error('useTimeClockTab must be used within TimeClockTabProvider');
  }
  return ctx;
}
