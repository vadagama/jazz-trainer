import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HarmonyCompositionDTO } from '@jazz/shared';
import { apiClient } from '@/lib/apiClient';

export function useCopyToMine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ compositionId, name }: { compositionId: string; name?: string }) =>
      apiClient.post<HarmonyCompositionDTO>(
        `/api/compositions/${compositionId}/copy`,
        name ? { name } : {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compositions', 'mine'] });
    },
  });
}
