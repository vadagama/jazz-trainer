import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Upright Piano (VSUpright1) — dedicated solo instrument with independent volume.
 * Uses hard velocity layer (vl3). Base URL: /samples/aac/piano/upright/
 *
 * VSUpright1 uses C3=middle-C convention; keys below are scientific (C4=middle-C).
 */
export const pianoUprightSoloManifest: SoloInstrumentManifest = {
  id: 'piano-upright',
  name: 'Upright Piano',
  category: 'sampled',
  priority: 'high',
  samples: {
    baseUrl: '/samples/aac/piano/upright/',
    notes: {
      C1: 'C0_vl3_rr1.m4a',
      C2: 'C1_vl3_rr1.m4a',
      C3: 'C2_vl3_rr1.m4a',
      C4: 'C3_vl3_rr1.m4a',
      C5: 'C4_vl3_rr1.m4a',
      C6: 'C5_vl3_rr1.m4a',
      C7: 'C6_vl3_rr1.m4a',
      G1: 'G0_vl3_rr1.m4a',
      G2: 'G1_vl3_rr1.m4a',
      G3: 'G2_vl3_rr1.m4a',
      G4: 'G3_vl3_rr1.m4a',
      G5: 'G4_vl3_rr1.m4a',
      G6: 'G5_vl3_rr1.m4a',
      G7: 'G6_vl3_rr2.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('piano-upright', 'Upright Piano', sampler);
  },
};
