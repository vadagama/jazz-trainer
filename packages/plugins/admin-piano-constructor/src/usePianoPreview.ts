/**
 * Piano preview hook — Tone.Sampler-based playback для конструктора фортепиано.
 *
 * Извлечён из PianoConstructorPage (где раньше был inline). Управляет собственным
 * Tone.Sampler (pitched sample playback) и transport, возвращает PreviewControls<VoiceRole>.
 *
 * Отличие от drum preview (usePluginDrumPreview, host-provided):
 * - использует Tone.Sampler вместо Tone.Player one-shots
 * - hit.sound = VoiceRole → резолвится в конкретные ноты через buildPianoVoicing +
 *   selectVoicingRole на референсном аккорде (Cmaj7), как в реальном плеере
 * - предоставляет currentTick для piano-roll playhead
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { PreviewControls } from '@jazz/plugin-admin-constructor-shared';
import type { PianoHit, VoiceRole } from '@jazz/music-core';
import { buildPianoVoicing, selectVoicingRole } from '@jazz/music-core';
import type { ChordSymbol } from '@jazz/shared';

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

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PianoPreviewOptions {
  /** Активный piano variant id ('piano' = Salamander | 'upright-piano' | ...). */
  activePiano: string;
  /** URL builders keyed by piano variant id. */
  samplerUrlBuilders: Record<string, () => Record<string, string>>;
}

export function usePianoPreview({
  activePiano,
  samplerUrlBuilders,
}: PianoPreviewOptions): PreviewControls<VoiceRole> {
  const [ready, setReady] = useState(false);
  const [currentBar, setCurrentBar] = useState(-1);
  const [currentTick, setCurrentTick] = useState(-1);

  const ToneRef = useRef<any>(null);
  const samplerRef = useRef<any>(null);
  const samplerPianoRef = useRef<string | null>(null);
  const loopRef = useRef<any>(null);
  const posTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentLoopBarsRef = useRef(0);
  const bpmRef = useRef(120);
  const builderRef = useRef(samplerUrlBuilders);
  builderRef.current = samplerUrlBuilders;

  const initSampler = useCallback(async (pianoId: string) => {
    if (samplerRef.current && samplerPianoRef.current === pianoId) return;

    // Dispose previous
    samplerRef.current?.dispose();
    samplerRef.current = null;
    samplerPianoRef.current = null;
    setReady(false);

    const Tone = await import('tone');
    ToneRef.current = Tone;
    await Tone.start();

    const builder = builderRef.current[pianoId] ?? builderRef.current['upright-piano'];
    const urls = builder ? builder() : {};

    const sampler = new Tone.Sampler({ urls, baseUrl: '', release: 1.5 });
    samplerRef.current = sampler.toDestination();
    samplerPianoRef.current = pianoId;

    await Tone.loaded();
    setReady(true);
  }, []);

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
    // sampler to cancel every pending voice — the next play() will recreate.
    try {
      samplerRef.current?.dispose();
    } catch {
      /* ok */
    }
    samplerRef.current = null;
  }, []);

  const play = useCallback(
    async (hits: PianoHit[], opts: { bpm: number; loopBars: number; loop?: boolean }) => {
      stop();
      if (hits.length === 0) return;

      if (!samplerRef.current || samplerPianoRef.current !== activePiano) {
        await initSampler(activePiano);
      }

      const Tone = ToneRef.current;
      const sampler = samplerRef.current;
      if (!sampler || !Tone) return;

      const bpm = opts.bpm;
      const loopBars = opts.loopBars;
      bpmRef.current = bpm;
      const secPerTick = 60 / (PPQ * bpm);
      const ordered = [...hits].sort((a, b) => a.atTick - b.atTick);

      const transport = Tone.getTransport();
      transport.bpm.value = bpm;
      transport.position = 0;

      const loopSeconds = Math.max(0.1, loopBars) * BEATS_PER_BAR * (60 / bpm);
      const l = new Tone.Loop((time: number) => {
        ordered.forEach((hit, hi) => {
          // Root-position voicing every time — preview is stateless (no voice-leading history).
          const voicing = buildPianoVoicing(PREVIEW_CHORD, 'rootless3', null, 'clean', hi);
          const notes = selectVoicingRole(voicing, hit.sound as VoiceRole);
          const dur = hit.durationTicks * secPerTick;
          notes.forEach((noteName, ni) => {
            // Микро-разнос 1ms на голос — предотвращает voice-stealing в Tone.Sampler
            const voiceOffset = (hi * notes.length + ni) * 0.001;
            sampler.triggerAttackRelease(
              noteName,
              Math.max(0.05, dur),
              time + hit.atTick * secPerTick + voiceOffset,
              hit.velocity,
            );
          });
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
    [activePiano, initSampler, stop],
  );

  // Preload sampler on mount and when activePiano changes
  useEffect(() => {
    void initSampler(activePiano);
  }, [activePiano, initSampler]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      samplerRef.current?.dispose();
      samplerRef.current = null;
    };
  }, [stop]);

  return { ready, currentBar, currentTick, play, stop };
}
