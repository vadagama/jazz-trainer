/** Latin percussion sounds for the Percussion Kit. */
export type PercussionSound =
  | 'congaHigh'
  | 'congaLow'
  | 'bongoLow'
  | 'tumba'
  | 'timbales'
  | 'cowbell'
  | 'clave'
  | 'shaker'
  | 'guiro'
  | 'cabasa'
  | 'triangle'
  | 'tambourine'
  | 'vibraslap'
  | 'belltree'
  | 'whistle'
  | 'sleighBells';

/**
 * Maps each percussion sound to its 4 round-robin AAC filenames.
 *
 * Sources (CC0 library in _source/percussion/):
 *   congaHigh  ← bongoh     (BongoH_Hit1_v2)
 *   congaLow   ← conga      (Conga_22_HitN_51_100)
 *   bongoLow   ← bongol     (BongoL_Hit1_v2)
 *   tumba      ← tumba      (Tumba_24_HitN_71_100)
 *   timbales   ← agogo      (Agogo_High_v2)
 *   cowbell    ← cowbell    (Cowbell1_Normal_v2)
 *   clave      ← claves     (Claves1_Hit_v2)
 *   shaker     ← shaker     (LShaker_Shake1U)
 *   guiro      ← guiro      (Guiro_Fast)
 *   cabasa     ← cabasa     (Cabasa1_Rub_v2)
 *   triangle   ← triangle   (Triangle1_Hit_v1)
 *   tambourine ← tambourine (Tamb1_Shake)
 *   vibraslap  ← vibraslap  (Vibraslap1_1_Hit_71_127)
 *   belltree   ← belltree   (BellTree_Stroke)
 *   whistle    ← whistle    (Close_BallWhistle_Short)
 *   sleighBells← sleighbells(Sleighbells_Hit)
 */
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

/** Base URL for the percussion sample set. */
export const PERCUSSION_BASE_URL = '/samples/aac/percussion/';
