/**
 * Bass sample registry — convenience re-export of the layer builders so the
 * plugin exposes a stable public surface (matching upright-piano's pattern).
 *
 * The actual filename conventions and anchor notes live in music-core
 * (`sampleRegistry.ts`) because the manifest is authored there. This module
 * gathers them into the layer maps consumed by {@link SampleManifest.layers}.
 *
 * Two sample libraries:
 *  - **Upright** (Sneakybass): `pluck` + `mute`, 4 round-robins each.
 *    Base: /samples/aac/bass/{pluck,mute}/  (sneakybass_<note>_<artic>_rr<n>.m4a)
 *  - **Electric** (darkblack): `reg` + `stac` + `rel` + `ghost`, 4 RR each.
 *    Base: /samples/aac/bass/electric/<artic>/  (darkblack_<note>_<artic?>_rr<n>.m4a)
 */
import type { NoteMap } from '@jazz/music-core';
import {
  buildBassPluckUrls,
  buildBassMuteUrls,
  buildBassRegUrls,
  buildBassArticUrls,
} from '@jazz/music-core';

/** Base URLs for the encoded sample store (aac primary, mp3 fallback). */
export const UPRIGHT_BASS_SAMPLER_BASE_URL = '/samples/aac/bass/';
export const UPRIGHT_BASS_FALLBACK_BASE_URL = '/samples/mp3/bass/';
export const ELECTRIC_BASS_SAMPLER_BASE_URL = '/samples/aac/bass/';
export const ELECTRIC_BASS_FALLBACK_BASE_URL = '/samples/mp3/bass/';

/** Articulation palettes per variant. */
export const UPRIGHT_BASS_ARTICULATIONS = ['pluck', 'mute'] as const;
export const ELECTRIC_BASS_ARTICULATIONS = ['reg', 'stac', 'rel', 'ghost'] as const;

/** Upright layers: `<artic>_rr<n>` → NoteMap (pluck_rr1..pluck_rr4, mute_rr1..mute_rr4). */
export const UPRIGHT_BASS_LAYERS: Record<string, NoteMap> = (() => {
  const layers: Record<string, NoteMap> = {};
  for (const rr of [1, 2, 3, 4] as const) {
    layers[`pluck_rr${rr}`] = buildBassPluckUrls(rr);
    layers[`mute_rr${rr}`] = buildBassMuteUrls(rr);
  }
  return layers;
})();

/** Electric layers: `<artic>_rr<n>` → NoteMap (reg/stac/rel/ghost × rr1..rr4). */
export const ELECTRIC_BASS_LAYERS: Record<string, NoteMap> = (() => {
  const layers: Record<string, NoteMap> = {};
  for (const rr of [1, 2, 3, 4] as const) {
    layers[`reg_rr${rr}`] = buildBassRegUrls(rr);
    layers[`stac_rr${rr}`] = buildBassArticUrls('stac', rr);
    layers[`rel_rr${rr}`] = buildBassArticUrls('rel', rr);
    layers[`ghost_rr${rr}`] = buildBassArticUrls('ghost', rr);
  }
  return layers;
})();
