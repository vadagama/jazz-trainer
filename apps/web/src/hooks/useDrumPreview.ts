import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { resolveDrumSound, selectDrumPlayer, type DrumHit } from '@jazz/music-core';
import { resolveDrumKit, drumArticulationMap } from '../shell/instrumentRegistry';
import { createOneshotResources } from '@jazz/tone-audio-adapter';
import { useEffectiveSettings } from '@jazz/plugin-sdk';
import type { DrumPreviewControls, DrumPreviewKit, DrumPreviewPlayOptions } from '@jazz/plugin-sdk';

const PPQ = 480;
const BEATS_PER_BAR = 4;

/**
 * Host-side drum preview engine. Loads a drum kit's one-shot samples and plays
 * flat hit lists on a standalone `Tone.Loop`, independent of the grid transport.
 * Injected into plugins via `PluginProvider` (see {@link DrumPreviewControls}).
 */
export function useDrumPreview(): DrumPreviewControls {
  const settings = useEffectiveSettings();
  const audioFormat = settings.audioFormat ?? null;

  const [kit, setKitState] = useState<DrumPreviewKit>('jazz-drum-kit');
  const [ready, setReady] = useState(false);
  /** Текущий проигрываемый такт (0-based) в цикле; -1 когда остановлено. */
  const [currentBar, setCurrentBar] = useState(-1);
  const posTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playersRef = useRef<Map<string, Tone.Player[]>>(new Map());
  const disposeRef = useRef<() => void>(() => {});
  const masterRef = useRef<Tone.Channel | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);
  const rrRef = useRef<Record<string, number>>({});
  /** Players per velocity layer (manifest.rrCount) — for layer-aware round-robin. */
  const rrPerLayerRef = useRef(4);
  const disposedRef = useRef(false);

  // Master channel → destination (created once).
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

  // (Re)load samples whenever the kit or audio format changes.
  useEffect(() => {
    const master = masterRef.current;
    if (!master) return;
    setReady(false);
    disposeRef.current();

    const manifest = resolveDrumKit(kit).manifest;
    const res = createOneshotResources(manifest.sampleManifest, audioFormat);
    for (const arr of res.players.values()) {
      for (const p of arr) p.connect(master);
    }
    playersRef.current = res.players;
    disposeRef.current = res.dispose;
    rrPerLayerRef.current = manifest.sampleManifest.rrCount ?? 4;
    rrRef.current = {};

    let cancelled = false;
    // Flip ready once all buffers settle — even if some fail to decode, so the
    // loading indicator never hangs on a single bad sample.
    const done = () => {
      if (!cancelled && !disposedRef.current) setReady(true);
    };
    void Tone.loaded().then(done, done);
    return () => {
      cancelled = true;
    };
  }, [kit, audioFormat]);

  /** Resolve abstract molecule sound → concrete kit sample key, then trigger. */
  const triggerHit = useCallback(
    (hit: DrumHit, time: number) => {
      const players = playersRef.current;
      // Molecules carry abstract sound names (hihat, ride, snare…); resolve to
      // the active kit's concrete articulation keys via the same maps the main
      // player uses. assembleBar() with useArticulations:false leaves names abstract.
      const artMap = drumArticulationMap(kit);
      const concreteSound = artMap[hit.sound] ?? hit.sound;

      const resolved = resolveDrumSound(concreteSound, players);
      if (!resolved) return;
      const pool = players.get(resolved);
      if (!pool) return;

      const sel = selectDrumPlayer(
        hit.velocity,
        pool.length,
        rrPerLayerRef.current,
        rrRef.current,
        resolved,
      );
      if (!sel) return;
      const player = pool[sel.playerIndex];
      if (!player || !player.loaded) return;

      player.volume.value = sel.volumeDb;
      // Tone's monophonic Player.start asserts each start time is strictly
      // greater than the previous one on that player. Two same-sound hits that
      // round-robin back to the same player at the same tick would throw and —
      // inside the scheduling loop — abort every remaining hit of the pattern.
      // Swallow it: dropping one duplicate voice is inaudible, silencing the
      // rest of the bars is not.
      try {
        player.start(time);
      } catch {
        // start time collided with a pending start on this player — skip.
      }
    },
    [kit],
  );

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
    // The loop schedules a whole pattern's `player.start(futureTime)` calls up
    // front; these live on the players, not the transport, so cancel() alone
    // won't silence them. Stop every player to also cancel pending starts.
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
    async (hits: DrumHit[], opts: DrumPreviewPlayOptions) => {
      const { bpm, loopBars, loop = true } = opts;
      await Tone.start();
      stop();
      if (hits.length === 0) return;

      const secPerTick = 60 / (PPQ * bpm);
      // Schedule in chronological order. The incoming list is bar-sorted but not
      // time-sorted (lanes emit hits per-lane, so a late-beat hit of lane A can
      // precede an early-beat hit of lane B). Round-robin players require
      // strictly-increasing start times, so hand them hits already in time order.
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

      // Playhead: сообщаем текущий такт цикла (для подсветки в редакторе).
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

  const setKit = useCallback(
    (next: DrumPreviewKit) => {
      stop();
      setKitState(next);
    },
    [stop],
  );

  return { ready, kit, setKit, play, stop, currentBar };
}
