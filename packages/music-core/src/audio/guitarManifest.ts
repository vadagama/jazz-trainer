import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { GuitarInstrument } from './guitarInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

/**
 * Anchor notes for nylon-string guitar: open strings + 5th/12th fret harmonics.
 * Every 4–5 semitones across E2–E5. Tone.js interpolates ≤ ±2 semitones.
 */
const GUITAR_NYLON_NOTES: Record<string, string> = {
  E2: 'nylon_e2.ogg',
  A2: 'nylon_a2.ogg',
  D3: 'nylon_d3.ogg',
  G3: 'nylon_g3.ogg',
  B3: 'nylon_b3.ogg',
  E4: 'nylon_e4.ogg',
  G4: 'nylon_g4.ogg',
  B4: 'nylon_b4.ogg',
  E5: 'nylon_e5.ogg',
};

/**
 * Anchor notes for steel-string guitar. Same range, brighter timbre.
 */
const GUITAR_STEEL_NOTES: Record<string, string> = {
  E2: 'steel_e2.ogg',
  A2: 'steel_a2.ogg',
  D3: 'steel_d3.ogg',
  G3: 'steel_g3.ogg',
  B3: 'steel_b3.ogg',
  E4: 'steel_e4.ogg',
  G4: 'steel_g4.ogg',
  B4: 'steel_b4.ogg',
  E5: 'steel_e5.ogg',
};

const GUITAR_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: '/samples/guitar/',
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
