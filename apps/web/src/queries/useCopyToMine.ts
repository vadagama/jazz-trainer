import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HarmonyGridDTO } from '@jazz/shared';
import { apiClient } from '@/lib/apiClient';

export function useCopyToMine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ gridId, name }: { gridId: string; name?: string }) =>
      apiClient.post<HarmonyGridDTO>(`/api/grids/${gridId}/copy`, name ? { name } : {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grids', 'mine'] });
    },
  });
}
