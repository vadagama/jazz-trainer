import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Vibraphone — metallic, jazzy, ~F2–E5 range.
 * Samples from Salamander/FreePats, hard velocity layer.
 */
export const vibraphoneManifest: SoloInstrumentManifest = {
  id: 'vibraphone',
  name: 'Vibraphone',
  category: 'sampled',
  priority: 'normal',
  samples: {
    baseUrl: '/samples/aac/vibraphone/',
    notes: {
      F2: 'vibraphone_F2_hard.m4a',
      A2: 'vibraphone_A2_hard.m4a',
      C3: 'vibraphone_C3_hard.m4a',
      E3: 'vibraphone_E3_hard.m4a',
      G3: 'vibraphone_G3_hard.m4a',
      B3: 'vibraphone_B3_hard.m4a',
      D4: 'vibraphone_D4_hard.m4a',
      F4: 'vibraphone_F4_hard.m4a',
      A4: 'vibraphone_A4_hard.m4a',
      C5: 'vibraphone_C5_hard.m4a',
      E5: 'vibraphone_E5_hard.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('vibraphone', 'Vibraphone', sampler);
  },
};
