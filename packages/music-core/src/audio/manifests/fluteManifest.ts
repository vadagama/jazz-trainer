import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Flute — light woodwind, ~C4–C7 range.
 * Samples from VSCO Community (CC0). P2 priority.
 */
export const fluteManifest: SoloInstrumentManifest = {
  id: 'flute',
  name: 'Flute',
  category: 'sampled',
  priority: 'low',
  samples: {
    baseUrl: '/samples/solo/flute/',
    notes: {
      C4: 'flute_C4.m4a',
      Eb4: 'flute_Eb4.m4a',
      Gb4: 'flute_Gb4.m4a',
      A4: 'flute_A4.m4a',
      C5: 'flute_C5.m4a',
      Eb5: 'flute_Eb5.m4a',
      Gb5: 'flute_Gb5.m4a',
      A5: 'flute_A5.m4a',
      C6: 'flute_C6.m4a',
      Eb6: 'flute_Eb6.m4a',
      Gb6: 'flute_Gb6.m4a',
      A6: 'flute_A6.m4a',
      C7: 'flute_C7.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('flute', 'Flute', sampler);
  },
};
