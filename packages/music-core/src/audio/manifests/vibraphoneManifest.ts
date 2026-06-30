import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Vibraphone — metallic, jazzy, ~F3–F6 range.
 * Samples from Salamander/FreePats.
 */
export const vibraphoneManifest: SoloInstrumentManifest = {
  id: 'vibraphone',
  name: 'Vibraphone',
  category: 'sampled',
  priority: 'normal',
  samples: {
    baseUrl: '/samples/solo/vibraphone/',
    notes: {
      F3: 'vibraphone_F3.m4a',
      A3: 'vibraphone_A3.m4a',
      C4: 'vibraphone_C4.m4a',
      Eb4: 'vibraphone_Eb4.m4a',
      F4: 'vibraphone_F4.m4a',
      A4: 'vibraphone_A4.m4a',
      C5: 'vibraphone_C5.m4a',
      Eb5: 'vibraphone_Eb5.m4a',
      F5: 'vibraphone_F5.m4a',
      A5: 'vibraphone_A5.m4a',
      C6: 'vibraphone_C6.m4a',
      Eb6: 'vibraphone_Eb6.m4a',
      F6: 'vibraphone_F6.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('vibraphone', 'Vibraphone', sampler);
  },
};
