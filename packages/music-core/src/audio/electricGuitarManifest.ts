import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { GuitarInstrument } from './guitarInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

/**
 * Electric guitar anchor notes (CC0, 2 velocity layers, 4× round-robin).
 *
 * Normal layer: full pick attack, E2–C#6. Soft layer: finger/palm mute,
 * available for E2–D5 with gaps at G4/B4/F5+.
 *
 * Source FLAC files: apps/web/public/samples/_source/electric-guitar/samples/
 * Converted to AAC/MP3 for production.
 */
const ELECTRIC_NORMAL_NOTES: Record<string, string> = {
  E2: 'E2_s1_01.m4a',
  A2: 'A2_s2_01.m4a',
  D3: 'D3_s3_01.m4a',
  G3: 'G3_s4_01.m4a',
  B3: 'B3_s5_01.m4a',
  E4: 'E4_s6_01.m4a',
  G4: 'G4_s6_01.m4a',
  B4: 'B4_s6_01.m4a',
  D5: 'D5_s6_01.m4a',
  F5: 'F5_s6_01.m4a',
  'G#5': 'G#5_s6_01.m4a',
  'C#6': 'C#6_s6_01.m4a',
};

const ELECTRIC_SOFT_NOTES: Record<string, string> = {
  E2: 'E2_s1_soft_01.m4a',
  A2: 'A2_s2_soft_01.m4a',
  D3: 'D3_s3_soft_01.m4a',
  G3: 'G3_s4_soft_01.m4a',
  B3: 'B3_s5_soft_01.m4a',
  E4: 'E4_s6_soft_01.m4a',
};

const ELECTRIC_GUITAR_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: '/samples/aac/guitar/electric-guitar/',
  fallbackBaseUrl: '/samples/mp3/guitar/electric-guitar/',
  layers: {
    normal: ELECTRIC_NORMAL_NOTES,
    soft: ELECTRIC_SOFT_NOTES,
  },
  release: 1.2,
};

export const electricGuitarManifest: InstrumentManifest = {
  id: 'electric-guitar',
  name: 'Electric Guitar',
  family: 'pitched',
  settingsPrefix: 'guitar',
  createInstrument: () => new GuitarInstrument(new ChordTimeline(), 'electric-guitar'),
  sampleManifest: ELECTRIC_GUITAR_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    mode: 'comp',
    voicing: 'jazz',
  },
  perStyleDefaults: {
    swing: { mode: 'comp', voicing: 'jazz' },
    bossa: { mode: 'comp', voicing: 'jazz' },
    funk: { mode: 'comp', voicing: 'jazz' },
    latin: { mode: 'comp', voicing: 'jazz' },
    ballad: { mode: 'comp', voicing: 'jazz' },
  },
};
