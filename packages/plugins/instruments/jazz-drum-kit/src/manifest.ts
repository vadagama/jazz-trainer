import type { InstrumentManifest, SampleManifest } from '@jazz/music-core';
import { DrumInstrument, sampleBaseUrl } from '@jazz/music-core';
import { JAZZ_DRUM_KIT_SAMPLE_FILES } from './sampleRegistry.js';

const JAZZ_DRUM_KIT_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: sampleBaseUrl('drums', 'jazz-drum-kit', 'aac'),
  fallbackBaseUrl: sampleBaseUrl('drums', 'jazz-drum-kit', 'mp3'),
  velocityOneshots: JAZZ_DRUM_KIT_SAMPLE_FILES,
  velocityLayers: ['vl5', 'vl10', 'vl15', 'vl20'],
  rrCount: 4,
};

export const jazzDrumKitManifest: InstrumentManifest = {
  id: 'jazz-drum-kit',
  name: 'Jazz Drum Kit',
  family: 'drums',
  settingsPrefix: 'drums',
  createInstrument: () => new DrumInstrument(),
  sampleManifest: JAZZ_DRUM_KIT_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: true,
    volume: 0.7,
    // Core sounds
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
    rimEnabled: false,
    rimVolume: 0.6,
    tomEnabled: true,
    tomVolume: 0.7,
    // Jazz-specific articulations
    snareEdgeEnabled: false,
    snareEdgeVolume: 0.6,
    snareDigEnabled: true,
    snareDigVolume: 0.5,
    stirEnabled: true,
    stirVolume: 0.6,
    splashEnabled: true,
    splashVolume: 0.7,
    hihatTightEnabled: true,
    hihatTightVolume: 0.7,
    hihatFootEnabled: true,
    hihatFootVolume: 0.6,
    // Not in Jazz Kit
    snareBuzzEnabled: false,
    snareBuzzVolume: 0.5,
    snareFlamEnabled: false,
    snareFlamVolume: 0.5,
    snareRimshotEnabled: false,
    snareRimshotVolume: 0.7,
    snareCrossstickEnabled: true,
    snareCrossstickVolume: 0.6,
    snareMutedEnabled: false,
    snareMutedVolume: 0.5,
    crashSizzleEnabled: false,
    crashSizzleVolume: 0.7,
    useArticulations: true,
  },
  perStyleDefaults: {
    swing: {
      pattern: 'swing',
      stirEnabled: true,
      tomEnabled: false,
    },
    bossa: {
      pattern: 'bossa',
      snareEnabled: false,
      snareEdgeEnabled: true,
      rimEnabled: true,
      tomEnabled: false,
    },
    funk: {
      pattern: 'funk',
      stirEnabled: false,
      tomEnabled: true,
    },
    latin: {
      pattern: 'funk',
      stirEnabled: false,
      tomEnabled: true,
    },
    ballad: {
      pattern: 'swing',
      volume: 0.55,
      stirEnabled: true,
      tomEnabled: false,
    },
  },
};
