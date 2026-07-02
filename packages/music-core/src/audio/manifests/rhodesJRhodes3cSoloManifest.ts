import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Rhodes — dedicated solo instrument with independent volume.
 * Uses hard velocity layer. Base URL: /samples/aac/rhodes/
 */
export const rhodesJRhodes3cSoloManifest: SoloInstrumentManifest = {
  id: 'rhodes-jrhodes3c',
  name: 'Rhodes',
  category: 'sampled',
  priority: 'high',
  samples: {
    baseUrl: '/samples/aac/rhodes/',
    notes: {
      F1: 'As_029__F1_431-mono.m4a',
      B1: 'As_035__B1_433-mono.m4a',
      E2: 'As_040__E2_435-mono.m4a',
      A2: 'As_045__A2_437-mono.m4a',
      D3: 'As_050__D3_439-mono.m4a',
      G3: 'As_055__G3_441-mono.m4a',
      B3: 'As_059__B3_443-mono.m4a',
      D4: 'As_062__D4_445-mono.m4a',
      F4: 'As_065__F4_447-mono.m4a',
      B4: 'As_071__B4_449-mono.m4a',
      E5: 'As_076__E5_451-mono.m4a',
      A5: 'As_081__A5_453-mono.m4a',
      D6: 'As_086__D6_455-mono.m4a',
      G6: 'As_091__G6_457-mono.m4a',
      C7: 'As_096__C7_459-mono.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('rhodes-jrhodes3c', 'Rhodes', sampler);
  },
};
