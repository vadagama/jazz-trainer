import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LikeResponse, PublicGridSummaryDTO } from '@jazz/shared';
import { apiClient } from '@jazz/plugin-sdk';

export function useLikes() {
  const qc = useQueryClient();

  const like = useMutation({
    mutationFn: (gridId: string) => apiClient.post<LikeResponse>(`/api/grids/${gridId}/like`),
    onMutate: async (gridId) => {
      await qc.cancelQueries({ queryKey: ['grids', 'public'] });
      updateLikeCount(qc, gridId, +1, true);
    },
    onError: (_err, gridId) => {
      updateLikeCount(qc, gridId, -1, false);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['grids', 'public'] });
    },
  });

  const unlike = useMutation({
    mutationFn: (gridId: string) => apiClient.delete<LikeResponse>(`/api/grids/${gridId}/like`),
    onMutate: async (gridId) => {
      await qc.cancelQueries({ queryKey: ['grids', 'public'] });
      updateLikeCount(qc, gridId, -1, false);
    },
    onError: (_err, gridId) => {
      updateLikeCount(qc, gridId, +1, true);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['grids', 'public'] });
    },
  });

  return { like, unlike };
}

function updateLikeCount(
  qc: ReturnType<typeof useQueryClient>,
  gridId: string,
  delta: number,
  likedByMe: boolean,
) {
  qc.setQueriesData<PublicGridSummaryDTO[]>({ queryKey: ['grids', 'public'] }, (old) =>
    old?.map((g) =>
      g.id === gridId ? { ...g, likeCount: Math.max(0, g.likeCount + delta), likedByMe } : g,
    ),
  );
}
