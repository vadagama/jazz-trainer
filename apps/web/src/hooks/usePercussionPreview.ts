import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import type { Hit } from '@jazz/music-core';
import { getInstrument } from '../shell/instrumentRegistry';
import { createOneshotResources } from '@jazz/tone-audio-adapter';
import { useEffectiveSettings } from '@jazz/plugin-sdk';
import type {
  PercussionPreviewControls,
  PercussionPreviewPlayOptions,
} from '@jazz/plugin-sdk';

const PPQ = 480;
const BEATS_PER_BAR = 4;

/**
 * Host-side percussion preview engine. Loads the percussion instrument's
 * one-shot samples and plays flat hit lists on a standalone `Tone.Loop`,
 * independent of the grid transport.
 *
 * Simpler than `useDrumPreview`: percussion has a single instrument (no kit
 * switching) and sounds in molecules map directly to oneshot sample keys
 * (no velocity layers, no articulation map).
 */
export function usePercussionPreview(): PercussionPreviewControls {
  const settings = useEffectiveSettings();
  const audioFormat = settings.audioFormat ?? null;

  const [ready, setReady] = useState(false);
  const [currentBar, setCurrentBar] = useState(-1);
  const posTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playersRef = useRef<Map<string, Tone.Player[]>>(new Map());
  const disposeRef = useRef<() => void>(() => {});
  const masterRef = useRef<Tone.Channel | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);
  const rrRef = useRef<Record<string, number>>({});
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    const master = new Tone.Channel({ volume: 0 }).toDestination();
    masterRef.current = master;
    return () => {
      disposedRef.current = true;
      if (posTimerRef.current !== null) {
        clearInterval(posTimerRef.current);
        posTimerRef.current = null;
      }
      loopRef.current?.stop(0);
      loopRef.current?.dispose();
      loopRef.current = null;
      disposeRef.current();
      playersRef.current = new Map();
      master.dispose();
      masterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const master = masterRef.current;
    if (!master) return;
    setReady(false);
    disposeRef.current();

    const entry = getInstrument('percussion');
    if (!entry) return;
    const manifest = entry.manifest;

    const res = createOneshotResources(manifest.sampleManifest, audioFormat);
    for (const arr of res.players.values()) {
      for (const p of arr) p.connect(master);
    }
    playersRef.current = res.players;
    disposeRef.current = res.dispose;
    rrRef.current = {};

    let cancelled = false;
    const done = () => {
      if (!cancelled && !disposedRef.current) setReady(true);
    };
    void Tone.loaded().then(done, done);
    return () => {
      cancelled = true;
    };
  }, [audioFormat]);

  const triggerHit = useCallback((hit: Hit, time: number) => {
    const players = playersRef.current;
    const pool = players.get(hit.sound);
    if (!pool) return;
    const rrCount = pool.length;
    const rr = (rrRef.current[hit.sound] ?? 0) % rrCount;
    rrRef.current[hit.sound] = (rrRef.current[hit.sound] ?? 0) + 1;
    const player = pool[rr];
    if (!player || !player.loaded) return;

    const velDb = hit.velocity < 1.0 ? Tone.gainToDb(hit.velocity) : 0;
    player.volume.setValueAtTime(velDb, time);
    try {
      player.start(time);
    } catch {
      // start time collided with a pending start on this player — skip.
    }
  }, []);

  const stop = useCallback(() => {
    const transport = Tone.getTransport();
    if (posTimerRef.current !== null) {
      clearInterval(posTimerRef.current);
      posTimerRef.current = null;
    }
    setCurrentBar(-1);
    loopRef.current?.stop(0);
    loopRef.current?.dispose();
    loopRef.current = null;
    transport.stop();
    transport.cancel();
    for (const arr of playersRef.current.values()) {
      for (const p of arr) {
        try {
          p.stop();
        } catch {
          // stopping an idle player is a no-op / harmless
        }
      }
    }
  }, []);

  const play = useCallback(
    async (hits: Hit[], opts: PercussionPreviewPlayOptions) => {
      const { bpm, loopBars, loop = true } = opts;
      await Tone.start();
      stop();
      if (hits.length === 0) return;

      const secPerTick = 60 / (PPQ * bpm);
      const ordered = [...hits].sort((a, b) => a.atTick - b.atTick);

      if (!loop) {
        const t0 = Tone.now() + 0.1;
        for (const hit of ordered) triggerHit(hit, t0 + hit.atTick * secPerTick);
        return;
      }

      const transport = Tone.getTransport();
      transport.PPQ = PPQ;
      transport.bpm.value = bpm;
      transport.position = 0;
      const loopSeconds = Math.max(0.1, loopBars) * BEATS_PER_BAR * (60 / bpm);
      const l = new Tone.Loop((time) => {
        for (const hit of ordered) triggerHit(hit, time + hit.atTick * secPerTick);
      }, loopSeconds);
      l.start(0);
      loopRef.current = l;
      transport.start();

      const ticksPerBar = PPQ * BEATS_PER_BAR;
      const bars = Math.max(1, Math.round(loopBars));
      setCurrentBar(0);
      posTimerRef.current = setInterval(() => {
        const bar = Math.floor(Tone.getTransport().ticks / ticksPerBar) % bars;
        setCurrentBar(bar);
      }, 60);
    },
    [stop, triggerHit],
  );

  return { ready, play, stop, currentBar };
}
