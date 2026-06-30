import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Clarinet — warm woodwind, ~C3–C6 range.
 * Samples from VSCO Community (CC0).
 */
export const clarinetManifest: SoloInstrumentManifest = {
  id: 'clarinet',
  name: 'Clarinet',
  category: 'sampled',
  priority: 'normal',
  samples: {
    baseUrl: '/samples/solo/clarinet/',
    notes: {
      C3: 'clarinet_C3.m4a',
      Eb3: 'clarinet_Eb3.m4a',
      Gb3: 'clarinet_Gb3.m4a',
      A3: 'clarinet_A3.m4a',
      C4: 'clarinet_C4.m4a',
      Eb4: 'clarinet_Eb4.m4a',
      Gb4: 'clarinet_Gb4.m4a',
      A4: 'clarinet_A4.m4a',
      C5: 'clarinet_C5.m4a',
      Eb5: 'clarinet_Eb5.m4a',
      Gb5: 'clarinet_Gb5.m4a',
      A5: 'clarinet_A5.m4a',
      C6: 'clarinet_C6.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('clarinet', 'Clarinet', sampler);
  },
};
