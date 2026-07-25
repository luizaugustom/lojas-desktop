'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { sellerScheduleApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import type { UpdateSellerScheduleDto } from '@/types';

const KEYS = {
  schedule: (sellerId: string) => ['seller-schedule', sellerId] as const,
};

export function useSellerSchedule(sellerId: string | null | undefined) {
  return useQuery({
    queryKey: KEYS.schedule(sellerId ?? ''),
    queryFn: async () => (await sellerScheduleApi.get(sellerId!)).data,
    enabled: !!sellerId,
    staleTime: 5 * 60_000,
  });
}

export function useUpsertSellerSchedule(sellerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateSellerScheduleDto) =>
      (await sellerScheduleApi.upsert(sellerId, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.schedule(sellerId) });
      qc.invalidateQueries({ queryKey: ['time-clock', 'my-schedule'] });
      toast.success('Jornada do vendedor atualizada!');
    },
    onError: (err) => toast.error(handleApiError(err).message),
  });
}

export function useDeleteSellerSchedule(sellerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await sellerScheduleApi.remove(sellerId)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.schedule(sellerId) });
      qc.invalidateQueries({ queryKey: ['time-clock', 'my-schedule'] });
      toast.success('Jornada individual removida. Voltará a usar a da empresa.');
    },
    onError: (err) => toast.error(handleApiError(err).message),
  });
}
