import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserSettingsDTO, UpdateSettingsInput } from '@jazz/shared';
import { apiClient } from '../apiClient';
import { useAuth } from './useAuth';
import { useLocalSettingsStore } from '../stores/useLocalSettingsStore';

const SETTINGS_KEY = ['settings'] as const;

export function useSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => apiClient.get<UserSettingsDTO>('/api/settings'),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateSettingsInput) => {
      if (!user) {
        const store = useLocalSettingsStore.getState();
        store.setSettings(data);
        return { ...store.settings, ...data } as UserSettingsDTO;
      }
      return apiClient.patch<UserSettingsDTO>('/api/settings', data);
    },
    onMutate: async (data) => {
      // Cancel in-flight settings queries so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: SETTINGS_KEY });
      // Snapshot for rollback on error
      const previous = qc.getQueryData<UserSettingsDTO>(SETTINGS_KEY);
      // Optimistically merge into React Query cache
      if (previous) {
        qc.setQueryData(SETTINGS_KEY, { ...previous, ...data });
      }
      // Also merge into local store so non-logged-in / fallback consumers pick it up
      const store = useLocalSettingsStore.getState();
      store.setSettings(data as Partial<UserSettingsDTO>);
      return { previous };
    },
    onError: (_err, _data, context) => {
      // Roll back to the snapshot on error
      if (context?.previous) {
        qc.setQueryData(SETTINGS_KEY, context.previous);
      }
    },
    onSuccess: (updated) => {
      if (user) {
        qc.setQueryData(SETTINGS_KEY, updated);
      }
      // Sync key fields to local store so all consumers pick up changes
      useLocalSettingsStore.getState().setSettings({
        bpm: updated.bpm,
        volume: updated.volume,
        countIn: updated.countIn,
        style: updated.style,
        swingRatio: updated.swingRatio,
        metronomeEnabled: updated.metronomeEnabled,
        metronomeVolume: updated.metronomeVolume,
        metronomeMode: updated.metronomeMode,
        metronomeStrongEnabled: updated.metronomeStrongEnabled,
        metronomeStrongVolume: updated.metronomeStrongVolume,
        metronomeStrong2Enabled: updated.metronomeStrong2Enabled,
        metronomeStrong2Volume: updated.metronomeStrong2Volume,
        metronomeWeakEnabled: updated.metronomeWeakEnabled,
        metronomeWeakVolume: updated.metronomeWeakVolume,
        audioFormat: updated.audioFormat,
        drumKit: updated.drumKit,
        soloToneId: updated.soloToneId,
        soloVolume: updated.soloVolume,
        duckingEnabled: updated.duckingEnabled,
        midiDeviceId: updated.midiDeviceId,
        midiChannel: updated.midiChannel,
      });
    },
  });
}
