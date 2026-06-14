import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { RHODES_LAYERS, RHODES_SAMPLER_BASE_URL } from './rhodesSampleRegistry.js';
import { RhodesInstrument } from './rhodesInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

const RHODES_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: RHODES_SAMPLER_BASE_URL,
  fallbackBaseUrl: '/samples/mp3/rhodes/',
  layers: RHODES_LAYERS,
  release: 1.5,
};

export const rhodesManifest: InstrumentManifest = {
  id: 'rhodes',
  name: 'Rhodes',
  createInstrument: () => new RhodesInstrument(new ChordTimeline()),
  sampleManifest: RHODES_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.6,
    mode: 'halfNotes',
    voicingDensity: 'rootless3',
  },
};
