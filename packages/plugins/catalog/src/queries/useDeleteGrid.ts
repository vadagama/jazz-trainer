import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@jazz/plugin-sdk';

export function useDeleteGrid() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/grids/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grids', 'mine'] });
      qc.invalidateQueries({ queryKey: ['grids', 'public'] });
    },
  });
}
