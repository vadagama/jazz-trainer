/** All drum sounds in the Swirly Drums v2 library. */
export type DrumSound =
  | 'bassDrum'
  | 'snare'
  | 'hihat'
  | 'hihatHalf'
  | 'hihatOpen'
  | 'ride'
  | 'crash'
  | 'rim';

/** Maps each drum sound to its 4 round-robin OGG filenames (Swirly Drums library). */
export const DRUM_SAMPLE_FILES: Record<DrumSound, string[]> = {
  bassDrum: ['bd_vl5_rr1.ogg', 'bd_vl5_rr2.ogg', 'bd_vl5_rr3.ogg', 'bd_vl5_rr4.ogg'],
  snare: ['sn_closed_rr1.ogg', 'sn_closed_rr2.ogg', 'sn_closed_rr3.ogg', 'sn_closed_rr4.ogg'],
  hihat: ['hh_closed_rr1.ogg', 'hh_closed_rr2.ogg', 'hh_closed_rr3.ogg', 'hh_closed_rr4.ogg'],
  hihatHalf: ['hh_half_rr1.ogg', 'hh_half_rr2.ogg', 'hh_half_rr3.ogg', 'hh_half_rr4.ogg'],
  hihatOpen: ['hh_open_rr1.ogg', 'hh_open_rr2.ogg', 'hh_open_rr3.ogg', 'hh_open_rr4.ogg'],
  ride: ['ride_vl6_rr1.ogg', 'ride_vl6_rr2.ogg', 'ride_vl6_rr3.ogg', 'ride_vl6_rr4.ogg'],
  crash: [
    'crash_accent_rr1.ogg',
    'crash_accent_rr2.ogg',
    'crash_accent_rr3.ogg',
    'crash_accent_rr4.ogg',
  ],
  rim: ['rim_click_rr1.ogg', 'rim_click_rr2.ogg', 'rim_click_rr3.ogg', 'rim_click_rr4.ogg'],
};

/** Base URL for the legacy drum sample set. */
export const DRUMS_BASE_URL = '/samples/drums/';

/** Base URL for the Swirly Drums v2 sample set. */
export const SWIRLY_DRUMS_BASE_URL = '/samples/drums/swirly/';
