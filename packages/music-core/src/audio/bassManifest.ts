import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import { buildBassPluckUrls, buildBassMuteUrls } from './sampleRegistry.js';
import { BassInstrument } from './bassInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

function buildBassLayers(): Record<string, Record<string, string>> {
  const layers: Record<string, Record<string, string>> = {};
  for (const rr of [1, 2, 3, 4] as const) {
    layers[`pluck_rr${rr}`] = buildBassPluckUrls(rr);
    layers[`mute_rr${rr}`] = buildBassMuteUrls(rr);
  }
  return layers;
}

const BASS_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: '/samples/aac/bass/',
  fallbackBaseUrl: '/samples/mp3/bass/',
  layers: buildBassLayers(),
  release: 0.8,
};

export const bassManifest: InstrumentManifest = {
  id: 'bass',
  name: 'Bass',
  createInstrument: () => new BassInstrument(new ChordTimeline()),
  sampleManifest: BASS_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: true,
    volume: 0.8,
    complexity: 3,
    octaveUp: false,
  },
  perStyleDefaults: {
    swing: { complexity: 5 }, // walking bass — четверти + approach notes
    bossa: { complexity: 3 }, // root-5th — половинные
    funk: { complexity: 5 }, // syncopated eighths — пропуск 1-й доли
    latin: { complexity: 4 }, // montuno — нота-пауза-нота
    ballad: { complexity: 7 }, // two-feel — половинные
  },
};
