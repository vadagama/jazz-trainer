import { useQuery } from '@tanstack/react-query';
import type { PublicGridSummaryDTO, PublicGridDTO } from '@jazz/shared';
import { apiClient } from '@/lib/apiClient';

interface PublicGridsParams {
  q?: string;
  sort?: 'updated' | 'likes' | 'name';
  limit?: number;
  offset?: number;
}

export function usePublicGrids(params: PublicGridsParams = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.sort) search.set('sort', params.sort);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.offset) search.set('offset', String(params.offset));

  const qs = search.toString();
  return useQuery({
    queryKey: ['grids', 'public', params],
    queryFn: () => apiClient.get<PublicGridSummaryDTO[]>(`/api/grids/public${qs ? `?${qs}` : ''}`),
    staleTime: 15_000,
  });
}

export function usePublicGrid(id: string) {
  return useQuery({
    queryKey: ['grids', 'public', id],
    queryFn: () => apiClient.get<PublicGridDTO>(`/api/grids/public/${id}`),
    enabled: Boolean(id),
  });
}
