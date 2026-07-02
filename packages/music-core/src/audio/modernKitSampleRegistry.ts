/** Modern Kit drum sounds — mirrors {@link DrumSound} with identical categories. */
export type ModernKitSound =
  | 'bassDrum'
  | 'snare'
  | 'hihat'
  | 'hihatHalf'
  | 'hihatOpen'
  | 'ride'
  | 'crash'
  | 'rim'
  | 'highTom'
  | 'lowTom';

/** Maps each Modern Kit sound to its 4 round-robin AAC filenames. */
export const MODERN_KIT_SAMPLE_FILES: Record<ModernKitSound, string[]> = {
  bassDrum: [
    'kick_tight_rr1.m4a',
    'kick_tight_rr2.m4a',
    'kick_tight_rr3.m4a',
    'kick_tight_rr4.m4a',
  ],
  snare: [
    'snare_crisp_rr1.m4a',
    'snare_crisp_rr2.m4a',
    'snare_crisp_rr3.m4a',
    'snare_crisp_rr4.m4a',
  ],
  hihat: ['hh_closed_rr1.m4a', 'hh_closed_rr2.m4a', 'hh_closed_rr3.m4a', 'hh_closed_rr4.m4a'],
  hihatHalf: ['hh_half_rr1.m4a', 'hh_half_rr2.m4a', 'hh_half_rr3.m4a', 'hh_half_rr4.m4a'],
  hihatOpen: ['hh_open_rr1.m4a', 'hh_open_rr2.m4a', 'hh_open_rr3.m4a', 'hh_open_rr4.m4a'],
  ride: ['ride_rr1.m4a', 'ride_rr2.m4a', 'ride_rr3.m4a', 'ride_rr4.m4a'],
  crash: ['crash_rr1.m4a', 'crash_rr2.m4a', 'crash_rr3.m4a', 'crash_rr4.m4a'],
  rim: ['rim_click_rr1.m4a', 'rim_click_rr2.m4a', 'rim_click_rr3.m4a', 'rim_click_rr4.m4a'],
  highTom: ['high_tom_rr1.m4a', 'high_tom_rr2.m4a', 'high_tom_rr3.m4a', 'high_tom_rr4.m4a'],
  lowTom: ['low_tom_rr1.m4a', 'low_tom_rr2.m4a', 'low_tom_rr3.m4a', 'low_tom_rr4.m4a'],
};

/** Base URL for the Modern Kit AAC sample set. */
export const MODERN_KIT_BASE_URL = '/samples/aac/drums/modern-kit/';
