import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { UPRIGHT_LAYERS, UPRIGHT_SAMPLER_BASE_URL } from './pianoSampleRegistry.js';
import { PianoInstrument } from './pianoInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

const UPRIGHT_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: UPRIGHT_SAMPLER_BASE_URL,
  fallbackBaseUrl: '/samples/mp3/piano/upright/',
  layers: UPRIGHT_LAYERS,
  release: 1.8,
};

export const pianoManifest: InstrumentManifest = {
  id: 'piano',
  name: 'Upright Piano KW',
  createInstrument: () => new PianoInstrument(new ChordTimeline()),
  sampleManifest: UPRIGHT_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    profile: 'swing-sparse',
    voicingDensity: 'rootless3',
    sampleLibrary: 'upright-kw',
  },
};
