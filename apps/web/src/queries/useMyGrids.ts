import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HarmonyGridSummaryDTO, HarmonyGridDTO, CreateGridInput } from '@jazz/shared';
import { apiClient } from '@/lib/apiClient';

const MINE_KEY = ['grids', 'mine'] as const;

export function useMyGrids() {
  return useQuery({
    queryKey: MINE_KEY,
    queryFn: () => apiClient.get<HarmonyGridSummaryDTO[]>('/api/grids/mine'),
  });
}

export function useCreateGrid() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGridInput) => apiClient.post<HarmonyGridDTO>('/api/grids', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
    },
  });
}

export function useDeleteGrid() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/grids/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
    },
  });
}
