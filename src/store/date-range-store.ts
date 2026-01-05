import { create } from 'zustand';

interface DateRangeState {
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  setDateRange: (startDate: Date | null, endDate: Date | null) => void;
  resetToDefault: () => void;
  clearDateRange: () => void;
}

const STORAGE_KEY = 'global-date-range';

const getDefaultDateRange = (): { startDate: Date; endDate: Date } => {
  const now = new Date();
  
  // Data final: último dia do ano atual (31/12, 23:59:59)
  const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  
  // Data inicial: 3 meses atrás (primeiro dia do mês, 00:00:00)
  const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
  
  return { startDate, endDate };
};

const loadFromStorage = (): { startDate: Date | null; endDate: Date | null; isActive: boolean } | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return {
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      isActive: parsed.isActive ?? false,
    };
  } catch {
    return null;
  }
};

const saveToStorage = (state: { startDate: Date | null; endDate: Date | null; isActive: boolean }) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      startDate: state.startDate?.toISOString() ?? null,
      endDate: state.endDate?.toISOString() ?? null,
      isActive: state.isActive,
    }));
  } catch {
    // Ignora erros de localStorage
  }
};

const stored = loadFromStorage();
const defaultRange = getDefaultDateRange();

export const useDateRangeStore = create<DateRangeState>((set) => ({
  startDate: stored?.startDate ?? defaultRange.startDate,
  endDate: stored?.endDate ?? defaultRange.endDate,
  isActive: stored?.isActive ?? true,
  
  setDateRange: (startDate, endDate) => {
    const newState = {
      startDate,
      endDate,
      isActive: startDate !== null && endDate !== null,
    };
    set(newState);
    saveToStorage(newState);
  },
  
  resetToDefault: () => {
    const defaultRange = getDefaultDateRange();
    const newState = {
      startDate: defaultRange.startDate,
      endDate: defaultRange.endDate,
      isActive: true,
    };
    set(newState);
    saveToStorage(newState);
  },
  
  clearDateRange: () => {
    const newState = {
      startDate: null,
      endDate: null,
      isActive: false,
    };
    set(newState);
    saveToStorage(newState);
  },
}));

