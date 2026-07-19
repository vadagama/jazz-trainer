import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  HarmonyCompositionDTO,
  UpdateCompositionInput,
  PatternInfo,
  GenerateInput,
  CompositionContent,
} from '@jazz/shared';
import { apiClient } from '@/lib/apiClient';

export function compositionKey(id: string) {
  return ['compositions', id] as const;
}

export function useComposition(id: string) {
  return useQuery({
    queryKey: compositionKey(id),
    queryFn: () => apiClient.get<HarmonyCompositionDTO>(`/api/compositions/${id}`),
    enabled: !!id,
  });
}

export function useUpdateComposition(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCompositionInput) =>
      apiClient.patch<HarmonyCompositionDTO>(`/api/compositions/${id}`, data),
    onSuccess: (updated) => {
      qc.setQueryData(compositionKey(id), updated);
      qc.invalidateQueries({ queryKey: ['compositions', 'mine'] });
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

export function useGenerateComposition() {
  return useMutation({
    mutationFn: async (input: GenerateInput) => {
      const data = await apiClient.post<{ content: CompositionContent }>('/api/generate', input);
      return data.content;
    },
  });
}
