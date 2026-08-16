'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { timeClockApi } from '@/lib/api-endpoints';
import { handleApiError } from '@/lib/handleApiError';
import type {
  AdjustTimeClockDto,
  RegisterTimeClockDto,
  RejectTimeClockDto,
  TimeClockFilterDto,
} from '@/types';

const KEYS = {
  myToday: () => ['time-clock', 'my-today'] as const,
  myHistory: (filter: TimeClockFilterDto) =>
    ['time-clock', 'my-history', filter] as const,
  myStats: (month?: string) => ['time-clock', 'my-stats', month] as const,
  mySchedule: () => ['time-clock', 'my-schedule'] as const,
  config: (companyId?: string) => ['time-clock', 'config', companyId] as const,
  qrCode: () => ['time-clock', 'qr-code'] as const,
  pending: () => ['time-clock', 'pending'] as const,
  list: (filter: TimeClockFilterDto) => ['time-clock', 'list', filter] as const,
  stats: (month?: string) => ['time-clock', 'stats', month] as const,
};

export function useMyToday(enabled = true) {
  return useQuery({
    queryKey: KEYS.myToday(),
    queryFn: async () => (await timeClockApi.myToday()).data,
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useMyHistory(filter: TimeClockFilterDto = {}) {
  return useQuery({
    queryKey: KEYS.myHistory(filter),
    queryFn: async () => (await timeClockApi.myHistory(filter)).data,
    staleTime: 60_000,
  });
}

export function useMyStats(month?: string) {
  return useQuery({
    queryKey: KEYS.myStats(month),
    queryFn: async () => (await timeClockApi.myStats({ month })).data,
    staleTime: 60_000,
  });
}

export function useMySchedule(enabled = true) {
  return useQuery({
    queryKey: KEYS.mySchedule(),
    queryFn: async () => (await timeClockApi.mySchedule()).data,
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });
}

export function useRegisterTimeClock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RegisterTimeClockDto) =>
      (await timeClockApi.register(data)).data,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['time-clock'] });
      const pending =
        (result?.timeClock?.status ?? result?.status) === 'PENDING_REVIEW';
      if (pending) {
        toast('Ponto registrado, mas está fora do raio. Aguardando aprovação.', {
          icon: '⚠️',
        });
      } else {
        toast.success('Ponto registrado com sucesso!');
      }
    },
    onError: (err) => toast.error(handleApiError(err).message),
  });
}

export function useTimeClockConfig(companyId?: string) {
  return useQuery({
    queryKey: KEYS.config(companyId),
    queryFn: async () =>
      (await timeClockApi.getConfig(companyId ? { companyId } : undefined)).data,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateTimeClockConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await timeClockApi.updateConfig(data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-clock', 'config'] });
      toast.success('Configuração atualizada!');
    },
    onError: (err) => toast.error(handleApiError(err).message),
  });
}

export function useRegenerateQr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await timeClockApi.regenerateQr()).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-clock', 'config'] });
      qc.invalidateQueries({ queryKey: ['time-clock', 'qr-code'] });
      toast.success('QR rotacionado!');
    },
    onError: (err) => toast.error(handleApiError(err).message),
  });
}

export function useTimeClockQrCode(enabled = true) {
  return useQuery({
    queryKey: KEYS.qrCode(),
    queryFn: async () => (await timeClockApi.getQrCode()).data,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function usePendingTimeClocks() {
  return useQuery({
    queryKey: KEYS.pending(),
    queryFn: async () => (await timeClockApi.pending()).data,
    refetchInterval: 60_000,
  });
}

export function useTimeClockList(filter: TimeClockFilterDto = {}) {
  return useQuery({
    queryKey: KEYS.list(filter),
    queryFn: async () => (await timeClockApi.list(filter)).data,
    staleTime: 30_000,
  });
}

export function useTimeClockStats(month?: string) {
  return useQuery({
    queryKey: KEYS.stats(month),
    queryFn: async () => (await timeClockApi.stats({ month })).data,
    staleTime: 60_000,
  });
}

export function useApproveTimeClock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await timeClockApi.approve(id)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-clock'] });
      toast.success('Ponto aprovado!');
    },
    onError: (err) => toast.error(handleApiError(err).message),
  });
}

export function useRejectTimeClock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RejectTimeClockDto }) =>
      (await timeClockApi.reject(id, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-clock'] });
      toast.success('Marcação rejeitada.');
    },
    onError: (err) => toast.error(handleApiError(err).message),
  });
}

export function useAdjustTimeClock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdjustTimeClockDto }) =>
      (await timeClockApi.adjust(id, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-clock'] });
      toast.success('Marcação ajustada!');
    },
    onError: (err) => toast.error(handleApiError(err).message),
  });
}
