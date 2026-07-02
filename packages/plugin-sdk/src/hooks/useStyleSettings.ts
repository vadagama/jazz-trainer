import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Style, UserSettingsDTO } from '@jazz/shared';
import { apiClient } from '../apiClient';
import { useSettings, useUpdateSettings } from '../queries/useSettings';

const SETTINGS_KEY = ['settings'] as const;

export interface UseStyleSettingsReturn {
  /** Current playback style (from settings, defaults to 'swing'). */
  currentStyle: Style;

  /**
   * Save an instrument setting change for the current style.
   * Updates both the main setting and records it in perStyleOverrides[currentStyle].
   * Optimistic: UI updates instantly via cache, syncs with API in background.
   */
  saveSetting: (patch: Partial<UserSettingsDTO>) => void;

  /**
   * Reset all per-style overrides for a given style back to defaults.
   * Calls DELETE /api/settings/style/:style and invalidates the cache.
   */
  resetStyle: (style: Style) => Promise<void>;

  /** Per-style overrides for the current style (for reading, not writing). */
  currentOverrides: Record<string, unknown>;

  /** Whether a save/reset operation is in progress. */
  isUpdating: boolean;
}

export function useStyleSettings(): UseStyleSettingsReturn {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const qc = useQueryClient();

  const currentStyle: Style = (settings?.style as Style) ?? 'swing';
  const currentOverrides: Record<string, unknown> =
    (settings?.perStyleOverrides?.[currentStyle] as Record<string, unknown>) ?? {};

  const saveSetting = useCallback(
    (patch: Partial<UserSettingsDTO>) => {
      const previousSettings = qc.getQueryData<UserSettingsDTO>(SETTINGS_KEY);

      // Optimistic update: apply patch + override to cache immediately
      if (previousSettings) {
        const optimistic = { ...previousSettings, ...patch };
        optimistic.perStyleOverrides = {
          ...previousSettings.perStyleOverrides,
          [currentStyle]: {
            ...(previousSettings.perStyleOverrides?.[currentStyle] ?? {}),
            ...patch,
          },
        } as UserSettingsDTO['perStyleOverrides'];
        qc.setQueryData(SETTINGS_KEY, optimistic);
      }

      updateSettings.mutate(
        {
          ...patch,
          perStyleOverrides: {
            [currentStyle]: patch,
          },
        } as Parameters<typeof updateSettings.mutate>[0],
        {
          onError: () => {
            if (previousSettings) {
              qc.setQueryData(SETTINGS_KEY, previousSettings);
            }
          },
        },
      );
    },
    [currentStyle, updateSettings, qc],
  );

  const resetStyle = useCallback(
    async (style: Style) => {
      await apiClient.delete(`/api/settings/style/${style}`);
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
    [qc],
  );

  return {
    currentStyle,
    saveSetting,
    resetStyle,
    currentOverrides,
    isUpdating: updateSettings.isPending,
  };
}
