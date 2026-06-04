import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettingsDTO } from '@jazz/shared';

type LocalSettings = UserSettingsDTO;

interface LocalSettingsStore {
  settings: LocalSettings;
  setSettings: (patch: Partial<LocalSettings>) => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: LocalSettings = {
  bpm: 120,
  clickStrong: 'drum-stick',
  clickStrong2: 'drum-stick',
  clickWeak: 'drum-stick',
  volume: 0.8,
  countIn: 1,
};

export const useLocalSettingsStore = create<LocalSettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),
      reset: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    { name: 'jazz-local-settings' },
  ),
);
