import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@jazz/plugin-sdk';

export function useDeleteComposition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/compositions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compositions', 'mine'] });
      qc.invalidateQueries({ queryKey: ['compositions', 'public'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}
