import { useQuery } from '@tanstack/react-query';
import type { PublicCompositionSummaryDTO, PublicCompositionDTO } from '@jazz/shared';
import { apiClient } from '@jazz/plugin-sdk';

interface PublicCompositionsParams {
  q?: string;
  sort?: 'updated' | 'likes' | 'name';
  limit?: number;
  offset?: number;
}

export function usePublicCompositions(params: PublicCompositionsParams = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.sort) search.set('sort', params.sort);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.offset) search.set('offset', String(params.offset));

  const qs = search.toString();
  return useQuery({
    queryKey: ['compositions', 'public', params],
    queryFn: () =>
      apiClient.get<PublicCompositionSummaryDTO[]>(`/api/compositions/public${qs ? `?${qs}` : ''}`),
    staleTime: 15_000,
  });
}

export function usePublicComposition(id: string) {
  return useQuery({
    queryKey: ['compositions', 'public', id],
    queryFn: () => apiClient.get<PublicCompositionDTO>(`/api/compositions/public/${id}`),
    enabled: Boolean(id),
  });
}
