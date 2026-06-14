import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { GuitarInstrument } from './guitarInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

/**
 * Anchor notes for nylon-string guitar: open strings + 5th/12th fret harmonics.
 * Every 4–5 semitones across E2–E5. Tone.js interpolates ≤ ±2 semitones.
 */
const GUITAR_NYLON_NOTES: Record<string, string> = {
  E2: 'nylon_e2.m4a',
  A2: 'nylon_a2.m4a',
  D3: 'nylon_d3.m4a',
  G3: 'nylon_g3.m4a',
  B3: 'nylon_b3.m4a',
  E4: 'nylon_e4.m4a',
  G4: 'nylon_g4.m4a',
  B4: 'nylon_b4.m4a',
  E5: 'nylon_e5.m4a',
};

/**
 * Anchor notes for steel-string guitar. Same range, brighter timbre.
 */
const GUITAR_STEEL_NOTES: Record<string, string> = {
  E2: 'steel_e2.m4a',
  A2: 'steel_a2.m4a',
  D3: 'steel_d3.m4a',
  G3: 'steel_g3.m4a',
  B3: 'steel_b3.m4a',
  E4: 'steel_e4.m4a',
  G4: 'steel_g4.m4a',
  B4: 'steel_b4.m4a',
  E5: 'steel_e5.m4a',
};

const GUITAR_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: '/samples/aac/guitar/',
  fallbackBaseUrl: '/samples/mp3/guitar/',
  layers: {
    nylon: GUITAR_NYLON_NOTES,
    steel: GUITAR_STEEL_NOTES,
  },
  release: 2.0,
};

export const guitarManifest: InstrumentManifest = {
  id: 'guitar',
  name: 'Guitar',
  createInstrument: () => new GuitarInstrument(new ChordTimeline()),
  sampleManifest: GUITAR_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    mode: 'comp',
    voicing: 'jazz',
    stringType: 'nylon',
  },
};
