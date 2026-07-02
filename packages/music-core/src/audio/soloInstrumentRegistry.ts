import type { SoloInstrumentManifest } from './soloInstrumentManifest.js';

import { synthDefaultManifest } from './manifests/synthDefaultManifest.js';
import { pianoUprightSoloManifest } from './manifests/pianoUprightSoloManifest.js';
import { pianoSalamanderSoloManifest } from './manifests/pianoSalamanderSoloManifest.js';
import { rhodesJRhodes3cSoloManifest } from './manifests/rhodesJRhodes3cSoloManifest.js';
import { clarinetManifest } from './manifests/clarinetManifest.js';
import { vibraphoneManifest } from './manifests/vibraphoneManifest.js';
import { guitarNylonSoloManifest } from './manifests/guitarNylonSoloManifest.js';

/**
 * Static registry of all available solo instrument manifests.
 *
 * Ordered by priority: high-priority (always available) first,
 * then normal, then low (lazy-loaded on demand).
 *
 * Analogue of {@link INSTRUMENT_MANIFESTS} for accompaniment instruments.
 */
export const SOLO_INSTRUMENT_MANIFESTS: SoloInstrumentManifest[] = [
  // ── High priority: always available ──
  synthDefaultManifest,
  pianoUprightSoloManifest,
  pianoSalamanderSoloManifest,
  rhodesJRhodes3cSoloManifest,

  // ── Normal priority: load on first use ──
  clarinetManifest,
  vibraphoneManifest,
  guitarNylonSoloManifest,
];
