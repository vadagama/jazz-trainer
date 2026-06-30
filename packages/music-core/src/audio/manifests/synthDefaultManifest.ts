import { SynthSoloInstrument } from '../synthSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Default soft electric-piano-like polyphonic synth.
 * Always available — requires no sample loading.
 */
export const synthDefaultManifest: SoloInstrumentManifest = {
  id: 'synth-default',
  name: 'Synth (Default)',
  category: 'synth',
  priority: 'high',
  createInstrument(factories) {
    const synth = factories.createPolySynth({
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
    });
    return new SynthSoloInstrument(synth);
  },
};
