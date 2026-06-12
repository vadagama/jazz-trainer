import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import {
  TransportEngine,
  MetronomeInstrument,
  BassInstrument,
  RhodesInstrument,
  ChordTimeline,
  RoundRobinCounter,
  PlaybackStateMachine,
  parseChord,
  ticksPerBar,
  parseTimeSignature,
  defaultSecondStrongBeats,
  METRONOME_SAMPLE_BY_ID,
  buildBassPluckUrls,
  buildBassMuteUrls,
  RHODES_LAYERS,
  RHODES_SAMPLER_BASE_URL,
  pickRhodesLayer,
  DrumInstrument,
  DRUM_SAMPLE_FILES,
  DRUMS_BASE_URL,
  type BeatType,
  type NoteSink,
  type ChordSink,
  type DrumSink,
  type DrumSound,
  type ChordTimelineEntry,
} from '@jazz/music-core';
import { ToneAudioAdapter } from '@jazz/tone-audio-adapter';
import type { TimeSignatureString, Section, ClickSound } from '@jazz/shared';
import type { UserSettingsDTO } from '@jazz/shared';
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

  const engineRef = useRef<TransportEngine | null>(null);
  const machineRef = useRef<PlaybackStateMachine | null>(null);
  const strongPlayerRef = useRef<Tone.Player | null>(null);
  const strong2PlayerRef = useRef<Tone.Player | null>(null);
  const weakPlayerRef = useRef<Tone.Player | null>(null);
  const strongUrlRef = useRef('');
  const strong2UrlRef = useRef('');
  const weakUrlRef = useRef('');
  // Bass: 4 Tone.Samplers per articulation (pluck + mute) + a Channel for volume
  const bassMuteRRRef = useRef<Tone.Sampler[]>([]);
  const bassPluckRRRef = useRef<Tone.Sampler[]>([]);
  const bassChannelRef = useRef<Tone.Channel | null>(null);
  const bassInstrumentRef = useRef<BassInstrument | null>(null);
  // Rhodes: 4 Tone.Samplers (one per velocity layer) + FX chain + instrument
  const rhodesLayersRef = useRef<Record<string, Tone.Sampler>>({});
  const rhodesEQ3Ref = useRef<Tone.EQ3 | null>(null);
  const rhodesTremoloRef = useRef<Tone.Tremolo | null>(null);
  const rhodesChorusRef = useRef<Tone.Chorus | null>(null);
  const rhodesReverbRef = useRef<Tone.Reverb | null>(null);
  const rhodesChannelRef = useRef<Tone.Channel | null>(null);
  const rhodesInstrumentRef = useRef<RhodesInstrument | null>(null);
  // Drums: 3 × 4 Tone.Players (one per RR variant per sound) + 3 per-sound Channels + 1 master
  const drumsRidePlayersRef = useRef<Tone.Player[]>([]);
  const drumsStirPlayersRef = useRef<Tone.Player[]>([]);
  const drumsHihatPlayersRef = useRef<Tone.Player[]>([]);
  const drumsRideChannelRef = useRef<Tone.Channel | null>(null);
  const drumsStirChannelRef = useRef<Tone.Channel | null>(null);
  const drumsHihatChannelRef = useRef<Tone.Channel | null>(null);
  const drumsMasterChannelRef = useRef<Tone.Channel | null>(null);
  const drumInstrumentRef = useRef<DrumInstrument | null>(null);
  const drumsRrRef = useRef<Record<DrumSound, number>>({ ride: 0, stir: 0, hihatFoot: 0 });
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

    // One Sampler per RR variant per articulation so we can cycle through real recordings
    const pluckSamplers = ([1, 2, 3, 4] as const).map((rr) =>
      new Tone.Sampler({
        urls: buildBassPluckUrls(rr),
        baseUrl: BASS_BASE_URL,
        release: 0.5,
      }).connect(bassChannel),
    );
    bassPluckRRRef.current = pluckSamplers;

    const muteSamplers = ([1, 2, 3, 4] as const).map((rr) =>
      new Tone.Sampler({
        urls: buildBassMuteUrls(rr),
        baseUrl: BASS_BASE_URL,
        release: 0.3,
      }).connect(bassChannel),
    );
    bassMuteRRRef.current = muteSamplers;

    // Pre-warm: start AudioContext on any first user gesture so all OGG/MP3 samples
    // finish decoding before the user clicks Play. Without this, AudioContext stays
    // suspended until play() and Tone.loaded() blocks for the full decode (~200–800 ms).
    const warmAudioContext = () => {
      void Tone.start();
    };
    document.addEventListener('pointerdown', warmAudioContext, { once: true });

    const noteSink: NoteSink = (atTicks, note, velocity, durationTicks, articulation) => {
      if (!(optsRef.current.settings.bassEnabled ?? true)) return;
      const pool = articulation === 'mute' ? bassMuteRRRef.current : bassPluckRRRef.current;
      const rrIndex = rrCounterRef.current.next(note, articulation) - 1; // 0-based
      const sampler = pool[rrIndex];
      if (!sampler) return;
      // Convert ticks to seconds: ticks / PPQ * (60 / bpm)
      const durationSecs = ticksToSeconds(durationTicks, optsRef.current.settings.bpm);
      tone.scheduleOnce((time: number) => {
        if (sampler.loaded) sampler.triggerAttackRelease(note, durationSecs, time, velocity);
      }, `${atTicks}i`);
    };

    const bassTimeline = new ChordTimeline();
    const bassInstrument = new BassInstrument(bassTimeline);
    bassInstrumentRef.current = bassInstrument;

    // ── Rhodes sampler setup ───────────────────────────────────────────────
    const rhodesEQ3 = new Tone.EQ3({ low: -2, mid: 0, high: 1 });
    const rhodesTremolo = new Tone.Tremolo({ frequency: 5.5, depth: 0.18, wet: 0.25 }).start();
    const rhodesChorus = new Tone.Chorus({
      frequency: 1.4,
      delayTime: 2.5,
      depth: 0.25,
      wet: 0.25,
    }).start();
    const rhodesReverb = new Tone.Reverb({ decay: 1.8, wet: 0.12 });
    const rhodesChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.rhodesVolume ?? 0.6),
      pan: 0.05,
    }).toDestination();
    rhodesEQ3.chain(rhodesTremolo, rhodesChorus, rhodesReverb, rhodesChannel);

    rhodesEQ3Ref.current = rhodesEQ3;
    rhodesTremoloRef.current = rhodesTremolo;
    rhodesChorusRef.current = rhodesChorus;
    rhodesReverbRef.current = rhodesReverb;
    rhodesChannelRef.current = rhodesChannel;

    const rhodesLayers: Record<string, Tone.Sampler> = {};
    for (const [layerName, noteMap] of Object.entries(RHODES_LAYERS)) {
      rhodesLayers[layerName] = new Tone.Sampler({
        urls: noteMap,
        baseUrl: RHODES_SAMPLER_BASE_URL,
        release: 1.5,
      }).connect(rhodesEQ3);
    }
    rhodesLayersRef.current = rhodesLayers;

    const chordSink: ChordSink = (atTicks, notes, velocity, durationTicks) => {
      if (!(optsRef.current.settings.rhodesEnabled ?? false)) return;
      const layerName = pickRhodesLayer(velocity);
      const sampler = rhodesLayersRef.current[layerName];
      if (!sampler) return;
      const durationSecs = ticksToSeconds(durationTicks, optsRef.current.settings.bpm);
      tone.scheduleOnce((time: number) => {
        if (sampler.loaded) {
          for (const note of notes) {
            sampler.triggerAttackRelease(note, durationSecs, time, velocity);
          }
        }
      }, `${atTicks}i`);
    };

    const rhodesTimeline = new ChordTimeline();
    const rhodesInstrument = new RhodesInstrument(rhodesTimeline);
    rhodesInstrumentRef.current = rhodesInstrument;

    // ── Drums setup ───────────────────────────────────────────────────────────
    const drumsMasterChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsVolume ?? 0.7),
    }).toDestination();
    drumsMasterChannelRef.current = drumsMasterChannel;

    const drumsRideChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsRideVolume ?? 0.7),
    }).connect(drumsMasterChannel);
    const drumsStirChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsStirVolume ?? 0.6),
    }).connect(drumsMasterChannel);
    const drumsHihatChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsHihatVolume ?? 0.55),
    }).connect(drumsMasterChannel);
    drumsRideChannelRef.current = drumsRideChannel;
    drumsStirChannelRef.current = drumsStirChannel;
    drumsHihatChannelRef.current = drumsHihatChannel;

    const makeDrumPlayers = (sound: DrumSound, channel: Tone.Channel): Tone.Player[] =>
      DRUM_SAMPLE_FILES[sound].map((file) =>
        new Tone.Player(`${DRUMS_BASE_URL}${file}`).connect(channel),
      );

    drumsRidePlayersRef.current = makeDrumPlayers('ride', drumsRideChannel);
    drumsStirPlayersRef.current = makeDrumPlayers('stir', drumsStirChannel);
    drumsHihatPlayersRef.current = makeDrumPlayers('hihatFoot', drumsHihatChannel);

    const drumSink: DrumSink = (atTicks, sound, _velocity, _durationTicks) => {
      const s = optsRef.current.settings;
      if (!(s.drumsEnabled ?? true)) return;
      if (sound === 'ride' && !(s.drumsRideEnabled ?? true)) return;
      if (sound === 'stir' && !(s.drumsStirEnabled ?? true)) return;
      if (sound === 'hihatFoot' && !(s.drumsHihatEnabled ?? true)) return;

      const pool =
        sound === 'ride'
          ? drumsRidePlayersRef.current
          : sound === 'stir'
            ? drumsStirPlayersRef.current
            : drumsHihatPlayersRef.current;

      const rr = drumsRrRef.current[sound] % 4;
      drumsRrRef.current[sound]++;
      const player = pool[rr];
      if (!player) return;

      tone.scheduleOnce((time: number) => {
        if (player.loaded) player.start(time);
      }, `${atTicks}i`);
    };

    const drumInstrument = new DrumInstrument();
    drumInstrument.setRidePattern(
      (settings.drumsRidePattern ?? 'swingRide') as 'quarters' | 'swingRide',
    );
    drumInstrumentRef.current = drumInstrument;

    const engine = new TransportEngine({
      bpm: settings.bpm,
      timeSignature,
      swingRatio: settings.swingRatio ?? 0.50,
      sink,
      noteSink,
      chordSink,
      drumSink,
    });

    const metronome = new MetronomeInstrument();
    engine.addInstrument(metronome);
    engine.addInstrument(bassInstrument);
    engine.addInstrument(rhodesInstrument);
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
      bassMuteRRRef.current.forEach((s) => s.dispose());
      bassMuteRRRef.current = [];
      bassPluckRRRef.current.forEach((s) => s.dispose());
      bassPluckRRRef.current = [];
      bassChannelRef.current?.dispose();
      bassChannelRef.current = null;
      bassInstrumentRef.current = null;
      Object.values(rhodesLayersRef.current).forEach((s) => s.dispose());
      rhodesLayersRef.current = {};
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
      drumsRidePlayersRef.current.forEach((p) => p.dispose());
      drumsRidePlayersRef.current = [];
      drumsStirPlayersRef.current.forEach((p) => p.dispose());
      drumsStirPlayersRef.current = [];
      drumsHihatPlayersRef.current.forEach((p) => p.dispose());
      drumsHihatPlayersRef.current = [];
      drumsRideChannelRef.current?.dispose();
      drumsRideChannelRef.current = null;
      drumsStirChannelRef.current?.dispose();
      drumsStirChannelRef.current = null;
      drumsHihatChannelRef.current?.dispose();
      drumsHihatChannelRef.current = null;
      drumsMasterChannelRef.current?.dispose();
      drumsMasterChannelRef.current = null;
      drumInstrumentRef.current = null;
      drumsRrRef.current = { ride: 0, stir: 0, hihatFoot: 0 };
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
    rhodesChannelRef.current.volume.value = Tone.gainToDb(settings.rhodesVolume ?? 0.6);
  }, [settings.rhodesVolume]);

  // Update Rhodes comping mode
  useEffect(() => {
    if (!rhodesInstrumentRef.current) return;
    rhodesInstrumentRef.current.setMode(settings.rhodesMode ?? 'halfNotes');
  }, [settings.rhodesMode]);

  // Update Rhodes voicing density
  useEffect(() => {
    if (!rhodesInstrumentRef.current) return;
    rhodesInstrumentRef.current.setVoicingDensity(settings.rhodesVoicingDensity ?? 'rootless3');
  }, [settings.rhodesVoicingDensity]);

  // Update drums master volume
  useEffect(() => {
    if (!drumsMasterChannelRef.current) return;
    drumsMasterChannelRef.current.volume.value = Tone.gainToDb(settings.drumsVolume ?? 0.7);
  }, [settings.drumsVolume]);

  // Update per-sound drums volumes
  useEffect(() => {
    if (drumsRideChannelRef.current)
      drumsRideChannelRef.current.volume.value = Tone.gainToDb(settings.drumsRideVolume ?? 0.7);
  }, [settings.drumsRideVolume]);
  useEffect(() => {
    if (drumsStirChannelRef.current)
      drumsStirChannelRef.current.volume.value = Tone.gainToDb(settings.drumsStirVolume ?? 0.6);
  }, [settings.drumsStirVolume]);
  useEffect(() => {
    if (drumsHihatChannelRef.current)
      drumsHihatChannelRef.current.volume.value = Tone.gainToDb(settings.drumsHihatVolume ?? 0.55);
  }, [settings.drumsHihatVolume]);

  // Update ride pattern
  useEffect(() => {
    if (!drumInstrumentRef.current) return;
    drumInstrumentRef.current.setRidePattern(
      (settings.drumsRidePattern ?? 'swingRide') as 'quarters' | 'swingRide',
    );
  }, [settings.drumsRidePattern]);

  // Update swing ratio
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setSwingRatio(settings.swingRatio ?? 0.50);
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
  }, [opts.sections]);

  const play = useCallback(async () => {
    const engine = engineRef.current;
    const machine = machineRef.current;
    if (!engine || !machine) return;

    await Tone.start();
    // Wait for samples to finish loading before scheduling
    await Tone.loaded();

    const adapter = adapterRef.current!;
    const currentState = machine.getState();
    const sig = parseTimeSignature(optsRef.current.timeSignature);
    const tpBar = ticksPerBar(sig);

    // Build flat repeat sequence from sections
    const sections = optsRef.current.sections ?? [];
    const seq = buildFlatSequence(sections);
    flatSeqRef.current = seq;

    // Sync chord timeline to bass and Rhodes instruments
    const timelineEntries = buildChordTimelineEntries(sections, seq.bars);
    if (bassInstrumentRef.current) {
      bassInstrumentRef.current.setTimeline(new ChordTimeline(timelineEntries));
      rrCounterRef.current.reset();
    }
    if (rhodesInstrumentRef.current) {
      rhodesInstrumentRef.current.setTimeline(new ChordTimeline(timelineEntries));
      rhodesInstrumentRef.current.reset();
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
