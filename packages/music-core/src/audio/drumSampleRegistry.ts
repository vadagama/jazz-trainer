/** All drum sounds in the Swirly Drums v2 library. */
export type DrumSound =
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

/** Maps each drum sound to its 4 round-robin OGG filenames (Swirly Drums library). */
export const DRUM_SAMPLE_FILES: Record<DrumSound, string[]> = {
  bassDrum: ['bd_vl5_rr1.m4a', 'bd_vl5_rr2.m4a', 'bd_vl5_rr3.m4a', 'bd_vl5_rr4.m4a'],
  snare: ['sn_closed_rr1.m4a', 'sn_closed_rr2.m4a', 'sn_closed_rr3.m4a', 'sn_closed_rr4.m4a'],
  hihat: ['hh_closed_rr1.m4a', 'hh_closed_rr2.m4a', 'hh_closed_rr3.m4a', 'hh_closed_rr4.m4a'],
  hihatHalf: ['hh_half_rr1.m4a', 'hh_half_rr2.m4a', 'hh_half_rr3.m4a', 'hh_half_rr4.m4a'],
  hihatOpen: ['hh_open_rr1.m4a', 'hh_open_rr2.m4a', 'hh_open_rr3.m4a', 'hh_open_rr4.m4a'],
  ride: ['ride_vl6_rr1.m4a', 'ride_vl6_rr2.m4a', 'ride_vl6_rr3.m4a', 'ride_vl6_rr4.m4a'],
  crash: [
    'crash_accent_rr1.m4a',
    'crash_accent_rr2.m4a',
    'crash_accent_rr3.m4a',
    'crash_accent_rr4.m4a',
  ],
  rim: ['rim_click_rr1.m4a', 'rim_click_rr2.m4a', 'rim_click_rr3.m4a', 'rim_click_rr4.m4a'],
  highTom: [],
  lowTom: [],
};

/** Base URL for the legacy drum sample set. */
export const DRUMS_BASE_URL = '/samples/aac/drums/';

/** Base URL for the Swirly Drums v2 sample set. */
export const SWIRLY_DRUMS_BASE_URL = '/samples/aac/drums/swirly/';
