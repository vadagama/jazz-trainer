import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { PERCUSSION_SAMPLE_FILES, PERCUSSION_BASE_URL } from './percussionSampleRegistry.js';
import { PercussionInstrument } from './percussionInstrument.js';

const PERCUSSION_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: PERCUSSION_BASE_URL,
  fallbackBaseUrl: '/samples/mp3/percussion/',
  oneshots: PERCUSSION_SAMPLE_FILES,
  rrCount: 4,
};

export const percussionManifest: InstrumentManifest = {
  id: 'percussion',
  name: 'Percussion',
  createInstrument: () => new PercussionInstrument(),
  sampleManifest: PERCUSSION_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    pattern: 'cascara-clave',
    congaHighEnabled: true,
    congaHighVolume: 0.7,
    congaLowEnabled: true,
    congaLowVolume: 0.75,
    timbalesEnabled: true,
    timbalesVolume: 0.65,
    cowbellEnabled: true,
    cowbellVolume: 0.6,
    claveEnabled: true,
    claveVolume: 0.7,
    shakerEnabled: true,
    shakerVolume: 0.55,
    guiroEnabled: true,
    guiroVolume: 0.5,
    triangleEnabled: true,
    triangleVolume: 0.5,
    bongoLowEnabled: false,
    bongoLowVolume: 0.65,
    tumbaEnabled: false,
    tumbaVolume: 0.7,
    cabasaEnabled: false,
    cabasaVolume: 0.55,
    tambourineEnabled: false,
    tambourineVolume: 0.5,
    vibraslapEnabled: false,
    vibraslapVolume: 0.55,
    belltreeEnabled: false,
    belltreeVolume: 0.45,
    whistleEnabled: false,
    whistleVolume: 0.5,
    sleighBellsEnabled: false,
    sleighBellsVolume: 0.4,
    humanizeIntensity: 'low',
  },
  perStyleDefaults: {
    swing: { pattern: 'cascara-clave', enabled: false },
    bossa: { pattern: 'bossa-texture', enabled: false },
    funk: { pattern: 'funk-accents', enabled: false },
    latin: { pattern: 'cascara-clave', enabled: true },
    ballad: { pattern: 'bossa-texture', enabled: false },
  },
};
