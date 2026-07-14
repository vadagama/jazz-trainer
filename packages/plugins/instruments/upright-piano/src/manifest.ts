import type { InstrumentManifest, SampleManifest } from '@jazz/music-core';
import { PianoInstrument, ChordTimeline } from '@jazz/music-core';
import { UPRIGHT_LAYERS, UPRIGHT_SAMPLER_BASE_URL } from './sampleRegistry.js';

const UPRIGHT_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: UPRIGHT_SAMPLER_BASE_URL,
  fallbackBaseUrl: '/samples/mp3/piano/upright/',
  layers: UPRIGHT_LAYERS,
  release: 1.8,
};

export const uprightPianoManifest: InstrumentManifest = {
  id: 'upright',
  name: 'Upright Piano',
  family: 'pitched',
  settingsPrefix: 'piano',
  createInstrument: () => new PianoInstrument(new ChordTimeline()),
  sampleManifest: UPRIGHT_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    profile: 'swing-sparse',
    voicingDensity: 'rootless3',
    sampleLibrary: 'upright',
  },
  perStyleDefaults: {
    swing: { profile: 'swing-sparse', voicingDensity: 'rootless3' },
    bossa: { profile: 'swing-sparse', voicingDensity: 'shell2' },
    funk: { profile: 'offbeat-push', voicingDensity: 'rootless4' },
    latin: { profile: 'basie-light', voicingDensity: 'quartal' },
    ballad: { profile: 'beginner-safe', voicingDensity: 'rootless4' },
  },
};
