import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CatalogEntry,
  CatalogStats,
  CatalogTag,
  CreateCatalogEntryInput,
  UpdateCatalogEntryInput,
  BatchActionInput,
  CreateCatalogTagInput,
  UpdateCatalogTagInput,
  MergeCatalogTagsInput,
} from '@jazz/shared';
import { apiClient } from '@jazz/plugin-sdk';

const ADMIN_LIST_KEY = ['admin', 'catalog', 'list'] as const;
const ADMIN_STATS_KEY = ['admin', 'catalog', 'stats'] as const;
const ADMIN_TAGS_KEY = ['admin', 'catalog', 'tags'] as const;

// ── Moderation list ────────────────────────────────────────────────────────

export function useAdminCatalog() {
  return useQuery({
    queryKey: ADMIN_LIST_KEY,
    queryFn: () => apiClient.get<CatalogEntry[]>('/api/admin/catalog'),
  });
}

// ── Stats ──────────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ADMIN_STATS_KEY,
    queryFn: () => apiClient.get<CatalogStats>('/api/admin/catalog/stats'),
  });
}

// ── Tags management ───────────────────────────────────────────────────────

export function useAdminTags() {
  return useQuery({
    queryKey: ADMIN_TAGS_KEY,
    queryFn: () => apiClient.get<CatalogTag[]>('/api/admin/catalog/tags'),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCatalogTagInput) =>
      apiClient.post<CatalogTag>('/api/admin/catalog/tags', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_TAGS_KEY }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCatalogTagInput & { id: string }) =>
      apiClient.patch<CatalogTag>(`/api/admin/catalog/tags/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_TAGS_KEY }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/catalog/tags/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_TAGS_KEY }),
  });
}

export function useMergeTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MergeCatalogTagsInput) =>
      apiClient.post<{ merged: number }>('/api/admin/catalog/tags/merge', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_TAGS_KEY }),
  });
}

// ── Moderation actions ────────────────────────────────────────────────────

export function useRejectEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/admin/catalog/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY }),
  });
}

export function useApproveEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/admin/catalog/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY }),
  });
}

export function useToggleFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ featured: boolean }>(`/api/admin/catalog/${id}/feature`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY }),
  });
}

export function useReorderFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, order }: { id: string; order: number }) =>
      apiClient.patch(`/api/admin/catalog/${id}/featured-order`, { order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY }),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/catalog/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY }),
  });
}

export function useBatchAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BatchActionInput) =>
      apiClient.post<{ affected: number }>('/api/admin/catalog/batch', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY }),
  });
}

export function useAdminUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCatalogEntryInput & { id: string }) =>
      apiClient.patch<CatalogEntry>(`/api/admin/catalog/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY }),
  });
}

// ── Publish (catalog_editor) ──────────────────────────────────────────────

export function usePublishCatalogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCatalogEntryInput) =>
      apiClient.post<CatalogEntry>('/api/catalog', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

/** Publish a user's private composition as a public catalog entry. */
export function usePublishEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ id: string; name: string }>(`/api/compositions/${id}/publish`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      qc.invalidateQueries({ queryKey: ['compositions', 'mine'] });
    },
  });
}
