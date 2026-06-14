import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { DRUM_SAMPLE_FILES, SWIRLY_DRUMS_BASE_URL } from './drumSampleRegistry.js';
import { DrumInstrument } from './drumInstrument.js';

const DRUMS_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: SWIRLY_DRUMS_BASE_URL,
  fallbackBaseUrl: '/samples/mp3/drums/swirly/',
  oneshots: DRUM_SAMPLE_FILES,
  rrCount: 4,
};

export const drumsManifest: InstrumentManifest = {
  id: 'drums',
  name: 'Drums',
  createInstrument: () => new DrumInstrument(),
  sampleManifest: DRUMS_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: true,
    volume: 0.7,
    pattern: 'swing',
    bassDrumEnabled: true,
    bassDrumVolume: 0.7,
    snareEnabled: true,
    snareVolume: 0.8,
    hihatEnabled: true,
    hihatVolume: 0.65,
    hihatOpenness: 0,
    rideEnabled: true,
    rideVolume: 0.7,
    crashEnabled: true,
    crashVolume: 0.8,
    crashFrequency: 4,
    rimEnabled: false,
    rimVolume: 0.6,
    humanizeIntensity: 'med',
    // Legacy fields for backward compatibility
    ridePattern: 'swingRide',
    stirEnabled: true,
    stirVolume: 0.6,
  },
};
