import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HarmonyGridDTO, UpdateGridInput, PatternInfo, GenerateInput, GridContent } from '@jazz/shared';
import { apiClient } from '@jazz/plugin-sdk';

export function gridKey(id: string) {
  return ['grids', id] as const;
}

export function useGrid(id: string) {
  return useQuery({
    queryKey: gridKey(id),
    queryFn: () => apiClient.get<HarmonyGridDTO>(`/api/grids/${id}`),
    enabled: !!id,
  });
}

export function useUpdateGrid(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateGridInput) => apiClient.patch<HarmonyGridDTO>(`/api/grids/${id}`, data),
    onSuccess: (updated) => {
      qc.setQueryData(gridKey(id), updated);
      qc.invalidateQueries({ queryKey: ['grids', 'mine'] });
    },
  });
}

export function usePatterns() {
  return useQuery({
    queryKey: ['patterns'],
    queryFn: () => apiClient.get<PatternInfo[]>('/api/patterns'),
    staleTime: Infinity,
  });
}

export function useGenerateGrid() {
  return useMutation({
    mutationFn: async (input: GenerateInput) => {
      const data = await apiClient.post<{ content: GridContent }>('/api/generate', input);
      return data.content;
    },
  });
}
