import { ReuseSoloInstrument } from '../reuseSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Salamander Grand Piano as a solo instrument.
 * Reuses the accompaniment sampler — no additional sample loading.
 */
export const pianoSalamanderSoloManifest: SoloInstrumentManifest = {
  id: 'piano-salamander',
  name: 'Piano (Salamander)',
  category: 'reuse',
  priority: 'high',
  createInstrument(factories) {
    const sampler = factories.getReuseSampler('piano');
    if (!sampler) {
      throw new Error('Piano sampler not available for solo — load accompaniment first');
    }
    return new ReuseSoloInstrument('piano-salamander', 'Piano (Salamander)', sampler);
  },
};
