import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LikeResponse, CatalogEntry } from '@jazz/shared';
import { apiClient } from '@jazz/plugin-sdk';

export function useLikes() {
  const qc = useQueryClient();

  const like = useMutation({
    mutationFn: (compositionId: string) =>
      apiClient.post<LikeResponse>(`/api/compositions/${compositionId}/like`),
    onMutate: async (compositionId) => {
      await qc.cancelQueries({ queryKey: ['catalog'] });
      updateLikeCount(qc, compositionId, +1, true);
    },
    onError: (_err, compositionId) => {
      updateLikeCount(qc, compositionId, -1, false);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });

  const unlike = useMutation({
    mutationFn: (compositionId: string) =>
      apiClient.delete<LikeResponse>(`/api/compositions/${compositionId}/like`),
    onMutate: async (compositionId) => {
      await qc.cancelQueries({ queryKey: ['catalog'] });
      updateLikeCount(qc, compositionId, -1, false);
    },
    onError: (_err, compositionId) => {
      updateLikeCount(qc, compositionId, +1, true);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });

  return { like, unlike };
}

function updateLikeCount(
  qc: ReturnType<typeof useQueryClient>,
  compositionId: string,
  delta: number,
  likedByMe: boolean,
) {
  qc.setQueriesData<CatalogEntry[]>({ queryKey: ['catalog'] }, (old) =>
    old?.map((g) =>
      g.id === compositionId
        ? { ...g, likeCount: Math.max(0, g.likeCount + delta), likedByMe }
        : g,
    ),
  );
}
