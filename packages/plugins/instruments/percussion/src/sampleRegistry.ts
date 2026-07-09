/**
 * Percussion sample registry — 16 Latin percussion sounds, 4 round-robin each.
 *
 * The `PercussionSound` vocabulary lives in core (`@jazz/music-core`); this file
 * only describes how those sounds map to concrete AAC sample files.
 *
 * Sources: CC0 library in apps/web/public/samples/_source/percussion/.
 */
import type { PercussionSound } from '@jazz/music-core';

/** Maps each percussion sound to its 4 round-robin AAC filenames. */
export const PERCUSSION_SAMPLE_FILES: Record<PercussionSound, string[]> = {
  congaHigh: ['conga_hi_rr1.m4a', 'conga_hi_rr2.m4a', 'conga_hi_rr3.m4a', 'conga_hi_rr4.m4a'],
  congaLow: ['conga_lo_rr1.m4a', 'conga_lo_rr2.m4a', 'conga_lo_rr3.m4a', 'conga_lo_rr4.m4a'],
  bongoLow: ['bongo_lo_rr1.m4a', 'bongo_lo_rr2.m4a', 'bongo_lo_rr3.m4a', 'bongo_lo_rr4.m4a'],
  tumba: ['tumba_rr1.m4a', 'tumba_rr2.m4a', 'tumba_rr3.m4a', 'tumba_rr4.m4a'],
  timbales: ['timbales_rr1.m4a', 'timbales_rr2.m4a', 'timbales_rr3.m4a', 'timbales_rr4.m4a'],
  cowbell: ['cowbell_rr1.m4a', 'cowbell_rr2.m4a', 'cowbell_rr3.m4a', 'cowbell_rr4.m4a'],
  clave: ['clave_rr1.m4a', 'clave_rr2.m4a', 'clave_rr3.m4a', 'clave_rr4.m4a'],
  shaker: ['shaker_rr1.m4a', 'shaker_rr2.m4a', 'shaker_rr3.m4a', 'shaker_rr4.m4a'],
  guiro: ['guiro_rr1.m4a', 'guiro_rr2.m4a', 'guiro_rr3.m4a', 'guiro_rr4.m4a'],
  cabasa: ['cabasa_rr1.m4a', 'cabasa_rr2.m4a', 'cabasa_rr3.m4a', 'cabasa_rr4.m4a'],
  triangle: ['triangle_rr1.m4a', 'triangle_rr2.m4a', 'triangle_rr3.m4a', 'triangle_rr4.m4a'],
  tambourine: [
    'tambourine_rr1.m4a',
    'tambourine_rr2.m4a',
    'tambourine_rr3.m4a',
    'tambourine_rr4.m4a',
  ],
  vibraslap: ['vibraslap_rr1.m4a', 'vibraslap_rr2.m4a', 'vibraslap_rr3.m4a', 'vibraslap_rr4.m4a'],
  belltree: ['belltree_rr1.m4a', 'belltree_rr2.m4a', 'belltree_rr3.m4a', 'belltree_rr4.m4a'],
  whistle: ['whistle_rr1.m4a', 'whistle_rr2.m4a', 'whistle_rr3.m4a', 'whistle_rr4.m4a'],
  sleighBells: [
    'sleigh_bells_rr1.m4a',
    'sleigh_bells_rr2.m4a',
    'sleigh_bells_rr3.m4a',
    'sleigh_bells_rr4.m4a',
  ],
};
