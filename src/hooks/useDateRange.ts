import { useMemo } from 'react';
import { useDateRangeStore } from '@/store/date-range-store';

export function useDateRange() {
  const { startDate, endDate, isActive } = useDateRangeStore();
  
  const queryParams = useMemo(() => {
    if (!isActive || !startDate || !endDate) {
      return {};
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [isActive, startDate, endDate]);
  
  const queryKeyPart = useMemo(() => {
    if (!isActive || !startDate || !endDate) {
      return 'no-date-filter';
    }
    
    // Usa apenas a data (sem hora) para o cache key, para evitar invalidações desnecessárias
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    return `date-${startStr}-${endStr}`;
  }, [isActive, startDate, endDate]);
  
  return {
    dateRange: {
      startDate,
      endDate,
    },
    isActive,
    queryParams,
    queryKeyPart,
  };
}

