import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import {
  TransportEngine,
  MetronomeInstrument,
  BassInstrument,
  ChordTimeline,
  RoundRobinCounter,
  PlaybackStateMachine,
  parseChord,
  ticksPerBar,
  parseTimeSignature,
  defaultSecondStrongBeats,
  METRONOME_SAMPLE_BY_ID,
  buildBassFingerUrls,
  type BeatType,
  type NoteSink,
  type ChordTimelineEntry,
} from '@jazz/music-core';
import type { TimeSignatureString, Section, ClickSound } from '@jazz/shared';
import type { UserSettingsDTO } from '@jazz/shared';
import { usePlaybackStore } from '@/stores/usePlaybackStore';

const LOOKAHEAD_TICKS = 480 * 4;

/**
 * Flat playback sequence resolved from sections with repeat markers.
 * Each entry is the original 0-based bar index in the grid.
 * For infinite loops, Tone.Transport.loop is configured and infiniteLoopStart
 * marks where the loop region begins in the virtual sequence.
 */
interface FlatSequence {
  bars: number[];
  infiniteLoopStart: number | null;
}

/**
 * Expand sections into a linear playback order respecting repeatEnd markers.
 * - repeatEnd.count = N  → play that section N times total
 * - repeatEnd.count = null on the LAST section → infinite loop via Transport.loop
 * Only the last bar of each section is checked for a repeatEnd marker.
 */
/**
 * Recursively expand bars [from..to] respecting nested repeat markers.
 * The LAST repeatEnd in the range is the outermost repeat — it plays the whole
 * sub-range (including inner repeats) N times. Earlier markers are inner repeats.
 *
 * Example: [b0, b1(×2), b2, b3(×2)]
 *   outer = b3(×2) → play [b0..b3] twice
 *   inner = b1(×2) → play [b0..b1] twice on each outer pass
 *   result: b0 b1 b0 b1 b2 b3  b0 b1 b0 b1 b2 b3
 */
function expandRange(
  sectionBars: Section['bars'],
  from: number,
  to: number,
  globalOffset: number,
  result: number[],
): void {
  if (from > to) return;

  // Find the LAST repeatEnd in [from..to] — it is the outermost for this range.
  let outerIdx = -1;
  for (let bi = to; bi >= from; bi--) {
    if (sectionBars[bi]?.repeatEnd) { outerIdx = bi; break; }
  }

  if (outerIdx === -1) {
    // No repeats — linear pass.
    for (let bi = from; bi <= to; bi++) result.push(globalOffset + bi);
    return;
  }

  const times = sectionBars[outerIdx]!.repeatEnd!.count ?? 1;

  // Play [from..outerIdx] `times` times; on every pass expand inner repeats.
  for (let t = 0; t < times; t++) {
    expandRange(sectionBars, from, outerIdx - 1, globalOffset, result);
    result.push(globalOffset + outerIdx); // repeat-end bar itself (plain)
  }

  // Bars after the outermost repeat in this range — by definition no more repeats.
  for (let bi = outerIdx + 1; bi <= to; bi++) result.push(globalOffset + bi);
}

function buildFlatSequence(sections: Section[]): FlatSequence {
  const bars: number[] = [];
  let globalOffset = 0;
  let infiniteLoopStart: number | null = null;

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]!;
    const sectionBars = section.bars;
    const isLastSection = si === sections.length - 1;

    const lastBar = sectionBars[sectionBars.length - 1];
    const isInfiniteSection = isLastSection && lastBar?.repeatEnd?.count === null;

    if (isInfiniteSection) {
      // Infinite loop: expand inner structure once, Tone.Transport.loop repeats it.
      infiniteLoopStart = bars.length;
      expandRange(sectionBars, 0, sectionBars.length - 2, globalOffset, bars);
      bars.push(globalOffset + sectionBars.length - 1); // last bar (plain, loop boundary)
    } else {
      expandRange(sectionBars, 0, sectionBars.length - 1, globalOffset, bars);
    }

    globalOffset += sectionBars.length;
  }

  return { bars, infiniteLoopStart };
}

/** Build ChordTimeline entries from sections + flat bar sequence.
 *  Parses `symbol` on-the-fly when `parsed` is missing — this covers:
 *  - grids freshly loaded from API (parsed never stored server-side)
 *  - transposed sections (transposeSections sets parsed: null)
 */
function buildChordTimelineEntries(sections: Section[], flatBars: number[]): ChordTimelineEntry[] {
  const allBars = sections.flatMap((s) => s.bars);
  return flatBars.map((originalBarIdx) => {
    const slot = allBars[originalBarIdx]?.chords[0];
    if (!slot) return { barIndex: originalBarIdx, chord: null };

    let chord = slot.parsed ?? null;
    if (!chord && slot.symbol) {
      const result = parseChord(slot.symbol);
      chord = result.ok && result.value ? result.value : null;
    }
    return { barIndex: originalBarIdx, chord };
  });
}

const BASS_BASE_URL = '/samples/bass/';

export interface UseTransportOptions {
  settings: UserSettingsDTO;
  timeSignature: TimeSignatureString;
  totalBars: number;
  sections?: Section[];
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
  const strongPlayerRef = useRef<Tone.Player | null>(null);
  const strong2PlayerRef = useRef<Tone.Player | null>(null);
  const weakPlayerRef = useRef<Tone.Player | null>(null);
  const strongUrlRef = useRef('');
  const strong2UrlRef = useRef('');
  const weakUrlRef = useRef('');
  // Bass: 4 Tone.Samplers (one per RR variant) + a Channel for volume
  const bassRRRef = useRef<Tone.Sampler[]>([]);
  const bassChannelRef = useRef<Tone.Channel | null>(null);
  const bassInstrumentRef = useRef<BassInstrument | null>(null);
  const rrCounterRef = useRef(new RoundRobinCounter());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScheduledRef = useRef(0);
  const prevTicksRef = useRef(0);
  const flatSeqRef = useRef<FlatSequence>({ bars: [], infiniteLoopStart: null });
  const initializedRef = useRef(false);
  const countInTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Keep a ref to current opts so callbacks always see latest values
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const tone = Tone.getTransport();
    tone.PPQ = 480;

    const makePlayer = (sound: ClickSound | null, volumeDb: number): Tone.Player | null => {
      if (!sound) return null;
      const p = new Tone.Player(METRONOME_SAMPLE_BY_ID[sound].url).toDestination();
      p.volume.value = volumeDb;
      return p;
    };

    // Master volume controls the global audio destination
    Tone.getDestination().volume.value = Tone.gainToDb(settings.volume);

    const metronomeDb = Tone.gainToDb(settings.metronomeVolume ?? 0.8);
    strongUrlRef.current = settings.clickStrong ?? '';
    strong2UrlRef.current = settings.clickStrong2 ?? '';
    weakUrlRef.current = settings.clickWeak ?? '';

    strongPlayerRef.current = makePlayer(settings.clickStrong, metronomeDb);
    // Secondary strong beat is 3 dB quieter than the primary downbeat
    strong2PlayerRef.current = makePlayer(settings.clickStrong2, metronomeDb - 3);
    // Weak beat is 6 dB quieter to create a natural accent on beat 1
    weakPlayerRef.current = makePlayer(settings.clickWeak, metronomeDb - 6);

    const sink = (atTicks: number, beatType: BeatType) => {
      // Tone.js tick notation: "${N}i" = N ticks from transport start
      tone.scheduleOnce((time: number) => {
        let player: Tone.Player | null = null;
        if (beatType === 'strong') player = strongPlayerRef.current;
        else if (beatType === 'strong2') player = strong2PlayerRef.current;
        else player = weakPlayerRef.current;
        if (player?.loaded) player.start(time);
      }, `${atTicks}i`);
    };

    // ── Bass sampler setup ─────────────────────────────────────────────────
    const bassChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.bassVolume ?? 0.7),
    }).toDestination();
    bassChannelRef.current = bassChannel;

    // One Sampler per RR variant so we can cycle through real recordings
    const rrSamplers = ([1, 2, 3, 4] as const).map((rr) =>
      new Tone.Sampler({
        urls: buildBassFingerUrls(rr),
        baseUrl: BASS_BASE_URL,
        release: 0.5,
      }).connect(bassChannel),
    );
    bassRRRef.current = rrSamplers;

    // Pre-warm: start AudioContext on any first user gesture so all OGG/MP3 samples
    // finish decoding before the user clicks Play. Without this, AudioContext stays
    // suspended until play() and Tone.loaded() blocks for the full decode (~200–800 ms).
    const warmAudioContext = () => { void Tone.start(); };
    document.addEventListener('pointerdown', warmAudioContext, { once: true });

    const noteSink: NoteSink = (atTicks, note, velocity, durationTicks, _articulation) => {
      if (!(optsRef.current.settings.bassEnabled ?? true)) return;
      const rrIndex = rrCounterRef.current.next(note, 'finger') - 1; // 0-based
      const sampler = bassRRRef.current[rrIndex];
      if (!sampler) return;
      // Convert ticks to seconds: ticks / PPQ * (60 / bpm)
      const durationSecs = (durationTicks * 60) / (480 * optsRef.current.settings.bpm);
      tone.scheduleOnce((time: number) => {
        if (sampler.loaded) sampler.triggerAttackRelease(note, durationSecs, time, velocity);
      }, `${atTicks}i`);
    };

    const bassTimeline = new ChordTimeline();
    const bassInstrument = new BassInstrument(bassTimeline);
    bassInstrumentRef.current = bassInstrument;

    const engine = new TransportEngine({
      bpm: settings.bpm,
      timeSignature,
      sink,
      noteSink,
    });

    const metronome = new MetronomeInstrument();
    engine.addInstrument(metronome);
    engine.addInstrument(bassInstrument);

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
      document.removeEventListener('pointerdown', warmAudioContext);
      unsub();
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      tone.stop();
      tone.cancel();
      strongPlayerRef.current?.dispose();
      strong2PlayerRef.current?.dispose();
      weakPlayerRef.current?.dispose();
      strongPlayerRef.current = null;
      strong2PlayerRef.current = null;
      weakPlayerRef.current = null;
      bassRRRef.current.forEach((s) => s.dispose());
      bassRRRef.current = [];
      bassChannelRef.current?.dispose();
      bassChannelRef.current = null;
      bassInstrumentRef.current = null;
      rrCounterRef.current.reset();
      engineRef.current = null;
      machineRef.current = null;
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

  // Reload strong player when sound selection changes
  useEffect(() => {
    const key = settings.clickStrong ?? '';
    if (strongUrlRef.current === key) return;
    strongUrlRef.current = key;
    strongPlayerRef.current?.dispose();
    if (settings.clickStrong) {
      const p = new Tone.Player(METRONOME_SAMPLE_BY_ID[settings.clickStrong].url).toDestination();
      p.volume.value = Tone.gainToDb(optsRef.current.settings.metronomeVolume ?? 0.8);
      strongPlayerRef.current = p;
    } else {
      strongPlayerRef.current = null;
    }
  }, [settings.clickStrong]);

  // Reload strong2 player when sound selection changes
  useEffect(() => {
    const key = settings.clickStrong2 ?? '';
    if (strong2UrlRef.current === key) return;
    strong2UrlRef.current = key;
    strong2PlayerRef.current?.dispose();
    if (settings.clickStrong2) {
      const p = new Tone.Player(METRONOME_SAMPLE_BY_ID[settings.clickStrong2].url).toDestination();
      p.volume.value = Tone.gainToDb(optsRef.current.settings.metronomeVolume ?? 0.8) - 3;
      strong2PlayerRef.current = p;
    } else {
      strong2PlayerRef.current = null;
    }
  }, [settings.clickStrong2]);

  // Reload weak player when sound selection changes
  useEffect(() => {
    const key = settings.clickWeak ?? '';
    if (weakUrlRef.current === key) return;
    weakUrlRef.current = key;
    weakPlayerRef.current?.dispose();
    if (settings.clickWeak) {
      const p = new Tone.Player(METRONOME_SAMPLE_BY_ID[settings.clickWeak].url).toDestination();
      p.volume.value = Tone.gainToDb(optsRef.current.settings.metronomeVolume ?? 0.8) - 6;
      weakPlayerRef.current = p;
    } else {
      weakPlayerRef.current = null;
    }
  }, [settings.clickWeak]);

  // Update master volume on the global destination
  useEffect(() => {
    Tone.getDestination().volume.value = Tone.gainToDb(settings.volume);
  }, [settings.volume]);

  // Update metronome volume on all players
  useEffect(() => {
    const db = Tone.gainToDb(settings.metronomeVolume ?? 0.8);
    if (strongPlayerRef.current) strongPlayerRef.current.volume.value = db;
    if (strong2PlayerRef.current) strong2PlayerRef.current.volume.value = db - 3;
    if (weakPlayerRef.current) weakPlayerRef.current.volume.value = db - 6;
  }, [settings.metronomeVolume]);

  // Update bass volume
  useEffect(() => {
    if (!bassChannelRef.current) return;
    bassChannelRef.current.volume.value = Tone.gainToDb(settings.bassVolume ?? 0.7);
  }, [settings.bassVolume]);

  // Update bass complexity
  useEffect(() => {
    if (!bassInstrumentRef.current) return;
    const level = (settings.bassComplexity ?? 1) as 1 | 2 | 3 | 4 | 5;
    bassInstrumentRef.current.setComplexity(level);
  }, [settings.bassComplexity]);

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

  // Rebuild chord timeline when sections content changes (e.g., user edits chords)
  useEffect(() => {
    const bassInstrument = bassInstrumentRef.current;
    const seq = flatSeqRef.current;
    if (!bassInstrument || seq.bars.length === 0) return;
    const entries = buildChordTimelineEntries(opts.sections ?? [], seq.bars);
    bassInstrument.setTimeline(new ChordTimeline(entries));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.sections]);

  const play = useCallback(async () => {
    const engine = engineRef.current;
    const machine = machineRef.current;
    if (!engine || !machine) return;

    await Tone.start();
    // Wait for samples to finish loading before scheduling
    await Tone.loaded();

    const tone = Tone.getTransport();
    const currentState = machine.getState();
    const sig = parseTimeSignature(optsRef.current.timeSignature);
    const tpBar = ticksPerBar(sig);

    // Build flat repeat sequence from sections
    const sections = optsRef.current.sections ?? [];
    const seq = buildFlatSequence(sections);
    flatSeqRef.current = seq;

    // Sync chord timeline to bass instrument
    if (bassInstrumentRef.current) {
      const entries = buildChordTimelineEntries(sections, seq.bars);
      bassInstrumentRef.current.setTimeline(new ChordTimeline(entries));
      rrCounterRef.current.reset();
    }

    // Find virtual start tick for selectedBar (first occurrence in flat sequence)
    let startTick: number;
    if (currentState.status === 'paused') {
      startTick = tone.ticks;
    } else if (seq.bars.length > 0) {
      const idx = seq.bars.indexOf(currentState.selectedBar);
      startTick = (idx >= 0 ? idx : 0) * tpBar;
    } else {
      startTick = currentState.selectedBar * tpBar;
    }

    // Configure Tone.Transport loop for infinite last section
    if (seq.infiniteLoopStart !== null) {
      tone.loop = true;
      tone.loopStart = `${seq.infiniteLoopStart * tpBar}i`;
      tone.loopEnd = `${seq.bars.length * tpBar}i`;
    } else {
      tone.loop = false;
    }

    tone.ticks = startTick;
    prevTicksRef.current = startTick;
    lastScheduledRef.current = startTick;
    tone.bpm.value = optsRef.current.settings.bpm;

    // Pre-schedule first lookahead window BEFORE transport starts —
    // otherwise beat 1 fires before the first interval callback (25 ms later).
    const loopEndTick = seq.infiniteLoopStart !== null ? seq.bars.length * tpBar : Infinity;
    const firstWindowEnd = Math.min(startTick + LOOKAHEAD_TICKS, loopEndTick);
    engine.scheduleWindow({ fromTicks: startTick, toTicks: firstWindowEnd });
    lastScheduledRef.current = firstWindowEnd;

    const countInBars = optsRef.current.settings.countIn ?? 0;
    const secondsPerBeat = 60 / tone.bpm.value;
    const countInSeconds = countInBars * sig.beatsPerBar * secondsPerBeat;

    // Clear any leftover count-in timeouts from previous play
    countInTimeoutsRef.current.forEach(clearTimeout);
    countInTimeoutsRef.current = [];

    // Schedule count-in beats at absolute audio time before transport starts
    if (countInBars > 0) {
      const firstBeatAt = Tone.now() + 0.05;
      const totalCountInBeats = countInBars * sig.beatsPerBar;
      const secondStrong = defaultSecondStrongBeats(sig);

      usePlaybackStore.getState()._setCountIn(true, 0);

      for (let b = 0; b < totalCountInBeats; b++) {
        const beatOffset = b * secondsPerBeat;
        const beatInBar = b % sig.beatsPerBar;
        let beatType: BeatType = 'weak';
        if (beatInBar === 0) beatType = 'strong';
        else if (secondStrong.includes(beatInBar)) beatType = 'strong2';
        let player: Tone.Player | null = null;
        if (beatType === 'strong') player = strongPlayerRef.current;
        else if (beatType === 'strong2') player = strong2PlayerRef.current;
        else player = weakPlayerRef.current;
        if (player?.loaded) player.start(firstBeatAt + beatOffset);

        // Update UI beat indicator in sync with audio
        const t = setTimeout(() => {
          usePlaybackStore.getState()._setCountIn(true, b % sig.beatsPerBar);
        }, Math.round(50 + beatOffset * 1000));
        countInTimeoutsRef.current.push(t);
      }

      // Clear count-in state when transport actually starts
      const clearT = setTimeout(() => {
        usePlaybackStore.getState()._setCountIn(false, 0);
        countInTimeoutsRef.current = [];
      }, Math.round((0.05 + countInSeconds) * 1000));
      countInTimeoutsRef.current.push(clearT);
    }

    machine.dispatch({ type: 'play' });
    engine.play();
    tone.start(`+${(0.05 + countInSeconds).toFixed(3)}`);

    if (intervalRef.current !== null) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const currentTicks = Tone.getTransport().ticks;
      const seq2 = flatSeqRef.current;
      const sig2 = parseTimeSignature(optsRef.current.timeSignature);
      const tpBar2 = ticksPerBar(sig2);

      // Detect Transport.loop wrap (ticks decreased by more than half a bar)
      if (currentTicks < prevTicksRef.current - tpBar2 / 2 && seq2.infiniteLoopStart !== null) {
        // Loop wrapped — reset schedule pointer to the loop start tick
        lastScheduledRef.current = seq2.infiniteLoopStart * tpBar2;
      }
      prevTicksRef.current = currentTicks;

      // Map virtual position to original bar index for UI highlighting
      const virtualBar = Math.floor(currentTicks / tpBar2);
      const originalBar = seq2.bars.length > 0
        ? (seq2.bars[Math.min(virtualBar, seq2.bars.length - 1)] ?? 0)
        : virtualBar;

      const beatTicks = currentTicks % tpBar2;
      const tpBeat = tpBar2 / sig2.beatsPerBar;
      const beat = Math.floor(beatTicks / tpBeat);
      machine.dispatch({ type: 'tick', bar: originalBar, beat });

      // Auto-stop at end of finite sequence
      if (seq2.infiniteLoopStart === null && seq2.bars.length > 0 && currentTicks >= seq2.bars.length * tpBar2) {
        if (intervalRef.current !== null) clearInterval(intervalRef.current);
        intervalRef.current = null;
        const t = Tone.getTransport();
        t.stop();
        t.cancel();
        t.loop = false;
        t.ticks = 0;
        lastScheduledRef.current = 0;
        engineRef.current?.stop();
        machine.dispatch({ type: 'stop' });
        return;
      }

      // Schedule look-ahead window (clamped to loop end to avoid scheduling beyond it)
      const loopEnd = seq2.infiniteLoopStart !== null ? seq2.bars.length * tpBar2 : Infinity;
      const from = lastScheduledRef.current;
      const to = Math.min(currentTicks + LOOKAHEAD_TICKS, loopEnd);
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

    countInTimeoutsRef.current.forEach(clearTimeout);
    countInTimeoutsRef.current = [];
    usePlaybackStore.getState()._setCountIn(false, 0);

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

    countInTimeoutsRef.current.forEach(clearTimeout);
    countInTimeoutsRef.current = [];
    usePlaybackStore.getState()._setCountIn(false, 0);

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const tone = Tone.getTransport();
    tone.stop();
    tone.cancel();
    tone.loop = false;
    tone.ticks = 0;
    lastScheduledRef.current = 0;
    prevTicksRef.current = 0;

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
