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
  metronomeEnabled: true,
  metronomeVolume: 0.8,
  metronomeMode: 'both' as const,
  metronomeStrongEnabled: true,
  metronomeStrongVolume: 0.8,
  metronomeStrong2Enabled: true,
  metronomeStrong2Volume: 0.8,
  metronomeWeakEnabled: true,
  metronomeWeakVolume: 0.8,
  bassEnabled: true,
  bassVolume: 0.7,
  bassComplexity: 1,
  rhodesEnabled: false,
  rhodesVolume: 0.6,
  rhodesPattern: 'rhodes-swing-form' as const,
  rhodesVoicingDensity: 'rootless3' as const,
  rhodesLayerVolume: 0.5,
  pianoEnabled: false,
  pianoVolume: 0.7,
  pianoVoicingDensity: 'rootless3' as const,
  pianoSampleLibrary: 'salamander' as const,
  pianoPattern: null as string | null,
  drumsEnabled: true,
  drumsVolume: 0.7,
  drumKit: 'jazz-drum-kit' as const,
  drumsPattern: null as string | null,
  style: 'swing' as const,
  swingRatio: 0.5,
  audioFormat: 'aac' as const,

  // -- Per-style overrides --
  perStyleOverrides: {} as Record<string, Record<string, unknown>>,

  // -- MIDI & solo defaults (Phase C) --
  midiDeviceId: undefined,
  midiChannel: undefined,
  soloToneId: 'rhodes-jrhodes3c',
  soloVolume: undefined,
  duckingEnabled: undefined,
};

export const useLocalSettingsStore = create<LocalSettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      reset: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'jazz-local-settings',
      version: 2,
      migrate: (persisted: unknown, _version: number) => {
        // Zustand persist v4+ wraps state as { state: ..., version: ... }
        const wrapper = persisted as { state?: { settings?: Partial<LocalSettings> } } | undefined;
        // Also handle legacy format where settings were stored directly on the wrapper
        const raw = (wrapper?.state?.settings ??
          (persisted as Partial<LocalSettings> | undefined)) as Partial<LocalSettings> | undefined;
        return { settings: { ...DEFAULT_SETTINGS, ...raw } } as LocalSettingsStore;
      },
    },
  ),
);
