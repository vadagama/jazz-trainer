import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { ORGAN_LAYERS, ORGAN_SAMPLER_BASE_URL } from './organSampleRegistry.js';
import { OrganInstrument } from './organInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

const ORGAN_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: ORGAN_SAMPLER_BASE_URL,
  fallbackBaseUrl: '/samples/mp3/organ/',
  layers: ORGAN_LAYERS,
  release: 2.0,
};

export const organManifest: InstrumentManifest = {
  id: 'organ',
  name: 'Organ (Hammond)',
  family: 'pitched',
  settingsPrefix: 'organ',
  createInstrument: () => new OrganInstrument(new ChordTimeline()),
  sampleManifest: ORGAN_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.65,
    pattern: 'pads',
    voicingDensity: 'rootless4',
  },
  perStyleDefaults: {
    swing: { pattern: 'pads', voicingDensity: 'rootless4' },
    bossa: { pattern: 'pads', voicingDensity: 'shell2' },
    funk: { pattern: 'pads-stabs', voicingDensity: 'rootless4' },
    latin: { pattern: 'pads', voicingDensity: 'rootless4' },
    ballad: { pattern: 'pads', voicingDensity: 'rootless4' },
  },
};
