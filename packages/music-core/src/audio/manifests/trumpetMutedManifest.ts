import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Muted trumpet — brass with a characteristic mute timbre.
 * Samples from VSCO Community (CC0). P2 priority.
 */
export const trumpetMutedManifest: SoloInstrumentManifest = {
  id: 'trumpet-muted',
  name: 'Trumpet',
  category: 'sampled',
  priority: 'low',
  samples: {
    baseUrl: '/samples/solo/trumpet-muted/',
    notes: {
      E3: 'trumpet_E3.m4a',
      G3: 'trumpet_G3.m4a',
      Bb3: 'trumpet_Bb3.m4a',
      Db4: 'trumpet_Db4.m4a',
      E4: 'trumpet_E4.m4a',
      G4: 'trumpet_G4.m4a',
      Bb4: 'trumpet_Bb4.m4a',
      Db5: 'trumpet_Db5.m4a',
      E5: 'trumpet_E5.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('trumpet-muted', 'Trumpet', sampler);
  },
};
