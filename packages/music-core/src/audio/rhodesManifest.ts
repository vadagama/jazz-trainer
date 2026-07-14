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
  family: 'pitched',
  settingsPrefix: 'rhodes',
  createInstrument: () => new RhodesInstrument(new ChordTimeline()),
  sampleManifest: RHODES_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.6,
    pattern: 'rhodes-swing-form',
    voicingDensity: 'rootless3',
  },
  perStyleDefaults: {
    swing: { pattern: 'rhodes-swing-form', voicingDensity: 'rootless3' },
    bossa: { pattern: 'rhodes-bossa-form', voicingDensity: 'shell2' },
    funk: { pattern: 'rhodes-funk-form', voicingDensity: 'rootless4' },
    latin: { pattern: 'rhodes-latin-form', voicingDensity: 'rootless3' },
    ballad: { pattern: 'rhodes-ballad-form', voicingDensity: 'shell2' },
  },
};
