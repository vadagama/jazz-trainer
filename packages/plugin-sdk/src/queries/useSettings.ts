import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserSettingsDTO, UpdateSettingsInput } from '@jazz/shared';
import { apiClient } from '../apiClient';
import { useAuth } from './useAuth';
import { useLocalSettingsStore } from '../stores/useLocalSettingsStore';

const SETTINGS_KEY = ['settings'] as const;
const PATCH_DEBOUNCE_MS = 200;

// Module-level sequence counter to detect stale mutation responses.
// Multiple GroupRow components each call useUpdateSettings(), creating
// separate useMutation instances. When the user drags two sliders in
// rapid succession, mutations A and B are sent concurrently. If A's
// server response arrives AFTER B's, A's onSuccess would overwrite the
// cache with stale data — undoing B's changes. The seq counter lets us
// skip onSuccess/onError for mutations that are no longer the latest.
let latestMutationSeq = 0;

// Module-level debounce for settings PATCH requests.
// Slider drags fire dozens of onValueChange events per second — each
// would trigger a separate PATCH request. Instead, only the latest
// mutation within a 200 ms window actually reaches the server. Earlier
// mutations resolve immediately with cached state (their onSuccess is
// skipped by the seq guard above).
let patchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let patchPendingResolve: ((v: UserSettingsDTO) => void) | null = null;

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
        // Store already updated synchronously in onMutate — just return
        // the current merged state so onSuccess can sync key fields.
        const store = useLocalSettingsStore.getState();
        return { ...store.settings } as UserSettingsDTO;
      }

      // Debounce rapid consecutive PATCH requests (e.g. slider drag).
      // onMutate always fires immediately for every mutate() call,
      // so the UI stays responsive. Only the latest mutation within
      // the debounce window actually reaches the server.
      if (patchDebounceTimer) {
        clearTimeout(patchDebounceTimer);
        patchDebounceTimer = null;
        // Resolve previous promise with current cache — its onSuccess
        // will be skipped by the seq guard since a newer mutation exists.
        if (patchPendingResolve) {
          const cache =
            qc.getQueryData<UserSettingsDTO>(SETTINGS_KEY) ?? ({} as UserSettingsDTO);
          patchPendingResolve(cache);
          patchPendingResolve = null;
        }
      }

      return new Promise<UserSettingsDTO>((resolve, reject) => {
        patchPendingResolve = resolve;
        patchDebounceTimer = setTimeout(async () => {
          patchDebounceTimer = null;
          patchPendingResolve = null;
          try {
            const result = await apiClient.patch<UserSettingsDTO>(
              '/api/settings',
              data,
            );
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }, PATCH_DEBOUNCE_MS);
      });
    },
    onMutate: async (data) => {
      // Update local store FIRST, synchronously, before any async gap.
      // This prevents race conditions where parallel mutations from
      // different components (e.g. GroupRow sliders) interleave and
      // overwrite each other's per-style overrides.
      const store = useLocalSettingsStore.getState();
      store.setSettings(data as Partial<UserSettingsDTO>);

      // Atomically capture the sequence number BEFORE any await —
      // this guards onSuccess/onError against stale responses.
      const seq = ++latestMutationSeq;

      // Cancel in-flight settings queries so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: SETTINGS_KEY });
      // Snapshot for rollback on error
      const previous = qc.getQueryData<UserSettingsDTO>(SETTINGS_KEY);
      // Optimistically merge into React Query cache
      if (previous) {
        qc.setQueryData(SETTINGS_KEY, { ...previous, ...data });
      }
      return { previous, seq };
    },
    onError: (_err, _data, context) => {
      // Only roll back if this is still the latest mutation.
      // A newer mutation may have already updated the cache optimistically.
      if (context?.seq !== latestMutationSeq) return;
      if (context?.previous) {
        qc.setQueryData(SETTINGS_KEY, context.previous);
      }
    },
    onSuccess: (updated, _data, context) => {
      // Skip if a newer mutation has already updated the cache.
      // Without this guard, an earlier mutation's server response
      // would overwrite a later mutation's optimistic update —
      // causing settings from one instrument to leak/lose changes
      // made to another instrument in rapid succession.
      if (context?.seq !== latestMutationSeq) return;

      if (user) {
        qc.setQueryData(SETTINGS_KEY, updated);
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
      }
    },
  });
}
