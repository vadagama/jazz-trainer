import { ReuseSoloInstrument } from '../reuseSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Rhodes (jRhodes3c) as a solo instrument.
 * Reuses the accompaniment sampler — no additional sample loading.
 */
export const rhodesJRhodes3cSoloManifest: SoloInstrumentManifest = {
  id: 'rhodes-jrhodes3c',
  name: 'Rhodes (jRhodes3c)',
  category: 'reuse',
  priority: 'high',
  createInstrument(factories) {
    const sampler = factories.getReuseSampler('rhodes');
    if (!sampler) {
      throw new Error('Rhodes sampler not available for solo — load accompaniment first');
    }
    return new ReuseSoloInstrument('rhodes-jrhodes3c', 'Rhodes (jRhodes3c)', sampler);
  },
};
