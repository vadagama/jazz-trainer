import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { MODERN_KIT_SAMPLE_FILES, MODERN_KIT_BASE_URL } from './modernKitSampleRegistry.js';
import { DrumInstrument } from './drumInstrument.js';

const MODERN_KIT_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: MODERN_KIT_BASE_URL,
  fallbackBaseUrl: '/samples/mp3/drums/modern-kit/',
  oneshots: MODERN_KIT_SAMPLE_FILES,
  rrCount: 4,
};

export const modernKitManifest: InstrumentManifest = {
  id: 'modern-kit',
  name: 'Modern Drum Kit',
  createInstrument: () => new DrumInstrument(),
  sampleManifest: MODERN_KIT_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: true,
    volume: 0.75,
    pattern: 'swing',
    bassDrumEnabled: true,
    bassDrumVolume: 0.75,
    snareEnabled: true,
    snareVolume: 0.8,
    hihatEnabled: true,
    hihatVolume: 0.7,
    hihatOpenness: 0,
    rideEnabled: true,
    rideVolume: 0.7,
    crashEnabled: true,
    crashVolume: 0.8,
    crashFrequency: 4,
    rimEnabled: false,
    rimVolume: 0.6,
    tomEnabled: true,
    tomVolume: 0.7,
    humanizeIntensity: 'med',
    ridePattern: 'swingRide',
    stirEnabled: true,
    stirVolume: 0.6,
  },
  perStyleDefaults: {
    swing: { pattern: 'swing' },
    bossa: { pattern: 'bossa', snareEnabled: false, rimEnabled: true },
    funk: { pattern: 'funk' },
    latin: { pattern: 'funk' },
    ballad: { pattern: 'swing', volume: 0.6 },
  },
};
