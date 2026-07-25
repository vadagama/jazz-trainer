import { useQuery } from '@tanstack/react-query';
import type { DefaultSettingsDTO } from '@jazz/shared';
import { apiClient } from '../apiClient';

/** React Query key for the public default-settings payload. */
const DEFAULT_SETTINGS_KEY = ['default-settings'] as const;

/**
 * Fetch the admin-managed factory defaults via the **public** endpoint
 * `GET /api/default-settings` (no auth required). Used by guest users in
 * `useEffectiveSettings` as the base layer underneath their local tweaks.
 *
 * `staleTime: 0` so a guest reload (or window refocus) always refetches: admin
 * edits must be visible on the next reload, never served stale from cache. The
 * server sends `Cache-Control: no-store` for the same reason.
 */
export function useDefaultSettings() {
  return useQuery({
    queryKey: DEFAULT_SETTINGS_KEY,
    queryFn: () => apiClient.get<DefaultSettingsDTO>('/api/default-settings'),
    staleTime: 0,
  });
}

export { DEFAULT_SETTINGS_KEY };
