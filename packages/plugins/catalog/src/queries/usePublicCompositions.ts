import { useQuery } from '@tanstack/react-query';
import type {
  CatalogEntry,
  CatalogQuery,
  CatalogTag,
  PublicCompositionDTO,
} from '@jazz/shared';
import { apiClient } from '@jazz/plugin-sdk';

/**
 * Rich catalog query (filters + sort + pagination).
 * Builds query string from CatalogQuery fields.
 */
export function useCatalog(params: CatalogQuery = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    search.set(k, String(v));
  }
  const qs = search.toString();
  return useQuery({
    queryKey: ['catalog', 'list', params],
    queryFn: () => apiClient.get<CatalogEntry[]>(`/api/catalog${qs ? `?${qs}` : ''}`),
    staleTime: 15_000,
  });
}

export function useFeatured() {
  return useQuery({
    queryKey: ['catalog', 'featured'],
    queryFn: () => apiClient.get<CatalogEntry[]>('/api/catalog/featured'),
    staleTime: 60_000,
  });
}

export function useCatalogEntry(id: string) {
  return useQuery({
    queryKey: ['catalog', 'entry', id],
    queryFn: () => apiClient.get<CatalogEntry>(`/api/catalog/${id}`),
    enabled: Boolean(id),
  });
}

export function useCatalogTags() {
  return useQuery({
    queryKey: ['catalog', 'tags'],
    queryFn: () => apiClient.get<CatalogTag[]>('/api/catalog/tags'),
    staleTime: 5 * 60_000,
  });
}

/** Legacy single-public-composition fetch (includes full content + owner). */
export function usePublicComposition(id: string) {
  return useQuery({
    queryKey: ['compositions', 'public', id],
    queryFn: () => apiClient.get<PublicCompositionDTO>(`/api/compositions/public/${id}`),
    enabled: Boolean(id),
  });
}
