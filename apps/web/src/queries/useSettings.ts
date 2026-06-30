import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserSettingsDTO, UpdateSettingsInput } from '@jazz/shared';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import { useLocalSettingsStore } from '@jazz/plugin-sdk';

const SETTINGS_KEY = ['settings'] as const;

export function useSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => apiClient.get<UserSettingsDTO>('/api/settings'),
    enabled: Boolean(user),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSettingsInput) =>
      apiClient.patch<UserSettingsDTO>('/api/settings', data),
    onSuccess: (updated) => {
      qc.setQueryData(SETTINGS_KEY, updated);
      // Sync solo/MIDI fields to local store so MidiSoloProvider picks up changes
      useLocalSettingsStore.getState().setSettings({
        soloToneId: updated.soloToneId,
        soloVolume: updated.soloVolume,
        duckingEnabled: updated.duckingEnabled,
        midiDeviceId: updated.midiDeviceId,
        midiChannel: updated.midiChannel,
      });
    },
  });
}
