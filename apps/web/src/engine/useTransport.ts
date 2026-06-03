import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import {
  TransportEngine,
  MetronomeInstrument,
  PlaybackStateMachine,
  ticksPerBar,
  parseTimeSignature,
} from '@jazz/music-core';
import type { TimeSignatureString } from '@jazz/shared';
import type { UserSettingsDTO } from '@jazz/shared';
import { usePlaybackStore } from '@/stores/usePlaybackStore';

const LOOKAHEAD_TICKS = 480 * 4;

export interface UseTransportOptions {
  settings: UserSettingsDTO;
  timeSignature: TimeSignatureString;
  totalBars: number;
}

export interface TransportControls {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  nextBar: () => void;
  prevBar: () => void;
  selectBar: (bar: number) => void;
}

export function useTransport(opts: UseTransportOptions): TransportControls {
  const { settings, timeSignature, totalBars } = opts;

  const storeRef = useRef(usePlaybackStore.getState());
  const engineRef = useRef<TransportEngine | null>(null);
  const machineRef = useRef<PlaybackStateMachine | null>(null);
  const synthRef = useRef<Tone.MembraneSynth | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScheduledRef = useRef(0);
  const initializedRef = useRef(false);

  // Keep a ref to current opts so callbacks always see latest values
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const tone = Tone.getTransport();
    tone.PPQ = 480;

    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 4,
    }).toDestination();
    synth.volume.value = Tone.gainToDb(settings.volume);
    synthRef.current = synth;

    const sink = (atTicks: number, strong: boolean) => {
      // Tone.js tick notation: "${N}i" = N ticks from transport start
      tone.scheduleOnce((time: number) => {
        synth.triggerAttackRelease(strong ? 'G4' : 'C4', '32n', time);
      }, `${atTicks}i`);
    };

    const engine = new TransportEngine({
      bpm: settings.bpm,
      timeSignature,
      sink,
    });

    const metronome = new MetronomeInstrument();
    engine.addInstrument(metronome);

    const machine = new PlaybackStateMachine(totalBars);
    machineRef.current = machine;
    engineRef.current = engine;

    const unsub = machine.subscribe((state) => {
      usePlaybackStore.getState()._setState(state);
    });

    // Sync initial state
    usePlaybackStore.getState()._setState(machine.getState());

    tone.bpm.value = settings.bpm;

    return () => {
      unsub();
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      tone.stop();
      tone.cancel();
      synth.dispose();
      engineRef.current = null;
      machineRef.current = null;
      synthRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update BPM when settings.bpm changes
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setBpm(settings.bpm);
    Tone.getTransport().bpm.value = settings.bpm;
  }, [settings.bpm]);

  // Update time signature on the engine when it changes
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setTimeSignature(timeSignature);
  }, [timeSignature]);

  // Update totalBars in the state machine
  useEffect(() => {
    if (!machineRef.current) return;
    machineRef.current.dispatch({ type: 'setTotalBars', totalBars });
  }, [totalBars]);

  const play = useCallback(async () => {
    const engine = engineRef.current;
    const machine = machineRef.current;
    if (!engine || !machine) return;

    await Tone.start();

    const tone = Tone.getTransport();
    const currentState = machine.getState();
    const sig = parseTimeSignature(optsRef.current.timeSignature);
    const tpBar = ticksPerBar(sig);

    const startTick = currentState.status === 'paused'
      ? tone.ticks
      : currentState.selectedBar * tpBar;

    tone.ticks = startTick;
    lastScheduledRef.current = startTick;
    tone.bpm.value = optsRef.current.settings.bpm;

    // Pre-schedule first lookahead window BEFORE transport starts —
    // otherwise beat 1 fires before the first interval callback (25 ms later).
    engine.scheduleWindow({ fromTicks: startTick, toTicks: startTick + LOOKAHEAD_TICKS });
    lastScheduledRef.current = startTick + LOOKAHEAD_TICKS;

    machine.dispatch({ type: 'play' });
    engine.play();
    // Small offset gives the WebAudio graph time to process the scheduled events.
    tone.start('+0.05');

    if (intervalRef.current !== null) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const currentTicks = Tone.getTransport().ticks;
      const sig2 = parseTimeSignature(optsRef.current.timeSignature);
      const tpBar2 = ticksPerBar(sig2);

      // Emit tick for UI update
      const bar = Math.floor(currentTicks / tpBar2);
      const beatTicks = currentTicks % tpBar2;
      const tpBeat = tpBar2 / sig2.beatsPerBar;
      const beat = Math.floor(beatTicks / tpBeat);
      machine.dispatch({ type: 'tick', bar, beat });

      // Schedule look-ahead window
      const from = lastScheduledRef.current;
      const to = currentTicks + LOOKAHEAD_TICKS;
      if (to > from) {
        engine.scheduleWindow({ fromTicks: from, toTicks: to });
        lastScheduledRef.current = to;
      }
    }, 25);
  }, []);

  const pause = useCallback(() => {
    const engine = engineRef.current;
    const machine = machineRef.current;
    if (!engine || !machine) return;

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    Tone.getTransport().pause();
    engine.pause();
    machine.dispatch({ type: 'pause' });
  }, []);

  const stop = useCallback(() => {
    const engine = engineRef.current;
    const machine = machineRef.current;
    if (!engine || !machine) return;

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const tone = Tone.getTransport();
    tone.stop();
    tone.cancel();
    tone.ticks = 0;
    lastScheduledRef.current = 0;

    engine.stop();
    machine.dispatch({ type: 'stop' });
  }, []);

  const nextBar = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    const state = machine.dispatch({ type: 'nextBar' });
    if (state.status === 'idle') {
      const sig = parseTimeSignature(optsRef.current.timeSignature);
      const tpBar = ticksPerBar(sig);
      Tone.getTransport().ticks = state.currentBar * tpBar;
    }
  }, []);

  const prevBar = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    const state = machine.dispatch({ type: 'prevBar' });
    if (state.status === 'idle') {
      const sig = parseTimeSignature(optsRef.current.timeSignature);
      const tpBar = ticksPerBar(sig);
      Tone.getTransport().ticks = state.currentBar * tpBar;
    }
  }, []);

  const selectBar = useCallback((bar: number) => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.dispatch({ type: 'selectBar', bar });
  }, []);

  return { play, pause, stop, nextBar, prevBar, selectBar };
}
