import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Nylon-string acoustic guitar, ~E2–E5 range.
 */
export const guitarNylonSoloManifest: SoloInstrumentManifest = {
  id: 'guitar-nylon',
  name: 'Guitar (Nylon)',
  category: 'sampled',
  priority: 'normal',
  samples: {
    baseUrl: '/samples/solo/guitar-nylon/',
    notes: {
      E2: 'guitar_E2.m4a',
      G2: 'guitar_G2.m4a',
      Bb2: 'guitar_Bb2.m4a',
      Db3: 'guitar_Db3.m4a',
      E3: 'guitar_E3.m4a',
      G3: 'guitar_G3.m4a',
      Bb3: 'guitar_Bb3.m4a',
      Db4: 'guitar_Db4.m4a',
      E4: 'guitar_E4.m4a',
      G4: 'guitar_G4.m4a',
      Bb4: 'guitar_Bb4.m4a',
      Db5: 'guitar_Db5.m4a',
      E5: 'guitar_E5.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('guitar-nylon', 'Guitar (Nylon)', sampler);
  },
};
