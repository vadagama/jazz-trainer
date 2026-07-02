import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Clarinet — warm woodwind, ~Bb3–F5 range.
 * Samples from VSCO Community (CC0), hard velocity layer.
 */
export const clarinetManifest: SoloInstrumentManifest = {
  id: 'clarinet',
  name: 'Clarinet',
  category: 'sampled',
  priority: 'normal',
  samples: {
    baseUrl: '/samples/aac/clarinet/',
    notes: {
      Bb3: 'clarinet_Bb3_hard.m4a',
      D3: 'clarinet_D3_hard.m4a',
      F3: 'clarinet_F3_hard.m4a',
      Bb4: 'clarinet_Bb4_hard.m4a',
      D4: 'clarinet_D4_hard.m4a',
      F4: 'clarinet_F4_hard.m4a',
      Bb5: 'clarinet_Bb5_hard.m4a',
      D5: 'clarinet_D5_hard.m4a',
      F5: 'clarinet_F5_hard.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('clarinet', 'Clarinet', sampler);
  },
};
