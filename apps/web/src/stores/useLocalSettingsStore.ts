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
  metronomeVolume: 0.8,
  bassEnabled: true,
  bassVolume: 0.7,
  bassComplexity: 1,
  bassOctaveUp: false,
  rhodesEnabled: false,
  rhodesVolume: 0.6,
  rhodesMode: 'halfNotes' as const,
  rhodesVoicingDensity: 'rootless3' as const,
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
