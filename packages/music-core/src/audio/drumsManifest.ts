import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { DRUM_SAMPLE_FILES, DRUMS_BASE_URL } from './drumSampleRegistry.js';
import { DrumInstrument } from './drumInstrument.js';

const DRUMS_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: DRUMS_BASE_URL,
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
    rideEnabled: true,
    rideVolume: 0.7,
    ridePattern: 'swingRide',
    stirEnabled: true,
    stirVolume: 0.6,
    hihatEnabled: true,
    hihatVolume: 0.55,
  },
};
