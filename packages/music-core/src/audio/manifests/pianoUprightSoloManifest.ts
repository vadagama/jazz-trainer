import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Upright Piano KW — dedicated solo instrument with independent volume.
 * Uses hard velocity layer. Base URL: /samples/aac/piano/upright/
 */
export const pianoUprightSoloManifest: SoloInstrumentManifest = {
  id: 'piano-upright',
  name: 'Upright Piano',
  category: 'sampled',
  priority: 'high',
  samples: {
    baseUrl: '/samples/aac/piano/upright/',
    notes: {
      A0: 'A0vH.m4a',
      A1: 'A1vH.m4a',
      A3: 'A3vH.m4a',
      A4: 'A4vH.m4a',
      A5: 'A5vH.m4a',
      A6: 'A6vH.m4a',
      A7: 'A7vH.m4a',
      B0: 'B0vH.m4a',
      B1: 'B1vH.m4a',
      B2: 'B2vH.m4a',
      B3: 'B3vH.m4a',
      B4: 'B4vH.m4a',
      B5: 'B5vH.m4a',
      B6: 'B6vH.m4a',
      B7: 'B7vH.m4a',
      C1: 'C1vH.m4a',
      C2: 'C2vH.m4a',
      C3: 'C3vH.m4a',
      C5: 'C5vH.m4a',
      C6: 'C6vH.m4a',
      C7: 'C7vH.m4a',
      C8: 'C8vH.m4a',
      'D#1': 'Ds1vH.m4a',
      'D#2': 'Ds2vH.m4a',
      'D#3': 'Ds3vH.m4a',
      'D#4': 'Ds4vH.m4a',
      'D#5': 'Ds5vH.m4a',
      'D#6': 'Ds6vH.m4a',
      'D#7': 'Ds7vH.m4a',
      'F#1': 'Fs1vH.m4a',
      'F#2': 'Fs2vH.m4a',
      'F#3': 'Fs3vH.m4a',
      'F#4': 'Fs4vH.m4a',
      'F#5': 'Fs5vH.m4a',
      'F#6': 'Fs6vH.m4a',
      'F#7': 'Fs7vH.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('piano-upright', 'Upright Piano', sampler);
  },
};
