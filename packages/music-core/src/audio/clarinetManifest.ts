import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { CLARINET_LAYERS, CLARINET_SAMPLER_BASE_URL } from './clarinetSampleRegistry.js';
import { ClarinetInstrument } from './clarinetInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

const CLARINET_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: CLARINET_SAMPLER_BASE_URL,
  fallbackBaseUrl: '/samples/mp3/clarinet/',
  layers: CLARINET_LAYERS,
  release: 1.2,
};

export const clarinetManifest: InstrumentManifest = {
  id: 'clarinet',
  name: 'Clarinet',
  createInstrument: () => new ClarinetInstrument(new ChordTimeline()),
  sampleManifest: CLARINET_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.6,
    pattern: 'counterpoint',
    voicingDensity: 'rootless3',
  },
  perStyleDefaults: {
    swing: { pattern: 'counterpoint', voicingDensity: 'rootless3' },
    bossa: { pattern: 'melodicPhrases', voicingDensity: 'shell2' },
    funk: { pattern: 'counterpoint', voicingDensity: 'rootless4' },
    latin: { pattern: 'melodicPhrases', voicingDensity: 'rootless3' },
    ballad: { pattern: 'counterpoint', voicingDensity: 'shell2' },
  },
};
