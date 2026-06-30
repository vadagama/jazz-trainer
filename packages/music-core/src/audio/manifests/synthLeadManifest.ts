import { SynthSoloInstrument } from '../synthSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * FM-synth-like lead sound — brighter, more cutting than the default synth.
 */
export const synthLeadManifest: SoloInstrumentManifest = {
  id: 'synth-lead',
  name: 'Synth Lead',
  category: 'synth',
  priority: 'normal',
  createInstrument(factories) {
    const synth = factories.createPolySynth({
      maxVoices: 8,
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.4 },
    });
    return new SynthSoloInstrument(synth);
  },
};
