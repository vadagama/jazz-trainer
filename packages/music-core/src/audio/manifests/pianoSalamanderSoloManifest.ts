import { SamplerSoloInstrument } from '../samplerSoloInstrument.js';
import type { SoloInstrumentManifest } from '../soloInstrumentManifest.js';

/**
 * Grand Piano (Salamander V3) — dedicated solo instrument with independent volume.
 * Uses hard velocity layer (v12). Base URL: /samples/aac/piano/salamander/
 */
export const pianoSalamanderSoloManifest: SoloInstrumentManifest = {
  id: 'piano-salamander',
  name: 'Grand Piano',
  category: 'sampled',
  priority: 'high',
  samples: {
    baseUrl: '/samples/aac/piano/salamander/',
    notes: {
      A0: 'A0v12.m4a',
      A1: 'A1v12.m4a',
      A2: 'A2v12.m4a',
      A3: 'A3v12.m4a',
      A4: 'A4v12.m4a',
      A5: 'A5v12.m4a',
      A6: 'A6v12.m4a',
      A7: 'A7v12.m4a',
      C1: 'C1v12.m4a',
      C2: 'C2v12.m4a',
      C3: 'C3v12.m4a',
      C4: 'C4v12.m4a',
      C5: 'C5v12.m4a',
      C6: 'C6v12.m4a',
      C7: 'C7v12.m4a',
      C8: 'C8v12.m4a',
      'D#1': 'Ds1v12.m4a',
      'D#2': 'Ds2v12.m4a',
      'D#3': 'Ds3v12.m4a',
      'D#4': 'Ds4v12.m4a',
      'D#5': 'Ds5v12.m4a',
      'D#6': 'Ds6v12.m4a',
      'D#7': 'Ds7v12.m4a',
      'F#1': 'Fs1v12.m4a',
      'F#2': 'Fs2v12.m4a',
      'F#3': 'Fs3v12.m4a',
      'F#4': 'Fs4v12.m4a',
      'F#5': 'Fs5v12.m4a',
      'F#6': 'Fs6v12.m4a',
      'F#7': 'Fs7v12.m4a',
    },
  },
  createInstrument(factories) {
    const samples = this.samples!;
    const sampler = factories.createSampler(samples.notes, samples.baseUrl);
    return new SamplerSoloInstrument('piano-salamander', 'Grand Piano', sampler);
  },
};
