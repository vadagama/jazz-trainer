import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { VIBRAPHONE_LAYERS, VIBRAPHONE_SAMPLER_BASE_URL } from './vibraphoneSampleRegistry.js';
import { VibraphoneInstrument } from './vibraphoneInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

const VIBRAPHONE_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: VIBRAPHONE_SAMPLER_BASE_URL,
  fallbackBaseUrl: '/samples/mp3/vibraphone/',
  layers: VIBRAPHONE_LAYERS,
  release: 2.5,
};

export const vibraphoneManifest: InstrumentManifest = {
  id: 'vibraphone',
  name: 'Vibraphone',
  createInstrument: () => new VibraphoneInstrument(new ChordTimeline()),
  sampleManifest: VIBRAPHONE_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.6,
    pattern: 'pads',
    voicingDensity: 'rootless3',
  },
  perStyleDefaults: {
    swing: { pattern: 'pads', voicingDensity: 'rootless3' },
    bossa: { pattern: 'pads', voicingDensity: 'shell2' },
    funk: { pattern: 'inserts', voicingDensity: 'rootless4' },
    latin: { pattern: 'inserts', voicingDensity: 'rootless3' },
    ballad: { pattern: 'pads', voicingDensity: 'shell2' },
  },
};
