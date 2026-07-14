import type { InstrumentManifest } from './instrumentManifest.js';
import type { SampleManifest } from './sampleManifest.js';
import {
  buildBassPluckUrls,
  buildBassMuteUrls,
  buildBassRegUrls,
  buildBassArticUrls,
} from './sampleRegistry.js';
import { BassInstrument } from './bassInstrument.js';
import { ChordTimeline } from './chordTimeline.js';

// ════════════════════════════════════════════════════════════════════════════
// Upright bass — Sneakybass pluck + mute. Swing / bossa / ballad.
// ════════════════════════════════════════════════════════════════════════════

function buildUprightLayers(): Record<string, Record<string, string>> {
  const layers: Record<string, Record<string, string>> = {};
  for (const rr of [1, 2, 3, 4] as const) {
    layers[`pluck_rr${rr}`] = buildBassPluckUrls(rr);
    layers[`mute_rr${rr}`] = buildBassMuteUrls(rr);
  }
  return layers;
}

const UPRIGHT_BASS_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: '/samples/aac/bass/',
  fallbackBaseUrl: '/samples/mp3/bass/',
  layers: buildUprightLayers(),
  release: 0.8,
};

export const uprightBassManifest: InstrumentManifest = {
  id: 'upright-bass',
  name: 'Bass',
  family: 'pitched',
  settingsPrefix: 'bass',
  createInstrument: () => new BassInstrument(new ChordTimeline(), 'upright'),
  sampleManifest: UPRIGHT_BASS_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: true,
    volume: 0.8,
    pattern: 'walking',
  },
  perStyleDefaults: {
    swing: { pattern: 'walking' },
    bossa: { pattern: 'root-5th' },
    funk: { enabled: false, volume: 0 },
    latin: { enabled: false, volume: 0 },
    ballad: { pattern: 'two-feel' },
  },
};

// ════════════════════════════════════════════════════════════════════════════
// Electric bass — darkblack reg / stac / rel / ghost. Funk / latin.
// ════════════════════════════════════════════════════════════════════════════

function buildElectricLayers(): Record<string, Record<string, string>> {
  const layers: Record<string, Record<string, string>> = {};
  for (const rr of [1, 2, 3, 4] as const) {
    layers[`reg_rr${rr}`] = buildBassRegUrls(rr);
    layers[`stac_rr${rr}`] = buildBassArticUrls('stac', rr);
    layers[`rel_rr${rr}`] = buildBassArticUrls('rel', rr);
    layers[`ghost_rr${rr}`] = buildBassArticUrls('ghost', rr);
  }
  return layers;
}

const ELECTRIC_BASS_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: '/samples/aac/bass/',
  fallbackBaseUrl: '/samples/mp3/bass/',
  layers: buildElectricLayers(),
  release: 0.6,
};

export const electricBassManifest: InstrumentManifest = {
  id: 'electric-bass',
  name: 'Electric Bass',
  family: 'pitched',
  settingsPrefix: 'bass',
  createInstrument: () => new BassInstrument(new ChordTimeline(), 'electric'),
  sampleManifest: ELECTRIC_BASS_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: true,
    volume: 0.8,
    pattern: 'syncopated',
  },
  perStyleDefaults: {
    swing: { enabled: false, volume: 0 },
    bossa: { enabled: false, volume: 0 },
    funk: { pattern: 'syncopated' },
    latin: { pattern: 'montuno' },
    ballad: { enabled: false, volume: 0 },
  },
};

/**
 * @deprecated Use {@link uprightBassManifest} / {@link electricBassManifest}.
 * Legacy alias kept for the transition period (points at the upright manifest,
 * which matches the pre-split single-bass behaviour for swing/bossa/ballad).
 */
export const bassManifest: InstrumentManifest = uprightBassManifest;
