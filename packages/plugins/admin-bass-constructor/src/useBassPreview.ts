/**
 * Bass preview hook — Tone.Sampler-based playback для конструктора баса.
 *
 * Аналог usePianoPreview, но с ОДНИМ Tone.Sampler НА артикуляцию (у баса
 * 4 артикуляции с разными наборами нот-якорей).
 *
 * Загружает сэмплеры для ВСЕХ 4 артикуляций (regular/muted/rel/stac), чтобы
 * любая молекула — независимо от того, какой стиль выбран — проигрывалась
 * корректно. regular/muted берутся у upright (Sneakybass), rel/stac — у
 * electric (darkblack), как в реальном движке.
 *
 * Для каждого хита:
 *  1. hit.sound — это артикуляция (regular/muted/rel/stac).
 *  2. step = resolveBassStep(atTick, ...) — step engine выбирает ступень по
 *     позиции в такте и pattern (та же логика, что в BassInstrument).
 *  3. pitch = resolveBassStepPitch(step, PREVIEW_CHORD) — та же формула, что
 *     в реальном движке (octave-2 centered, C4 ceiling).
 *  4. выбираем сэмплер по артикуляции → triggerAttackRelease(pitch, ...)
 *
 * PREVIEW_CHORD = Cmaj7 (как и в piano-конструкторе) — статичный, без
 * voice-leading history.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { PreviewControls } from '@jazz/plugin-admin-constructor-shared';
import {
  resolveBassStep,
  resolveBassStepPitch,
  type BassArticulation,
  type BassHit,
  type BassPatternStyle,
} from '@jazz/music-core';
import type { ChordSymbol } from '@jazz/shared';
import {
  BASS_SAMPLER_BASE_URL,
  SAMPLER_URL_BUILDERS,
  ALL_BASS_ARTICULATIONS,
} from './bassSampler.js';
import { useBassVariantStore } from './BassVariantSelector.js';

/** Reference chord for previewing molecules — a plain Cmaj7 in root position. */
const PREVIEW_CHORD: ChordSymbol = {
  raw: 'Cmaj7',
  root: 'C',
  rootAccidental: '',
  quality: 'major',
  extensions: ['7'],
  alterations: [],
  alt: false,
  bass: null,
};

const PPQ = 480;
const BEATS_PER_BAR = 4;
const TPBAR = PPQ * BEATS_PER_BAR;

/**
 * Pattern family by molecule style — mirrors BassInstrument's STYLE_DEFAULT_PATTERN.
 * The step engine needs this to pick idiomatic chord steps per style.
 */
const PATTERN_FOR_STYLE: Record<BassPatternStyle, 'walking' | 'root-5th' | 'syncopated' | 'montuno' | 'two-feel'> = {
  swing: 'walking',
  bossa: 'root-5th',
  funk: 'syncopated',
  latin: 'montuno',
  ballad: 'two-feel',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useBassPreview(): PreviewControls<BassArticulation> {
  const [ready, setReady] = useState(false);
  const [currentBar, setCurrentBar] = useState(-1);
  const [currentTick, setCurrentTick] = useState(-1);
  // Active variant from the constructor toolbar (upright | electric). Drives
  // which sample libraries regular/muted load from. rel/stac always load from
  // electric (they're electric-only). Changing variant reloads samplers.
  const activeVariant = useBassVariantStore((s) => s.activeVariant);

  const ToneRef = useRef<any>(null);
  /** Один Tone.Sampler на артикуляцию: { [artic]: Sampler }. */
  const samplersRef = useRef<Map<BassArticulation, any>>(new Map());
  const samplersInitRef = useRef(false);
  const loopRef = useRef<any>(null);
  const posTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentLoopBarsRef = useRef(0);
  const bpmRef = useRef(120);

  const disposeSamplers = useCallback(() => {
    for (const s of samplersRef.current.values()) {
      try {
        s.dispose();
      } catch {
        /* ok */
      }
    }
    samplersRef.current.clear();
  }, []);

  const initSamplers = useCallback(async () => {
    disposeSamplers();
    setReady(false);

    const Tone = await import('tone');
    ToneRef.current = Tone;
    await Tone.start();

    // Грузим сэмплеры для всех 4 артикуляций. regular/muted берутся у активного
    // варианта (upright → Sneakybass, electric → darkblack), rel/stac — всегда у
    // electric (electric-only). Так preview звучит тем же тембром, что выбрал
    // пользователь в тулбаре конструктора.
    for (const artic of ALL_BASS_ARTICULATIONS) {
      const variant =
        artic === 'rel' || artic === 'stac' ? 'electric' : activeVariant;
      const urls = SAMPLER_URL_BUILDERS[variant][artic]();
      const sampler = new Tone.Sampler({ urls, baseUrl: BASS_SAMPLER_BASE_URL, release: 1.5 });
      samplersRef.current.set(artic, sampler.toDestination());
    }

    await Tone.loaded();
    samplersInitRef.current = true;
    setReady(true);
  }, [disposeSamplers, activeVariant]);

  const stop = useCallback(() => {
    if (posTimerRef.current) {
      clearInterval(posTimerRef.current);
      posTimerRef.current = null;
    }
    setCurrentBar(-1);
    setCurrentTick(-1);
    loopRef.current?.stop(0);
    loopRef.current?.dispose();
    loopRef.current = null;
    const transport = ToneRef.current?.getTransport();
    transport?.stop();
    transport?.cancel();
    // transport.cancel() clears future Loop callbacks, but triggerAttackRelease
    // calls already scheduled on the AudioContext timeline survive. Dispose the
    // samplers to cancel every pending voice — the next play() will recreate.
    disposeSamplers();
    samplersInitRef.current = false;
  }, [disposeSamplers]);

  const play = useCallback(
    async (hits: BassHit[], opts: { bpm: number; loopBars: number; loop?: boolean; style?: string }) => {
      stop();
      if (hits.length === 0) return;

      if (samplersRef.current.size === 0) {
        await initSamplers();
      }

      const Tone = ToneRef.current;
      if (!Tone || samplersRef.current.size === 0) return;

      const bpm = opts.bpm;
      const loopBars = opts.loopBars;
      bpmRef.current = bpm;
      const secPerTick = 60 / (PPQ * bpm);
      const ordered = [...hits].sort((a, b) => a.atTick - b.atTick);
      const pattern = PATTERN_FOR_STYLE[(opts.style as BassPatternStyle) ?? 'swing'];

      const transport = Tone.getTransport();
      transport.bpm.value = bpm;
      transport.position = 0;

      const loopSeconds = Math.max(0.1, loopBars) * BEATS_PER_BAR * (60 / bpm);
      const l = new Tone.Loop((time: number) => {
        ordered.forEach((hit, hi) => {
          const articulation = hit.sound as BassArticulation;
          // Step engine: which chord degree at this tick? (preview tension = clean)
          const step = resolveBassStep(hit.atTick % TPBAR, PPQ, TPBAR, PREVIEW_CHORD, {
            pattern,
            tension: 'clean',
          });
          const pitch = resolveBassStepPitch(step, PREVIEW_CHORD);
          if (!pitch) return;
          const sampler = samplersRef.current.get(articulation);
          if (!sampler) return;
          const dur = hit.durationTicks * secPerTick;
          // Микро-разнос 1ms на голос — предотвращает voice-stealing в Tone.Sampler
          const voiceOffset = (hi * 1) * 0.001;
          sampler.triggerAttackRelease(
            pitch,
            Math.max(0.05, dur),
            time + hit.atTick * secPerTick + voiceOffset,
            hit.velocity,
          );
        });
      }, loopSeconds);
      // Даём Tone.js 100ms на подготовку шедулинга, чтобы loop-колбэк не опаздывал
      l.start(0);
      loopRef.current = l;
      transport.start('+0.1');

      const ticksPerBar = PPQ * BEATS_PER_BAR;
      const bars = Math.max(1, Math.round(loopBars));
      const loopTicks = loopBars * BEATS_PER_BAR * PPQ;
      currentLoopBarsRef.current = loopBars;
      setCurrentBar(0);
      setCurrentTick(0);
      posTimerRef.current = setInterval(() => {
        const ticks = transport.ticks;
        const tick = Math.round(ticks % loopTicks);
        setCurrentTick(tick);
        const bar = Math.floor(ticks / ticksPerBar) % bars;
        setCurrentBar(bar);
      }, 40);
    },
    [initSamplers, stop],
  );

  // Preload samplers on mount
  useEffect(() => {
    void initSamplers();
  }, [initSamplers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      disposeSamplers();
    };
  }, [stop, disposeSamplers]);

  return { ready, currentBar, currentTick, play, stop };
}
