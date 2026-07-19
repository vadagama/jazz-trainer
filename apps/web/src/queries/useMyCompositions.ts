import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HarmonyCompositionSummaryDTO, HarmonyCompositionDTO, CreateCompositionInput } from '@jazz/shared';
import { apiClient } from '@/lib/apiClient';

const MINE_KEY = ['compositions', 'mine'] as const;

export function useMyCompositions() {
  return useQuery({
    queryKey: MINE_KEY,
    queryFn: () => apiClient.get<HarmonyCompositionSummaryDTO[]>('/api/compositions/mine'),
  });
}

export function useCreateComposition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompositionInput) =>
      apiClient.post<HarmonyCompositionDTO>('/api/compositions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
    },
  });
}

export function useDeleteComposition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/compositions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
    },
  });
}

export function usePublishComposition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/compositions/${id}/publish`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      qc.invalidateQueries({ queryKey: ['compositions', 'public'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}
