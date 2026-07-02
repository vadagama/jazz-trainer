import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Nylon-string acoustic guitar, ~A1–C6 range.
 */
export const guitarNylonSoloManifest: SoloInstrumentManifest = {
  id: 'guitar-nylon',
  name: 'Acoustic Guitar',
  category: 'sampled',
  priority: 'normal',
  samples: {
    baseUrl: '/samples/aac/guitar/nylon-guitar/',
    notes: {
      A1: 'a1.m4a',
      'A#1': 'as1.m4a',
      B1: 'b1.m4a',
      C2: 'c2.m4a',
      'C#2': 'cs2.m4a',
      D2: 'd2.m4a',
      'D#2': 'ds2.m4a',
      E2: 'e2.m4a',
      F2: 'f2.m4a',
      G2: 'g2.m4a',
      A2: 'a2.m4a',
      B2: 'b2.m4a',
      C3: 'c3.m4a',
      D3: 'd3.m4a',
      E3: 'e3.m4a',
      F3: 'f3.m4a',
      'F#3': 'fs3.m4a',
      G3: 'g3.m4a',
      'G#3': 'gs3.m4a',
      A3: 'a3.m4a',
      'A#3': 'as3.m4a',
      B3: 'b3.m4a',
      C4: 'c4.m4a',
      'C#4': 'cs4.m4a',
      D4: 'd4.m4a',
      'D#4': 'ds4.m4a',
      E4: 'e4.m4a',
      F4: 'f4.m4a',
      'F#4': 'fs4.m4a',
      G4: 'g4.m4a',
      A4: 'a4.m4a',
      'A#4': 'as4.m4a',
      B4: 'b4.m4a',
      C5: 'c5.m4a',
      'C#5': 'cs5.m4a',
      D5: 'd5.m4a',
      'D#5': 'ds5.m4a',
      E5: 'e5.m4a',
      F5: 'f5.m4a',
      'F#5': 'fs5.m4a',
      G5: 'g5.m4a',
      'G#5': 'gs5.m4a',
      A5: 'a5.m4a',
      'A#5': 'as5.m4a',
      B5: 'b5.m4a',
      C6: 'c6.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('guitar-nylon', 'Acoustic Guitar', sampler);
  },
};
