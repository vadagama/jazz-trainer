import * as Tone from 'tone';
import type {
  SamplerLike,
  PolySynthLike,
  SoloInstrumentFactories,
  SynthSoloInstrumentOptions,
} from '@jazz/music-core/audio';

const DEFAULT_SYNTH_OPTIONS = {
  oscillator: { type: 'fmtriangle' as const },
  envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
};

const DEFAULT_SYNTH_PRESET = {
  maxPolyphony: 16,
  voice: Tone.Synth,
  options: DEFAULT_SYNTH_OPTIONS,
} satisfies ConstructorParameters<typeof Tone.PolySynth>[0];

function wrapForLivePlay<T extends PolySynthLike>(instrument: T): PolySynthLike {
  const ctx = Tone.getContext().rawContext;
  return {
    triggerAttack(note, time, velocity) {
      return instrument.triggerAttack(note, time ?? ctx.currentTime, velocity);
    },
    triggerRelease(note, time) {
      return instrument.triggerRelease(note, time ?? ctx.currentTime);
    },
    triggerAttackRelease: instrument.triggerAttackRelease.bind(instrument),
    connect: instrument.connect.bind(instrument),
    disconnect: instrument.disconnect.bind(instrument),
    dispose: instrument.dispose.bind(instrument),
    set: instrument.set.bind(instrument),
    get volume() {
      return instrument.volume;
    },
  };
}

export function createSoloInstrumentFactories(
  reuseSamplers: Map<string, Tone.Sampler> = new Map(),
): SoloInstrumentFactories {
  return {
    createPolySynth(options?: SynthSoloInstrumentOptions): PolySynthLike {
      const maxVoices = options?.maxVoices ?? 16;
      const preset = { ...DEFAULT_SYNTH_PRESET, maxPolyphony: maxVoices };
      if (options?.envelope) {
        preset.options = {
          ...DEFAULT_SYNTH_OPTIONS,
          envelope: { ...DEFAULT_SYNTH_OPTIONS.envelope, ...options.envelope },
        };
      }
      const polysynth = new Tone.PolySynth(preset);
      return wrapForLivePlay(polysynth as unknown as PolySynthLike);
    },

    createSampler(samples: Record<string, string>, baseUrl: string): SamplerLike {
      const sampler = new Tone.Sampler({ urls: samples, baseUrl, release: 1.0 });
      return wrapForLivePlay(sampler as unknown as SamplerLike);
    },

    getReuseSampler(instrumentId: string): SamplerLike | null {
      const sampler = reuseSamplers.get(instrumentId);
      return sampler ? wrapForLivePlay(sampler as unknown as SamplerLike) : null;
    },
  };
}
