import type { InstrumentManifest, SampleManifest } from '@jazz/music-core';
import { MetronomeInstrument, sampleBaseUrl } from '@jazz/music-core';

const METRONOME_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: sampleBaseUrl('metronome', 'metronome', 'aac'),
  fallbackBaseUrl: sampleBaseUrl('metronome', 'metronome', 'mp3'),
  oneshots: {
    'analog-metronome': ['analog-metronome.m4a'],
    'button-click': ['button-click.m4a'],
    'drum-stick': ['drum-stick.m4a'],
    'retro-stick': ['retro-stick.m4a'],
    switch: ['switch.m4a'],
    'cross-stick': ['cross-stick.m4a'],
    'hh-chick': ['hh-chick.m4a'],
    'hh-closed': ['hh-closed.m4a'],
  },
  rrCount: 1,
};

export const metronomeManifest: InstrumentManifest = {
  id: 'metronome',
  name: 'Метроном',
  family: 'percussion',
  settingsPrefix: 'metronome',
  createInstrument: () => new MetronomeInstrument(),
  sampleManifest: METRONOME_SAMPLE_MANIFEST,
  defaultSettings: {
    clickStrong: 'drum-stick',
    clickStrong2: 'drum-stick',
    clickWeak: 'drum-stick',
    metronomeEnabled: true,
    metronomeVolume: 0.8,
    metronomeMode: 'both',
    metronomeStrongEnabled: true,
    metronomeStrongVolume: 0.8,
    metronomeStrong2Enabled: true,
    metronomeStrong2Volume: 0.8,
    metronomeWeakEnabled: true,
    metronomeWeakVolume: 0.8,
  },
};
