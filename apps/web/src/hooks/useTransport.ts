import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import {
  TransportEngine,
  MetronomeInstrument,
  BassInstrument,
  RhodesInstrument,
  PianoInstrument,
  ChordTimeline,
  RoundRobinCounter,
  PlaybackStateMachine,
  parseChord,
  ticksPerBar,
  parseTimeSignature,
  defaultSecondStrongBeats,
  METRONOME_SAMPLE_BY_ID,
  pickRhodesLayer,
  pickPianoLayer,
  DrumInstrument,
  type HumanizeIntensity,
  bassManifest,
  rhodesManifest,
  pianoManifest,
  salamanderManifest,
  drumsManifest,
  type BeatType,
  type EventSink,
  type BassEvent,
  type RhodesEvent,
  type PianoEvent,
  type DrumEvent,
  type ChordTimelineEntry,
} from '@jazz/music-core';
import {
  ToneAudioAdapter,
  createPitchedResources,
  createOneshotResources,
} from '@jazz/tone-audio-adapter';
import type {
  TimeSignatureString,
  Section,
  ClickSound,
  UserSettingsDTO,
  Style,
} from '@jazz/shared';
import { audioUrl } from '@jazz/shared';
import { usePlaybackStore } from '@jazz/plugin-sdk';

const LOOKAHEAD_TICKS = 480 * 4;
const PPQ = 480;

function ticksToSeconds(durationTicks: number, bpm: number): number {
  return (durationTicks * 60) / (PPQ * bpm);
}

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
    if (sectionBars[bi]?.repeatEnd) {
      outerIdx = bi;
      break;
    }
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

  const engineRef = useRef<TransportEngine | null>(null);
  const machineRef = useRef<PlaybackStateMachine | null>(null);
  const strongPlayerRef = useRef<Tone.Player | null>(null);
  const strong2PlayerRef = useRef<Tone.Player | null>(null);
  const weakPlayerRef = useRef<Tone.Player | null>(null);
  const strongUrlRef = useRef('');
  const strong2UrlRef = useRef('');
  const weakUrlRef = useRef('');
  // Instrument resources created by factories
  const bassSamplersRef = useRef<Map<string, Tone.Sampler>>(new Map());
  const bassDisposeRef = useRef<() => void>(() => {});
  const bassChannelRef = useRef<Tone.Channel | null>(null);
  const bassInstrumentRef = useRef<BassInstrument | null>(null);
  // Rhodes: FX chain + instrument
  const rhodesSamplersRef = useRef<Map<string, Tone.Sampler>>(new Map());
  const rhodesDisposeRef = useRef<() => void>(() => {});
  const rhodesEQ3Ref = useRef<Tone.EQ3 | null>(null);
  const rhodesTremoloRef = useRef<Tone.Tremolo | null>(null);
  const rhodesChorusRef = useRef<Tone.Chorus | null>(null);
  const rhodesReverbRef = useRef<Tone.Reverb | null>(null);
  const rhodesChannelRef = useRef<Tone.Channel | null>(null);
  const rhodesInstrumentRef = useRef<RhodesInstrument | null>(null);
  const rhodesFxInitializedRef = useRef(false);
  // Piano: channel + samplers + instrument
  const pianoSamplersRef = useRef<Map<string, Tone.Sampler>>(new Map());
  const pianoDisposeRef = useRef<() => void>(() => {});
  const pianoChannelRef = useRef<Tone.Channel | null>(null);
  const pianoReverbRef = useRef<Tone.Reverb | null>(null);
  const pianoEQ3Ref = useRef<Tone.EQ3 | null>(null);
  const pianoInstrumentRef = useRef<PianoInstrument | null>(null);
  const pianoFxInitializedRef = useRef(false);
  // Drums: per-sound players + channels
  const drumsPlayersRef = useRef<Map<string, Tone.Player[]>>(new Map());
  const drumsDisposeRef = useRef<() => void>(() => {});
  const drumsBassDrumChannelRef = useRef<Tone.Channel | null>(null);
  const drumsSnareChannelRef = useRef<Tone.Channel | null>(null);
  const drumsHihatChannelRef = useRef<Tone.Channel | null>(null);
  const drumsRideChannelRef = useRef<Tone.Channel | null>(null);
  const drumsCrashChannelRef = useRef<Tone.Channel | null>(null);
  const drumsRimChannelRef = useRef<Tone.Channel | null>(null);
  const drumsMasterChannelRef = useRef<Tone.Channel | null>(null);
  const drumInstrumentRef = useRef<DrumInstrument | null>(null);
  const drumsRrRef = useRef<Record<string, number>>({});
  const rrCounterRef = useRef(new RoundRobinCounter());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScheduledRef = useRef(0);
  const prevTicksRef = useRef(0);
  const flatSeqRef = useRef<FlatSequence>({ bars: [], infiniteLoopStart: null });
  const initializedRef = useRef(false);
  const countInTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const adapterRef = useRef<ToneAudioAdapter | null>(null);

  // Keep a ref to current opts so callbacks always see latest values
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const tone = Tone.getTransport();
    tone.PPQ = 480;

    // Create the audio adapter that wraps Tone.Transport lifecycle
    const adapter = new ToneAudioAdapter({ bpm: settings.bpm });
    adapterRef.current = adapter;

    const makePlayer = (sound: ClickSound | null, volumeDb: number): Tone.Player | null => {
      if (!sound) return null;
      const p = new Tone.Player(
        audioUrl(METRONOME_SAMPLE_BY_ID[sound].url, settings.audioFormat),
      ).toDestination();
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
      if (!(optsRef.current.settings.metronomeEnabled ?? true)) return;
      // Tone.js tick notation: "${N}i" = N ticks from transport start
      tone.scheduleOnce((time: number) => {
        let player: Tone.Player | null = null;
        if (beatType === 'strong') player = strongPlayerRef.current;
        else if (beatType === 'strong2') player = strong2PlayerRef.current;
        else player = weakPlayerRef.current;
        if (player?.loaded) player.start(time);
      }, `${atTicks}i`);
    };

    // Pre-warm: start AudioContext on any first user gesture so all samples
    // finish decoding before the user clicks Play.
    const warmAudioContext = () => {
      void Tone.start();
    };
    document.addEventListener('pointerdown', warmAudioContext, { once: true });

    // ── Bass setup ─────────────────────────────────────────────────────────
    const bassChannel = new Tone.Channel({
      volume: Tone.gainToDb(Math.max(0.001, settings.bassVolume ?? 0.7)),
    }).toDestination();
    bassChannelRef.current = bassChannel;

    const bassRes = createPitchedResources(bassManifest.sampleManifest, settings.audioFormat);
    for (const s of bassRes.samplers.values()) s.connect(bassChannel);
    bassSamplersRef.current = bassRes.samplers;
    bassDisposeRef.current = bassRes.dispose;

    const bassEventSink: EventSink = (payload, atTicks, velocity, durationTicks) => {
      if (!(optsRef.current.settings.bassEnabled ?? true)) return;
      const p = payload as BassEvent;
      const layerKey = `${p.articulation}_rr${rrCounterRef.current.next(p.note, p.articulation)}`;
      const sampler = bassSamplersRef.current.get(layerKey);
      if (!sampler) return;
      const durationSecs = ticksToSeconds(durationTicks, optsRef.current.settings.bpm);
      tone.scheduleOnce((time: number) => {
        if (sampler.loaded) sampler.triggerAttackRelease(p.note, durationSecs, time, velocity);
      }, `${atTicks}i`);
    };

    const bassInstrument = new BassInstrument(new ChordTimeline());
    bassInstrument.setStyle((settings.style ?? 'swing') as Style);
    bassInstrumentRef.current = bassInstrument;

    // ── Rhodes setup ───────────────────────────────────────────────────────
    // EQ3 + Channel are safe to create immediately (no internal oscillators).
    // Tremolo, Chorus, Reverb are deferred to first Play because their
    // constructors create native Web Audio oscillators that require a running
    // AudioContext (browser autoplay policy).
    const rhodesEQ3 = new Tone.EQ3({ low: -2, mid: 0, high: 1 });
    const rhodesChannel = new Tone.Channel({
      volume: Tone.gainToDb(Math.max(0.001, settings.rhodesVolume ?? 0.6)),
      pan: 0.05,
    }).toDestination();
    rhodesEQ3Ref.current = rhodesEQ3;
    rhodesChannelRef.current = rhodesChannel;

    const rhodesRes = createPitchedResources(rhodesManifest.sampleManifest, settings.audioFormat);
    for (const s of rhodesRes.samplers.values()) s.connect(rhodesEQ3);
    rhodesSamplersRef.current = rhodesRes.samplers;
    rhodesDisposeRef.current = rhodesRes.dispose;

    const rhodesEventSink: EventSink = (payload, atTicks, velocity, durationTicks) => {
      if (!(optsRef.current.settings.rhodesEnabled ?? false)) return;
      const p = payload as RhodesEvent;
      const layerName = pickRhodesLayer(velocity);
      const sampler = rhodesSamplersRef.current.get(layerName);
      if (!sampler) return;
      const durationSecs = ticksToSeconds(durationTicks, optsRef.current.settings.bpm);
      tone.scheduleOnce((time: number) => {
        if (sampler.loaded) {
          for (const note of p.notes) {
            sampler.triggerAttackRelease(note, durationSecs, time, velocity);
          }
        }
      }, `${atTicks}i`);
    };

    const rhodesInstrument = new RhodesInstrument(new ChordTimeline());
    rhodesInstrument.setStyle((settings.style ?? 'swing') as Style);
    rhodesInstrumentRef.current = rhodesInstrument;

    // ── Piano setup ───────────────────────────────────────────────────────
    const pianoEQ3 = new Tone.EQ3({ low: -1, mid: 0.5, high: 2 });
    const pianoVol = settings.pianoVolume ?? 0.7;
    const pianoChannel = new Tone.Channel({
      volume: Tone.gainToDb(Math.max(0.001, pianoVol)),
      pan: -0.05,
    }).toDestination();
    pianoEQ3Ref.current = pianoEQ3;
    pianoChannelRef.current = pianoChannel;

    const activePianoManifest =
      settings.pianoSampleLibrary === 'upright-kw' ? pianoManifest : salamanderManifest;
    const pianoRes = createPitchedResources(
      activePianoManifest.sampleManifest,
      settings.audioFormat,
    );
    for (const s of pianoRes.samplers.values()) s.connect(pianoEQ3);
    pianoSamplersRef.current = pianoRes.samplers;
    pianoDisposeRef.current = pianoRes.dispose;

    const pianoEventSink: EventSink = (payload, atTicks, velocity, durationTicks) => {
      if (!(optsRef.current.settings.pianoEnabled ?? false)) return;
      const p = payload as PianoEvent;
      const layerName = pickPianoLayer(velocity);
      const sampler = pianoSamplersRef.current.get(layerName);
      if (!sampler) return;
      const durationSecs = ticksToSeconds(durationTicks, optsRef.current.settings.bpm);
      tone.scheduleOnce((time: number) => {
        if (sampler.loaded) {
          for (const note of p.notes) {
            sampler.triggerAttackRelease(note, durationSecs, time, velocity);
          }
        }
      }, `${atTicks}i`);
    };

    const pianoInstrument = new PianoInstrument(new ChordTimeline());
    pianoInstrument.setStyle((settings.style ?? 'swing') as Style);
    pianoInstrument.setVoicingDensity(settings.pianoVoicingDensity ?? 'rootless3');
    pianoInstrument.setProfile(settings.pianoProfile ?? 'swing-sparse');
    pianoInstrument.setHumanize((settings.pianoRandomizationLevel ?? 'off') !== 'off');
    pianoInstrumentRef.current = pianoInstrument;

    // ── Drums setup ─────────────────────────────────────────────────────────
    const drumsMasterChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsVolume ?? 0.7),
    }).toDestination();
    drumsMasterChannelRef.current = drumsMasterChannel;

    const drumsBassDrumChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsBassDrumVolume ?? 0.7),
    }).connect(drumsMasterChannel);
    drumsBassDrumChannelRef.current = drumsBassDrumChannel;

    const drumsSnareChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsSnareVolume ?? 0.8),
    }).connect(drumsMasterChannel);
    drumsSnareChannelRef.current = drumsSnareChannel;

    const drumsHihatChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsHihatVolume ?? 0.65),
    }).connect(drumsMasterChannel);
    drumsHihatChannelRef.current = drumsHihatChannel;

    const drumsRideChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsRideVolume ?? 0.7),
    }).connect(drumsMasterChannel);
    drumsRideChannelRef.current = drumsRideChannel;

    const drumsCrashChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsCrashVolume ?? 0.8),
    }).connect(drumsMasterChannel);
    drumsCrashChannelRef.current = drumsCrashChannel;

    const drumsRimChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsRimVolume ?? 0.6),
    }).connect(drumsMasterChannel);
    drumsRimChannelRef.current = drumsRimChannel;

    const drumsRes = createOneshotResources(drumsManifest.sampleManifest, settings.audioFormat);
    for (const [sound, arr] of drumsRes.players) {
      const ch =
        sound === 'bassDrum'
          ? drumsBassDrumChannel
          : sound === 'snare'
            ? drumsSnareChannel
            : sound === 'hihat' || sound === 'hihatHalf' || sound === 'hihatOpen'
              ? drumsHihatChannel
              : sound === 'ride'
                ? drumsRideChannel
                : sound === 'crash'
                  ? drumsCrashChannel
                  : sound === 'rim'
                    ? drumsRimChannel
                    : drumsMasterChannel;
      for (const p of arr) p.connect(ch);
    }
    drumsPlayersRef.current = drumsRes.players;
    drumsDisposeRef.current = drumsRes.dispose;

    const drumsEventSink: EventSink = (payload, atTicks, velocity, _durationTicks) => {
      const s = optsRef.current.settings;
      if (!(s.drumsEnabled ?? true)) return;
      const p = payload as DrumEvent;
      if (p.sound === 'bassDrum' && !(s.drumsBassDrumEnabled ?? true)) return;
      if (p.sound === 'snare' && !(s.drumsSnareEnabled ?? true)) return;
      if (
        (p.sound === 'hihat' || p.sound === 'hihatHalf' || p.sound === 'hihatOpen') &&
        !(s.drumsHihatEnabled ?? true)
      )
        return;
      if (p.sound === 'ride' && !(s.drumsRideEnabled ?? true)) return;
      if (p.sound === 'crash' && !(s.drumsCrashEnabled ?? true)) return;
      if (p.sound === 'rim' && !(s.drumsRimEnabled ?? true)) return;
      const pool = drumsPlayersRef.current.get(p.sound);
      if (!pool) return;
      const rr = (drumsRrRef.current[p.sound] ?? 0) % 4;
      drumsRrRef.current[p.sound] = (drumsRrRef.current[p.sound] ?? 0) + 1;
      const player = pool[rr];
      if (!player) return;
      // Per-event velocity: set player volume inside the callback so it
      // applies at the exact audio time, not at schedule-time (which would
      // be overwritten by the next scheduling window).
      const velDb = velocity < 1.0 ? Tone.gainToDb(velocity) : 0;
      tone.scheduleOnce((time: number) => {
        if (player.loaded) {
          if (velocity < 1.0) player.volume.value = velDb;
          player.start(time);
        }
      }, `${atTicks}i`);
    };

    const drumInstrument = new DrumInstrument();
    drumInstrument.setStyle((settings.style ?? settings.drumsPattern ?? 'swing') as Style);
    drumInstrument.updateSettings({
      enabled: settings.drumsEnabled ?? true,
      volume: settings.drumsVolume ?? 0.7,
      bassDrumEnabled: settings.drumsBassDrumEnabled ?? true,
      bassDrumVolume: settings.drumsBassDrumVolume ?? 0.7,
      snareEnabled: settings.drumsSnareEnabled ?? true,
      snareVolume: settings.drumsSnareVolume ?? 0.8,
      hihatEnabled: settings.drumsHihatEnabled ?? true,
      hihatVolume: settings.drumsHihatVolume ?? 0.65,
      hihatOpenness: settings.drumsHihatOpenness ?? 0,
      rideEnabled: settings.drumsRideEnabled ?? true,
      rideVolume: settings.drumsRideVolume ?? 0.7,
      crashEnabled: settings.drumsCrashEnabled ?? true,
      crashVolume: settings.drumsCrashVolume ?? 0.8,
      crashFrequency: settings.drumsCrashFrequency ?? 4,
      rimEnabled: settings.drumsRimEnabled ?? false,
      rimVolume: settings.drumsRimVolume ?? 0.6,
      humanizeIntensity: (settings.drumsHumanizeIntensity ?? 'med') as HumanizeIntensity,
      funkComplexity: settings.drumsFunkComplexity ?? 'medium',
      fillFrequency: (settings.drumsFillFrequency ?? '8bars') as
        | 'never'
        | '4bars'
        | '8bars'
        | '16bars',
      randomizationLevel: (settings.drumsRandomizationLevel ?? 'off') as
        | 'off'
        | 'subtle'
        | 'moderate'
        | 'high',
      fillComplexity: (settings.drumsFillComplexity ?? 'medium') as 'simple' | 'medium' | 'complex',
      rideVariation: settings.drumsRideVariation ?? true,
      snareGhosts: settings.drumsSnareGhosts ?? true,
      bassDrumVariation: settings.drumsBassDrumVariation ?? true,
    });
    drumInstrumentRef.current = drumInstrument;

    // ── Transport engine ───────────────────────────────────────────────────
    const engine = new TransportEngine({
      bpm: settings.bpm,
      timeSignature,
      swingRatio: settings.swingRatio ?? 0.5,
      sink,
    });
    engine.registerSink('bass', bassEventSink);
    engine.registerSink('rhodes', rhodesEventSink);
    engine.registerSink('piano', pianoEventSink);
    engine.registerSink('drums', drumsEventSink);

    const metronome = new MetronomeInstrument();
    engine.addInstrument(metronome);
    engine.addInstrument(bassInstrument);
    engine.addInstrument(rhodesInstrument);
    engine.addInstrument(pianoInstrument);
    engine.addInstrument(drumInstrument);

    const machine = new PlaybackStateMachine(totalBars);
    machineRef.current = machine;
    engineRef.current = engine;

    const unsub = machine.subscribe((state) => {
      usePlaybackStore.getState()._setState(state);
    });

    // Sync initial state
    usePlaybackStore.getState()._setState(machine.getState());

    adapter.setBpm(settings.bpm);

    return () => {
      document.removeEventListener('pointerdown', warmAudioContext);
      unsub();
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      adapter.stop();
      strongPlayerRef.current?.dispose();
      strong2PlayerRef.current?.dispose();
      weakPlayerRef.current?.dispose();
      strongPlayerRef.current = null;
      strong2PlayerRef.current = null;
      weakPlayerRef.current = null;
      bassDisposeRef.current();
      bassSamplersRef.current = new Map();
      bassChannelRef.current?.dispose();
      bassChannelRef.current = null;
      bassInstrumentRef.current = null;
      rhodesDisposeRef.current();
      rhodesSamplersRef.current = new Map();
      rhodesEQ3Ref.current?.dispose();
      rhodesEQ3Ref.current = null;
      rhodesTremoloRef.current?.dispose();
      rhodesTremoloRef.current = null;
      rhodesChorusRef.current?.dispose();
      rhodesChorusRef.current = null;
      rhodesReverbRef.current?.dispose();
      rhodesReverbRef.current = null;
      rhodesChannelRef.current?.dispose();
      rhodesChannelRef.current = null;
      rhodesInstrumentRef.current = null;
      pianoDisposeRef.current();
      pianoSamplersRef.current = new Map();
      pianoEQ3Ref.current?.dispose();
      pianoEQ3Ref.current = null;
      pianoReverbRef.current?.dispose();
      pianoReverbRef.current = null;
      pianoChannelRef.current?.dispose();
      pianoChannelRef.current = null;
      pianoInstrumentRef.current = null;
      drumsDisposeRef.current();
      drumsPlayersRef.current = new Map();
      drumsBassDrumChannelRef.current?.dispose();
      drumsBassDrumChannelRef.current = null;
      drumsSnareChannelRef.current?.dispose();
      drumsSnareChannelRef.current = null;
      drumsHihatChannelRef.current?.dispose();
      drumsHihatChannelRef.current = null;
      drumsRideChannelRef.current?.dispose();
      drumsRideChannelRef.current = null;
      drumsCrashChannelRef.current?.dispose();
      drumsCrashChannelRef.current = null;
      drumsRimChannelRef.current?.dispose();
      drumsRimChannelRef.current = null;
      drumsMasterChannelRef.current?.dispose();
      drumsMasterChannelRef.current = null;
      drumInstrumentRef.current = null;
      drumsRrRef.current = {};
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
    adapterRef.current?.setBpm(settings.bpm);
  }, [settings.bpm]);

  // Reload strong player when sound selection changes
  useEffect(() => {
    const key = settings.clickStrong ?? '';
    if (strongUrlRef.current === key) return;
    strongUrlRef.current = key;
    strongPlayerRef.current?.dispose();
    if (settings.clickStrong) {
      const p = new Tone.Player(
        audioUrl(METRONOME_SAMPLE_BY_ID[settings.clickStrong].url, settings.audioFormat),
      ).toDestination();
      p.volume.value = Tone.gainToDb(optsRef.current.settings.metronomeVolume ?? 0.8);
      strongPlayerRef.current = p;
    } else {
      strongPlayerRef.current = null;
    }
  }, [settings.clickStrong, settings.audioFormat]);

  // Reload strong2 player when sound selection changes
  useEffect(() => {
    const key = settings.clickStrong2 ?? '';
    if (strong2UrlRef.current === key) return;
    strong2UrlRef.current = key;
    strong2PlayerRef.current?.dispose();
    if (settings.clickStrong2) {
      const p = new Tone.Player(
        audioUrl(METRONOME_SAMPLE_BY_ID[settings.clickStrong2].url, settings.audioFormat),
      ).toDestination();
      p.volume.value = Tone.gainToDb(optsRef.current.settings.metronomeVolume ?? 0.8) - 3;
      strong2PlayerRef.current = p;
    } else {
      strong2PlayerRef.current = null;
    }
  }, [settings.clickStrong2, settings.audioFormat]);

  // Reload weak player when sound selection changes
  useEffect(() => {
    const key = settings.clickWeak ?? '';
    if (weakUrlRef.current === key) return;
    weakUrlRef.current = key;
    weakPlayerRef.current?.dispose();
    if (settings.clickWeak) {
      const p = new Tone.Player(
        audioUrl(METRONOME_SAMPLE_BY_ID[settings.clickWeak].url, settings.audioFormat),
      ).toDestination();
      p.volume.value = Tone.gainToDb(optsRef.current.settings.metronomeVolume ?? 0.8) - 6;
      weakPlayerRef.current = p;
    } else {
      weakPlayerRef.current = null;
    }
  }, [settings.clickWeak, settings.audioFormat]);

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
    bassChannelRef.current.volume.value = Tone.gainToDb(
      Math.max(0.001, settings.bassVolume ?? 0.7),
    );
  }, [settings.bassVolume]);

  // Update bass style (before complexity so user setting overrides)
  useEffect(() => {
    if (!bassInstrumentRef.current) return;
    bassInstrumentRef.current.setStyle((settings.style ?? 'swing') as Style);
  }, [settings.style]);

  // Update bass complexity
  useEffect(() => {
    if (!bassInstrumentRef.current) return;
    const level = (settings.bassComplexity ?? 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    bassInstrumentRef.current.setComplexity(level);
  }, [settings.bassComplexity]);

  // Update bass octave shift
  useEffect(() => {
    if (!bassInstrumentRef.current) return;
    bassInstrumentRef.current.setOctaveShift(settings.bassOctaveUp ? 1 : 0);
  }, [settings.bassOctaveUp]);

  // Update Rhodes volume
  useEffect(() => {
    if (!rhodesChannelRef.current) return;
    rhodesChannelRef.current.volume.value = Tone.gainToDb(
      Math.max(0.001, settings.rhodesVolume ?? 0.6),
    );
  }, [settings.rhodesVolume]);

  // Update Rhodes style (before mode so user setting overrides)
  useEffect(() => {
    if (!rhodesInstrumentRef.current) return;
    rhodesInstrumentRef.current.setStyle((settings.style ?? 'swing') as Style);
  }, [settings.style]);

  // Update Rhodes comping mode (legacy — used only when layerMode is 'none')
  useEffect(() => {
    if (!rhodesInstrumentRef.current) return;
    rhodesInstrumentRef.current.setMode(settings.rhodesMode ?? 'halfNotes');
  }, [settings.rhodesMode]);

  // Update Rhodes complementary layer mode
  useEffect(() => {
    if (!rhodesInstrumentRef.current) return;
    rhodesInstrumentRef.current.setLayerMode(settings.rhodesLayerMode ?? 'none');
  }, [settings.rhodesLayerMode]);

  // Update Rhodes layer volume
  useEffect(() => {
    if (!rhodesInstrumentRef.current) return;
    rhodesInstrumentRef.current.setLayerVolume(settings.rhodesLayerVolume ?? 0.5);
  }, [settings.rhodesLayerVolume]);

  // Update Rhodes voicing density
  useEffect(() => {
    if (!rhodesInstrumentRef.current) return;
    rhodesInstrumentRef.current.setVoicingDensity(settings.rhodesVoicingDensity ?? 'rootless3');
  }, [settings.rhodesVoicingDensity]);

  // Update Piano volume
  useEffect(() => {
    if (!pianoChannelRef.current) return;
    pianoChannelRef.current.volume.value = Tone.gainToDb(
      Math.max(0.001, settings.pianoVolume ?? 0.7),
    );
  }, [settings.pianoVolume]);

  // Update Piano profile
  useEffect(() => {
    if (!pianoInstrumentRef.current) return;
    pianoInstrumentRef.current.setProfile(settings.pianoProfile ?? 'swing-sparse');
  }, [settings.pianoProfile]);

  // Update Piano voicing density
  useEffect(() => {
    if (!pianoInstrumentRef.current) return;
    pianoInstrumentRef.current.setVoicingDensity(settings.pianoVoicingDensity ?? 'rootless3');
  }, [settings.pianoVoicingDensity]);

  // Update Piano style (re-apply user's profile after style default override)
  useEffect(() => {
    if (!pianoInstrumentRef.current) return;
    pianoInstrumentRef.current.setStyle((settings.style ?? 'swing') as Style);
    pianoInstrumentRef.current.setProfile(settings.pianoProfile ?? 'swing-sparse');
  }, [settings.style, settings.pianoProfile]);

  // Update Piano randomization level
  useEffect(() => {
    if (!pianoInstrumentRef.current) return;
    const level = settings.pianoRandomizationLevel ?? 'off';
    pianoInstrumentRef.current.setHumanize(level !== 'off');
  }, [settings.pianoRandomizationLevel]);

  // Update drum instrument settings + per-sound channel volumes
  useEffect(() => {
    if (!drumInstrumentRef.current) return;
    drumInstrumentRef.current.setStyle(
      (settings.style ?? settings.drumsPattern ?? 'swing') as Style,
    );
    drumInstrumentRef.current.updateSettings({
      enabled: settings.drumsEnabled ?? true,
      volume: settings.drumsVolume ?? 0.7,
      bassDrumEnabled: settings.drumsBassDrumEnabled ?? true,
      bassDrumVolume: settings.drumsBassDrumVolume ?? 0.7,
      snareEnabled: settings.drumsSnareEnabled ?? true,
      snareVolume: settings.drumsSnareVolume ?? 0.8,
      hihatEnabled: settings.drumsHihatEnabled ?? true,
      hihatVolume: settings.drumsHihatVolume ?? 0.65,
      hihatOpenness: settings.drumsHihatOpenness ?? 0,
      rideEnabled: settings.drumsRideEnabled ?? true,
      rideVolume: settings.drumsRideVolume ?? 0.7,
      crashEnabled: settings.drumsCrashEnabled ?? true,
      crashVolume: settings.drumsCrashVolume ?? 0.8,
      crashFrequency: settings.drumsCrashFrequency ?? 4,
      rimEnabled: settings.drumsRimEnabled ?? false,
      rimVolume: settings.drumsRimVolume ?? 0.6,
      humanizeIntensity: (settings.drumsHumanizeIntensity ?? 'med') as HumanizeIntensity,
      funkComplexity: settings.drumsFunkComplexity ?? 'medium',
      fillFrequency: (settings.drumsFillFrequency ?? '8bars') as
        | 'never'
        | '4bars'
        | '8bars'
        | '16bars',
      randomizationLevel: (settings.drumsRandomizationLevel ?? 'off') as
        | 'off'
        | 'subtle'
        | 'moderate'
        | 'high',
      fillComplexity: (settings.drumsFillComplexity ?? 'medium') as 'simple' | 'medium' | 'complex',
      rideVariation: settings.drumsRideVariation ?? true,
      snareGhosts: settings.drumsSnareGhosts ?? true,
      bassDrumVariation: settings.drumsBassDrumVariation ?? true,
    });
    // Sync per-sound channel volumes
    if (drumsMasterChannelRef.current)
      drumsMasterChannelRef.current.volume.value = Tone.gainToDb(settings.drumsVolume ?? 0.7);
    if (drumsBassDrumChannelRef.current)
      drumsBassDrumChannelRef.current.volume.value = Tone.gainToDb(
        settings.drumsBassDrumVolume ?? 0.7,
      );
    if (drumsSnareChannelRef.current)
      drumsSnareChannelRef.current.volume.value = Tone.gainToDb(settings.drumsSnareVolume ?? 0.8);
    if (drumsHihatChannelRef.current)
      drumsHihatChannelRef.current.volume.value = Tone.gainToDb(settings.drumsHihatVolume ?? 0.65);
    if (drumsRideChannelRef.current)
      drumsRideChannelRef.current.volume.value = Tone.gainToDb(settings.drumsRideVolume ?? 0.7);
    if (drumsCrashChannelRef.current)
      drumsCrashChannelRef.current.volume.value = Tone.gainToDb(settings.drumsCrashVolume ?? 0.8);
    if (drumsRimChannelRef.current)
      drumsRimChannelRef.current.volume.value = Tone.gainToDb(settings.drumsRimVolume ?? 0.6);
  }, [
    settings.style,
    settings.drumsEnabled,
    settings.drumsVolume,
    settings.drumsPattern,
    settings.drumsBassDrumEnabled,
    settings.drumsBassDrumVolume,
    settings.drumsSnareEnabled,
    settings.drumsSnareVolume,
    settings.drumsHihatEnabled,
    settings.drumsHihatVolume,
    settings.drumsHihatOpenness,
    settings.drumsRideEnabled,
    settings.drumsRideVolume,
    settings.drumsCrashEnabled,
    settings.drumsCrashVolume,
    settings.drumsCrashFrequency,
    settings.drumsRimEnabled,
    settings.drumsRimVolume,
    settings.drumsHumanizeIntensity,
    settings.drumsFunkComplexity,
    settings.drumsFillFrequency,
    settings.drumsRidePattern,
  ]);

  // Update swing ratio
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setSwingRatio(settings.swingRatio ?? 0.5);
  }, [settings.swingRatio]);

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
    const seq = flatSeqRef.current;
    if (seq.bars.length === 0) return;
    const entries = buildChordTimelineEntries(opts.sections ?? [], seq.bars);
    const timeline = new ChordTimeline(entries);
    bassInstrumentRef.current?.setTimeline(timeline);
    rhodesInstrumentRef.current?.setTimeline(new ChordTimeline(entries));
    pianoInstrumentRef.current?.setTimeline(new ChordTimeline(entries));
  }, [opts.sections]);

  const play = useCallback(async () => {
    const engine = engineRef.current;
    const machine = machineRef.current;
    if (!engine || !machine) return;

    await Tone.start();
    // Wait for samples to finish loading before scheduling
    await Tone.loaded();

    // Lazy-init Rhodes FX chain now that AudioContext is running.
    // Tremolo/Chorus/Reverb constructors create native oscillators
    // that require a running AudioContext (browser autoplay policy).
    if (!rhodesFxInitializedRef.current) {
      rhodesFxInitializedRef.current = true;
      const tremolo = new Tone.Tremolo({ frequency: 5.5, depth: 0.18, wet: 0.25 });
      const chorus = new Tone.Chorus({
        frequency: 1.4,
        delayTime: 2.5,
        depth: 0.25,
        wet: 0.25,
      });
      const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.12 });
      rhodesTremoloRef.current = tremolo;
      rhodesChorusRef.current = chorus;
      rhodesReverbRef.current = reverb;
      rhodesEQ3Ref.current!.chain(tremolo, chorus, reverb, rhodesChannelRef.current!);
    }

    // Lazy-init Piano FX chain (Reverb + EQ3 → Channel)
    if (!pianoFxInitializedRef.current) {
      pianoFxInitializedRef.current = true;
      const pianoReverb = new Tone.Reverb({ decay: 2.0, wet: 0.15 });
      pianoReverbRef.current = pianoReverb;
      pianoEQ3Ref.current!.chain(pianoReverb, pianoChannelRef.current!);
    }

    const adapter = adapterRef.current!;
    const currentState = machine.getState();
    const sig = parseTimeSignature(optsRef.current.timeSignature);
    const tpBar = ticksPerBar(sig);

    // Build flat repeat sequence from sections
    const sections = optsRef.current.sections ?? [];
    const seq = buildFlatSequence(sections);
    flatSeqRef.current = seq;

    // Sync chord timeline to bass, Rhodes, and Piano instruments
    const timelineEntries = buildChordTimelineEntries(sections, seq.bars);
    if (bassInstrumentRef.current) {
      bassInstrumentRef.current.setTimeline(new ChordTimeline(timelineEntries));
      rrCounterRef.current.reset();
    }
    if (rhodesInstrumentRef.current) {
      rhodesInstrumentRef.current.setTimeline(new ChordTimeline(timelineEntries));
      rhodesInstrumentRef.current.reset();
    }
    if (pianoInstrumentRef.current) {
      pianoInstrumentRef.current.setTimeline(new ChordTimeline(timelineEntries));
      pianoInstrumentRef.current.reset();
    }

    // Find virtual start tick for selectedBar (first occurrence in flat sequence)
    let startTick: number;
    if (currentState.status === 'paused') {
      startTick = adapter.ticks;
    } else if (seq.bars.length > 0) {
      const idx = seq.bars.indexOf(currentState.selectedBar);
      startTick = (idx >= 0 ? idx : 0) * tpBar;
    } else {
      startTick = currentState.selectedBar * tpBar;
    }

    // Configure loop for infinite last section
    if (seq.infiniteLoopStart !== null) {
      adapter.setLoop(true, `${seq.infiniteLoopStart * tpBar}i`, `${seq.bars.length * tpBar}i`);
    } else {
      adapter.setLoop(false);
    }

    adapter.ticks = startTick;
    prevTicksRef.current = startTick;
    lastScheduledRef.current = startTick;
    adapter.setBpm(optsRef.current.settings.bpm);

    // Pre-schedule first lookahead window BEFORE transport starts —
    // otherwise beat 1 fires before the first interval callback (25 ms later).
    const loopEndTick = seq.infiniteLoopStart !== null ? seq.bars.length * tpBar : Infinity;
    const firstWindowEnd = Math.min(startTick + LOOKAHEAD_TICKS, loopEndTick);
    engine.scheduleWindow({ fromTicks: startTick, toTicks: firstWindowEnd });
    lastScheduledRef.current = firstWindowEnd;

    const countInBars = optsRef.current.settings.countIn ?? 0;
    const bpmForCalc = optsRef.current.settings.bpm;
    const secondsPerBeat = 60 / bpmForCalc;
    const countInSeconds = countInBars * sig.beatsPerBar * secondsPerBeat;

    // Clear any leftover count-in timeouts from previous play
    countInTimeoutsRef.current.forEach(clearTimeout);
    countInTimeoutsRef.current = [];

    // Schedule count-in beats at absolute audio time before transport starts
    if (countInBars > 0 && (optsRef.current.settings.metronomeEnabled ?? true)) {
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
        const t = setTimeout(
          () => {
            usePlaybackStore.getState()._setCountIn(true, b % sig.beatsPerBar);
          },
          Math.round(50 + beatOffset * 1000),
        );
        countInTimeoutsRef.current.push(t);
      }

      // Clear count-in state when transport actually starts
      const clearT = setTimeout(
        () => {
          usePlaybackStore.getState()._setCountIn(false, 0);
          countInTimeoutsRef.current = [];
        },
        Math.round((0.05 + countInSeconds) * 1000),
      );
      countInTimeoutsRef.current.push(clearT);
    }

    machine.dispatch({ type: 'play' });
    engine.play();
    adapter.start(0.05 + countInSeconds);

    if (intervalRef.current !== null) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const currentTicks = adapterRef.current!.ticks;
      const seq2 = flatSeqRef.current;
      const sig2 = parseTimeSignature(optsRef.current.timeSignature);
      const tpBar2 = ticksPerBar(sig2);

      // Detect Transport.loop wrap (ticks decreased by more than half a bar)
      if (currentTicks < prevTicksRef.current - tpBar2 / 2 && seq2.infiniteLoopStart !== null) {
        const loopEndTick2 = seq2.bars.length * tpBar2;
        const loopStartTick2 = seq2.infiniteLoopStart * tpBar2;
        // Virtual positions >= loopEnd mean "loopStart + (pos - loopEnd)" were pre-scheduled.
        // Convert back to real position; if nothing was pre-scheduled, reset to loopStart.
        const preAmt = lastScheduledRef.current - loopEndTick2;
        lastScheduledRef.current = loopStartTick2 + Math.max(preAmt, 0);
      }
      prevTicksRef.current = currentTicks;

      // Map virtual position to original bar index for UI highlighting
      const virtualBar = Math.floor(currentTicks / tpBar2);
      const originalBar =
        seq2.bars.length > 0
          ? (seq2.bars[Math.min(virtualBar, seq2.bars.length - 1)] ?? 0)
          : virtualBar;

      const beatTicks = currentTicks % tpBar2;
      const tpBeat = tpBar2 / sig2.beatsPerBar;
      const beat = Math.floor(beatTicks / tpBeat);
      machine.dispatch({ type: 'tick', bar: originalBar, beat });

      // Auto-stop at end of finite sequence
      if (
        seq2.infiniteLoopStart === null &&
        seq2.bars.length > 0 &&
        currentTicks >= seq2.bars.length * tpBar2
      ) {
        if (intervalRef.current !== null) clearInterval(intervalRef.current);
        intervalRef.current = null;
        const a = adapterRef.current!;
        a.stop();
        a.setLoop(false);
        a.ticks = 0;
        lastScheduledRef.current = 0;
        engineRef.current?.stop();
        machine.dispatch({ type: 'stop' });
        return;
      }

      // Schedule look-ahead window.
      // Virtual positions: lastScheduledRef may be stored as loopEnd+X (X = pre-scheduled
      // amount past loopStart) to prevent the boundary condition from firing more than once.
      const loopEnd = seq2.infiniteLoopStart !== null ? seq2.bars.length * tpBar2 : Infinity;
      const loopStart = seq2.infiniteLoopStart !== null ? seq2.infiniteLoopStart * tpBar2 : 0;
      const from = lastScheduledRef.current;
      const targetTo = currentTicks + LOOKAHEAD_TICKS;

      if (seq2.infiniteLoopStart !== null && from < loopEnd && targetTo >= loopEnd) {
        // Window crosses loop boundary (fires exactly once per pass because after this
        // lastScheduledRef is set to a virtual position >= loopEnd).
        if (loopEnd > from) {
          engine.scheduleWindow({ fromTicks: from, toTicks: loopEnd });
        }
        // Pre-schedule the head of the next loop pass so beat 1 isn't missed during
        // the ~25 ms interval gap after the transport wraps.
        const preAmt = Math.min(LOOKAHEAD_TICKS, loopEnd - loopStart);
        engine.scheduleWindow({ fromTicks: loopStart, toTicks: loopStart + preAmt });
        // Store virtual position (>= loopEnd) so this block doesn't fire again this pass.
        lastScheduledRef.current = loopEnd + preAmt;
      } else {
        const to = seq2.infiniteLoopStart !== null ? Math.min(targetTo, loopEnd) : targetTo;
        if (to > from) {
          engine.scheduleWindow({ fromTicks: from, toTicks: to });
          lastScheduledRef.current = to;
        }
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

    adapterRef.current?.pause();
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

    const adapter = adapterRef.current!;
    adapter.stop();
    adapter.setLoop(false);
    adapter.ticks = 0;
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
      adapterRef.current!.ticks = state.currentBar * tpBar;
    }
  }, []);

  const prevBar = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    const state = machine.dispatch({ type: 'prevBar' });
    if (state.status === 'idle') {
      const sig = parseTimeSignature(optsRef.current.timeSignature);
      const tpBar = ticksPerBar(sig);
      adapterRef.current!.ticks = state.currentBar * tpBar;
    }
  }, []);

  const selectBar = useCallback((bar: number) => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.dispatch({ type: 'selectBar', bar });
  }, []);

  return { play, pause, stop, nextBar, prevBar, selectBar };
}
