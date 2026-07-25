/**
 * Rhodes preview hook — Tone.Sampler-based playback для конструктора Rhodes.
 *
 * Mirrors usePianoPreview, but resolves hits via `buildVoicing` +
 * `selectRhodesVoicingRole` on a reference Cmaj7 chord. Uses the jRhodes3c
 * medium-layer anchor map.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { PreviewControls } from '@jazz/plugin-admin-constructor-shared';
import type { RhodesHit, RhodesVoicingRole } from '@jazz/music-core';
import { buildVoicing, selectRhodesVoicingRole } from '@jazz/music-core';
import type { ChordSymbol } from '@jazz/shared';
import { buildRhodesSamplerUrls } from './rhodesSampler.js';

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

export function useRhodesPreview(): PreviewControls<RhodesVoicingRole> {
  const [ready, setReady] = useState(false);
  const [currentBar, setCurrentBar] = useState(-1);
  const [currentTick, setCurrentTick] = useState(-1);

  const ToneRef = useRef<any>(null);
  const samplerRef = useRef<any>(null);
  const loopRef = useRef<any>(null);
  const posTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentLoopBarsRef = useRef(0);
  const bpmRef = useRef(120);

  const initSampler = useCallback(async () => {
    if (samplerRef.current) return;

    samplerRef.current?.dispose();
    samplerRef.current = null;
    setReady(false);

    const Tone = await import('tone');
    ToneRef.current = Tone;
    await Tone.start();

    const urls = buildRhodesSamplerUrls();
    const sampler = new Tone.Sampler({ urls, baseUrl: '', release: 1.5 });
    samplerRef.current = sampler.toDestination();

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
    try {
      samplerRef.current?.dispose();
    } catch {
      /* ok */
    }
    samplerRef.current = null;
  }, []);

  const play = useCallback(
    async (hits: RhodesHit[], opts: { bpm: number; loopBars: number; loop?: boolean }) => {
      stop();
      if (hits.length === 0) return;

      if (!samplerRef.current) {
        await initSampler();
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
          // Root-position voicing every time — preview is stateless.
          const voicing = buildVoicing(PREVIEW_CHORD, 'rootless3', null);
          const notes = selectRhodesVoicingRole(voicing, hit.sound as RhodesVoicingRole);
          const dur = hit.durationTicks * secPerTick;
          notes.forEach((noteName, ni) => {
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
    [initSampler, stop],
  );

  // Preload sampler on mount
  useEffect(() => {
    void initSampler();
  }, [initSampler]);

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
