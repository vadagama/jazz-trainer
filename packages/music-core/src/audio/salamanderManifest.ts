import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { SALAMANDER_LAYERS, SALAMANDER_SAMPLER_BASE_URL } from './salamanderSampleRegistry.js';
import { PianoInstrument } from './pianoInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

const SALAMANDER_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: SALAMANDER_SAMPLER_BASE_URL,
  fallbackBaseUrl: '/samples/mp3/piano/salamander/',
  layers: SALAMANDER_LAYERS,
  release: 2.0,
};

export const salamanderManifest: InstrumentManifest = {
  id: 'piano',
  name: 'Salamander Grand Piano',
  createInstrument: () => new PianoInstrument(new ChordTimeline()),
  sampleManifest: SALAMANDER_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    profile: 'swing-sparse',
    voicingDensity: 'rootless3',
    sampleLibrary: 'salamander',
  },
  perStyleDefaults: {
    swing: { profile: 'swing-sparse', voicingDensity: 'rootless3' },
    bossa: { profile: 'swing-sparse', voicingDensity: 'shell2' },
    funk: { profile: 'offbeat-push', voicingDensity: 'rootless4' },
    latin: { profile: 'basie-light', voicingDensity: 'quartal' },
    ballad: { profile: 'beginner-safe', voicingDensity: 'rootless4' },
  },
};
