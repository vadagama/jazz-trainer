export type DrumSound = 'ride' | 'stir' | 'hihatFoot';

export const DRUM_SAMPLE_FILES: Record<DrumSound, [string, string, string, string]> = {
  ride:      ['ride_vl6_rr1.ogg', 'ride_vl6_rr2.ogg', 'ride_vl6_rr3.ogg', 'ride_vl6_rr4.ogg'],
  stir:      ['stir_dl2_skin_rr1.ogg', 'stir_dl2_skin_rr2.ogg', 'stir_dl2_skin_rr3.ogg', 'stir_dl2_skin_rr4.ogg'],
  hihatFoot: ['hh_foot_vl5_rr1.ogg', 'hh_foot_vl5_rr2.ogg', 'hh_foot_vl5_rr3.ogg', 'hh_foot_vl5_rr4.ogg'],
};

export const DRUMS_BASE_URL = '/samples/drums/';
