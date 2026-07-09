import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import {
  TransportEngine,
  MetronomeInstrument,
  BassInstrument,
  RhodesInstrument,
  PianoInstrument,
  GuitarInstrument,
  ChordTimeline,
  RoundRobinCounter,
  PlaybackStateMachine,
  ticksPerBar,
  parseTimeSignature,
  defaultSecondStrongBeats,
  METRONOME_SAMPLE_BY_ID,
  pickRhodesLayer,
  pickPianoLayer,
  pickSalamanderLayer,
  DrumInstrument,
  PercussionInstrument,
  type PercussionInstrumentSettings,
  getStyleProfile,
  resolveInstrumentDefaults,
  type HumanizeIntensity,
  bassManifest,
  rhodesManifest,
  pianoManifest,
  salamanderManifest,
  resolveDrumSound,
  selectDrumPlayer,
  guitarManifest,
  electricGuitarManifest,
  type BeatType,
  type EventSink,
  type BassEvent,
  type RhodesEvent,
  type PianoEvent,
  type DrumEvent,
  type PercussionEvent,
  type GuitarEvent,
  buildFlatSequence,
  buildChordTimelineEntries,
  type FlatSequence,
} from '@jazz/music-core';
import {
  ToneAudioAdapter,
  createPitchedResources,
  createOneshotResources,
  createSoloInstrumentFactories,
} from '@jazz/tone-audio-adapter';
import type {
  TimeSignatureString,
  Section,
  ClickSound,
  UserSettingsDTO,
  Style,
} from '@jazz/shared';
import { audioUrl } from '@jazz/shared';
import { usePlaybackStore, useLocalSettingsStore } from '@jazz/plugin-sdk';
import { resolveDrumKit, drumArticulationMap, getInstrument } from '../shell/instrumentRegistry';

const LOOKAHEAD_TICKS = 480 * 4;
const PPQ = 480;

function ticksToSeconds(durationTicks: number, bpm: number): number {
  return (durationTicks * 60) / (PPQ * bpm);
}

/** Per-sound → channel routing that handles both abstract roles and concrete
 *  kit articulations, so per-sound volume channels work across all kits. */
interface DrumChannels {
  bassDrum: Tone.Channel | null;
  snare: Tone.Channel | null;
  hihat: Tone.Channel | null;
  ride: Tone.Channel | null;
  crash: Tone.Channel | null;
  rim: Tone.Channel | null;
  highTom: Tone.Channel | null;
  lowTom: Tone.Channel | null;
  master: Tone.Channel | null;
}

function pickDrumChannel(sound: string, ch: DrumChannels): Tone.Channel | null {
  if (sound === 'bassDrum' || sound === 'kick') return ch.bassDrum;
  if (sound === 'rim' || sound === 'snare_crossstick' || sound === 'snare_rimshot') return ch.rim;
  if (sound.startsWith('snare') || sound === 'snare') return ch.snare;
  if (sound.startsWith('hihat')) return ch.hihat;
  if (sound.startsWith('ride')) return ch.ride;
  if (sound === 'crash' || sound === 'crash_sizzle' || sound === 'splash') return ch.crash;
  if (sound === 'highTom' || sound === 'tom_hi' || sound === 'tom_mhi') return ch.highTom;
  if (sound === 'lowTom' || sound === 'tom_lo' || sound === 'tom_mlow') return ch.lowTom;
  return ch.master;
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

  // Build a DrumInstrumentSettings patch from per-style override object
  function buildDrumSettingsPatch(o: Record<string, unknown>) {
    const patch: Record<string, unknown> = {};
    const boolFields = [
      'enabled',
      'bassDrumEnabled',
      'snareEnabled',
      'hihatEnabled',
      'rideEnabled',
      'crashEnabled',
      'rimEnabled',
      'rideVariation',
      'snareGhosts',
      'bassDrumVariation',
      'tomEnabled',
    ];
    const numFields = [
      'volume',
      'bassDrumVolume',
      'snareVolume',
      'hihatVolume',
      'rideVolume',
      'crashVolume',
      'rimVolume',
      'hihatOpenness',
      'crashFrequency',
      'tomVolume',
    ];
    for (const f of boolFields) if (o[f] !== undefined) patch[f] = o[f];
    for (const f of numFields) if (o[f] !== undefined) patch[f] = o[f];
    if (o.humanizeIntensity !== undefined) patch.humanizeIntensity = o.humanizeIntensity;
    return patch;
  }

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
  const drumsHighTomChannelRef = useRef<Tone.Channel | null>(null);
  const drumsLowTomChannelRef = useRef<Tone.Channel | null>(null);
  const drumsMasterChannelRef = useRef<Tone.Channel | null>(null);
  const drumInstrumentRef = useRef<DrumInstrument | null>(null);
  const drumsRrRef = useRef<Record<string, number>>({});
  /** Players per velocity layer for the active kit (manifest.rrCount). */
  const drumsRrPerLayerRef = useRef(4);
  // Percussion: oneshot players
  const percussionPlayersRef = useRef<Map<string, Tone.Player[]>>(new Map());
  const percussionDisposeRef = useRef<() => void>(() => {});
  const percussionMasterChannelRef = useRef<Tone.Channel | null>(null);
  const percussionInstrumentRef = useRef<PercussionInstrument | null>(null);
  const percussionRrRef = useRef<Record<string, number>>({});
  const percussionManifestRef = useRef<import('@jazz/music-core').InstrumentManifest | null>(null);
  // Guitar: nylon/steel samplers + channel + instrument
  const guitarSamplersRef = useRef<Map<string, Tone.Sampler>>(new Map());
  const guitarDisposeRef = useRef<() => void>(() => {});
  const guitarChannelRef = useRef<Tone.Channel | null>(null);
  const guitarInstrumentRef = useRef<GuitarInstrument | null>(null);
  const rrCounterRef = useRef(new RoundRobinCounter());
  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    // Expose adapter to plugins via global window (Phase C wiring)
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__toneAudioAdapter = adapter;
    }

    // Reuse sampler map for solo instruments (Piano, Rhodes)
    const reuseSamplers = new Map<string, Tone.Sampler>();

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

    // Register first Rhodes sampler for solo reuse
    const rhodesFirstSampler = rhodesRes.samplers.values().next().value;
    if (rhodesFirstSampler) reuseSamplers.set('rhodes', rhodesFirstSampler);

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

    // Register first Piano sampler for solo reuse
    const pianoFirstSampler = pianoRes.samplers.values().next().value;
    if (pianoFirstSampler) reuseSamplers.set('piano', pianoFirstSampler);

    const pianoEventSink: EventSink = (payload, atTicks, velocity, durationTicks) => {
      if (!(optsRef.current.settings.pianoEnabled ?? false)) return;
      const p = payload as PianoEvent;
      const pickLayer =
        optsRef.current.settings.pianoSampleLibrary === 'upright-kw'
          ? pickPianoLayer
          : pickSalamanderLayer;
      const layerName = pickLayer(velocity);
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
    // Only override style defaults when user explicitly set a preference
    if (settings.pianoVoicingDensity) {
      pianoInstrument.setVoicingDensity(settings.pianoVoicingDensity);
    }
    if (settings.pianoProfile) {
      pianoInstrument.setProfile(settings.pianoProfile);
    }
    const pianoRandLevel = (settings.pianoRandomizationLevel ?? 'off') as
      | 'off'
      | 'subtle'
      | 'moderate'
      | 'high';
    pianoInstrument.setHumanize(pianoRandLevel !== 'off');
    pianoInstrument.setRandomizationLevel(pianoRandLevel);
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

    const drumsHighTomChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsTomVolume ?? 0.7),
    }).connect(drumsMasterChannel);
    drumsHighTomChannelRef.current = drumsHighTomChannel;

    const drumsLowTomChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.drumsTomVolume ?? 0.7),
    }).connect(drumsMasterChannel);
    drumsLowTomChannelRef.current = drumsLowTomChannel;

    const drumKitEntry = resolveDrumKit(settings.drumKit);
    const drumKitManifest = drumKitEntry.manifest;
    drumsRrPerLayerRef.current = drumKitManifest.sampleManifest.rrCount ?? 4;

    const drumsRes = createOneshotResources(drumKitManifest.sampleManifest, settings.audioFormat);
    const initDrumChannels: DrumChannels = {
      bassDrum: drumsBassDrumChannel,
      snare: drumsSnareChannel,
      hihat: drumsHihatChannel,
      ride: drumsRideChannel,
      crash: drumsCrashChannel,
      rim: drumsRimChannel,
      highTom: drumsHighTomChannel,
      lowTom: drumsLowTomChannel,
      master: drumsMasterChannel,
    };
    for (const [sound, arr] of drumsRes.players) {
      const ch = pickDrumChannel(sound, initDrumChannels) ?? drumsMasterChannel;
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
      if ((p.sound === 'highTom' || p.sound === 'lowTom') && !(s.drumsTomEnabled ?? true)) return;

      // Resolve abstract sound role → active kit's concrete articulation key,
      // then pick a velocity-layered round-robin player (same path as the
      // admin drum preview). Kits are keyed by articulation, not abstract role.
      const artMap = drumArticulationMap(s.drumKit);
      const concrete = artMap[p.sound] ?? p.sound;
      const resolved = resolveDrumSound(concrete, drumsPlayersRef.current);
      if (!resolved) return;
      const pool = drumsPlayersRef.current.get(resolved);
      if (!pool) return;
      const sel = selectDrumPlayer(
        velocity,
        pool.length,
        drumsRrPerLayerRef.current,
        drumsRrRef.current,
        resolved,
      );
      if (!sel) return;
      const player = pool[sel.playerIndex];
      if (!player) return;
      // Per-event velocity: set player volume inside the callback so it
      // applies at the exact audio time, not at schedule-time (which would
      // be overwritten by the next scheduling window).
      tone.scheduleOnce((time: number) => {
        if (player.loaded) {
          // Use setValueAtTime so volume is applied at the exact same
          // audio time as start(), avoiding a race where .value uses
          // AudioContext.currentTime which may lag behind transport time.
          player.volume.setValueAtTime(sel.volumeDb, time);
          try {
            player.start(time);
          } catch {
            // start time collided with a pending start on this player — skip.
          }
        }
      }, `${atTicks}i`);
    };

    const drumInstrument = drumKitManifest.createInstrument() as DrumInstrument;
    drumInstrument.setStyleProfile(getStyleProfile((settings.style ?? 'swing') as Style));
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
      tomEnabled: settings.drumsTomEnabled ?? true,
      tomVolume: settings.drumsTomVolume ?? 0.7,
    });
    drumInstrumentRef.current = drumInstrument;
    drumInstrument.setOrganismId((settings.drumsPattern as string | null) ?? null);

    // ── Percussion setup ───────────────────────────────────────────────────
    // Resolved from the live instrument registry (contributed by the percussion
    // plugin), never imported directly — see docs/INSTRUMENT-PLUGIN.md.
    const percussionEntry = getInstrument('percussion')!;
    const percussionManifest = percussionEntry.manifest;
    percussionManifestRef.current = percussionManifest;

    const percussionMasterChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.percussionVolume ?? 0.7),
    }).toDestination();
    percussionMasterChannelRef.current = percussionMasterChannel;

    const percussionRes = createOneshotResources(
      percussionManifest.sampleManifest,
      settings.audioFormat,
    );
    for (const [, arr] of percussionRes.players) {
      for (const p of arr) p.connect(percussionMasterChannel);
    }
    percussionPlayersRef.current = percussionRes.players;
    percussionDisposeRef.current = percussionRes.dispose;

    const percussionEventSink: EventSink = (payload, atTicks, velocity, _durationTicks) => {
      const s = optsRef.current.settings;
      if (!(s.percussionEnabled ?? false)) return;
      const p = payload as PercussionEvent;

      // Per-sound enable gates (data-driven from manifest.sounds)
      const percSounds = percussionManifest.sounds;
      if (percSounds) {
        const sRaw = s as Record<string, unknown>;
        const defs = (percussionManifest.defaultSettings ?? {}) as Record<string, unknown>;
        for (const sound of percSounds) {
          if (p.sound !== sound) continue;
          const pascal = sound.charAt(0).toUpperCase() + sound.slice(1);
          const fallback = (defs[`${sound}Enabled`] as boolean) ?? true;
          if (!((sRaw[`percussion${pascal}Enabled`] as boolean | undefined) ?? fallback)) return;
          break;
        }
      }

      const pool = percussionPlayersRef.current.get(p.sound);
      if (!pool) return;
      const rrCount = pool.length;
      const rr = (percussionRrRef.current[p.sound] ?? 0) % rrCount;
      percussionRrRef.current[p.sound] = (percussionRrRef.current[p.sound] ?? 0) + 1;
      const player = pool[rr];
      if (!player) return;
      const velDb = velocity < 1.0 ? Tone.gainToDb(velocity) : 0;
      tone.scheduleOnce((time: number) => {
        if (player.loaded) {
          if (velocity < 1.0) player.volume.setValueAtTime(velDb, time);
          try {
            player.start(time);
          } catch {
            // start time collided with a pending start on this player — skip.
          }
        }
      }, `${atTicks}i`);
    };

    const percussionInstrument = percussionManifest.createInstrument() as PercussionInstrument;
    percussionInstrument.setStyle((settings.style ?? 'swing') as Style);

    const percSounds = percussionManifest.sounds;
    const percInitSettings: Record<string, unknown> = {
      enabled: settings.percussionEnabled ?? false,
      volume: settings.percussionVolume ?? 0.7,
      humanizeIntensity: (settings.percussionHumanizeIntensity ?? 'low') as HumanizeIntensity,
    };

    // Per-sound settings (data-driven from manifest.sounds)
    if (percSounds) {
      const sRaw = settings as Record<string, unknown>;
      const defs = (percussionManifest.defaultSettings ?? {}) as Record<string, unknown>;
      for (const sound of percSounds) {
        const pascal = sound.charAt(0).toUpperCase() + sound.slice(1);
        percInitSettings[`${sound}Enabled`] =
          sRaw[`percussion${pascal}Enabled`] ?? defs[`${sound}Enabled`] ?? true;
        percInitSettings[`${sound}Volume`] =
          sRaw[`percussion${pascal}Volume`] ?? defs[`${sound}Volume`] ?? 0.7;
      }
    }

    percussionInstrument.updateSettings(percInitSettings as Partial<PercussionInstrumentSettings>);
    // Set organism from per-style overrides or the manifest's per-style
    // defaults — resolved via the canonical resolveInstrumentDefaults() helper,
    // which is the single source of truth for per-style instrument defaults.
    const percStyleDefaults = resolveInstrumentDefaults(
      percussionManifest,
      (settings.style ?? 'swing') as Style,
    );
    const percOrganismId =
      (settings.percussionPattern as string | undefined) ??
      (percStyleDefaults.organismId as string | undefined) ??
      null;
    if (percOrganismId) {
      percussionInstrument.setOrganismId(percOrganismId);
    }
    percussionInstrumentRef.current = percussionInstrument;

    // ── Guitar ──────────────────────────────────────────────────────────
    const guitarVariant = (getStyleProfile((settings.style ?? 'swing') as Style).defaultVariants
      .guitar ?? 'guitar') as string;
    const guitarManifestToUse =
      guitarVariant === 'electric-guitar' ? electricGuitarManifest : guitarManifest;
    const guitarLayer = guitarVariant === 'electric-guitar' ? 'normal' : 'nylon';

    const guitarChannel = new Tone.Channel({
      volume: Tone.gainToDb(settings.guitarVolume ?? 0.6),
    }).toDestination();
    guitarChannelRef.current = guitarChannel;

    const guitarRes = createPitchedResources(
      guitarManifestToUse.sampleManifest,
      settings.audioFormat,
    );
    for (const s of guitarRes.samplers.values()) s.connect(guitarChannel);
    guitarSamplersRef.current = guitarRes.samplers;
    guitarDisposeRef.current = guitarRes.dispose;

    const guitarEventSink: EventSink = (payload, atTicks, velocity, durationTicks) => {
      if (!(optsRef.current.settings.guitarEnabled ?? false)) return;
      const p = payload as GuitarEvent;
      const sampler = guitarSamplersRef.current.get(guitarLayer);
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

    const guitarInstrument = new GuitarInstrument(new ChordTimeline(), guitarVariant);
    guitarInstrument.setStyle((settings.style ?? 'swing') as Style);
    guitarInstrument.setHumanize(true);
    guitarInstrumentRef.current = guitarInstrument;

    // ── Transport engine ───────────────────────────────────────────────────
    // Read swingRatio per-style, falling back to Zustand and profile default.
    const style = (settings.style ?? 'swing') as Style;
    const profile = getStyleProfile(style);
    const perStyleSwing = (
      settings.perStyleOverrides?.[style] as Record<string, unknown> | undefined
    )?.swingRatio as number | undefined;
    const zustandStore = useLocalSettingsStore.getState().settings;
    const zustandPerStyleSwing = (
      zustandStore.perStyleOverrides?.[style] as Record<string, unknown> | undefined
    )?.swingRatio as number | undefined;
    const effectiveSwingRatio = perStyleSwing ?? zustandPerStyleSwing ?? profile.swingRatio;

    const engine = new TransportEngine({
      bpm: settings.bpm,
      timeSignature,
      swingRatio: effectiveSwingRatio,
      sink,
    });
    engine.registerSink('bass', bassEventSink);
    engine.registerSink('rhodes', rhodesEventSink);
    engine.registerSink('piano', pianoEventSink);
    engine.registerSink('drums', drumsEventSink);
    engine.registerSink('percussion', percussionEventSink);
    engine.registerSink(guitarVariant, guitarEventSink);

    const metronome = new MetronomeInstrument();
    engine.addInstrument(metronome);
    engine.addInstrument(bassInstrument);
    engine.addInstrument(rhodesInstrument);
    engine.addInstrument(pianoInstrument);
    engine.addInstrument(drumInstrument);
    engine.addInstrument(percussionInstrument);
    engine.addInstrument(guitarInstrument);

    // Apply the initial style profile to engine + all instruments
    engine.setStyleProfile(
      getStyleProfile((settings.style ?? 'swing') as import('@jazz/shared').Style),
    );

    const machine = new PlaybackStateMachine(totalBars);
    machineRef.current = machine;
    engineRef.current = engine;

    // Create and expose solo instrument factories (Phase C wiring)
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__soloInstrumentFactories =
        createSoloInstrumentFactories(reuseSamplers);
    }

    const unsub = machine.subscribe((state) => {
      usePlaybackStore.getState()._setState(state);
    });

    // Sync initial state
    usePlaybackStore.getState()._setState(machine.getState());

    adapter.setBpm(settings.bpm);

    return () => {
      // Clean up global adapter references (Phase C wiring)
      if (typeof window !== 'undefined') {
        const w = window as unknown as Record<string, unknown>;
        if (w.__toneAudioAdapter === adapter) delete w.__toneAudioAdapter;
        delete w.__soloInstrumentFactories;
      }

      document.removeEventListener('pointerdown', warmAudioContext);
      unsub();
      if (scheduleTimerRef.current !== null) clearTimeout(scheduleTimerRef.current);
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
      percussionDisposeRef.current();
      percussionPlayersRef.current = new Map();
      percussionMasterChannelRef.current?.dispose();
      percussionMasterChannelRef.current = null;
      percussionInstrumentRef.current = null;
      percussionRrRef.current = {};
      guitarDisposeRef.current();
      guitarSamplersRef.current = new Map();
      guitarChannelRef.current?.dispose();
      guitarChannelRef.current = null;
      guitarInstrumentRef.current = null;
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

  // Update style profile on engine — propagates tempo, swing, and style to all instruments
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setStyleProfile(getStyleProfile((settings.style ?? 'swing') as Style));
  }, [settings.style]);

  // Update bass volume
  useEffect(() => {
    if (!bassChannelRef.current) return;
    bassChannelRef.current.volume.value = Tone.gainToDb(
      Math.max(0.001, settings.bassVolume ?? 0.7),
    );
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
    rhodesChannelRef.current.volume.value = Tone.gainToDb(
      Math.max(0.001, settings.rhodesVolume ?? 0.6),
    );
  }, [settings.rhodesVolume]);

  // Update Rhodes volume
  // Update Rhodes comping mode (legacy — used only when layerMode is 'none')
  useEffect(() => {
    if (!rhodesInstrumentRef.current) return;
    rhodesInstrumentRef.current.setMode(settings.rhodesMode ?? 'halfNotes');
  }, [settings.rhodesMode]);

  // Apply per-style user overrides on top of engine style defaults.
  // Also mutates optsRef.current.settings so event sinks see per-style values.
  useEffect(() => {
    if (!engineRef.current) return;
    const style = (settings.style ?? 'swing') as Style;
    const overrides = settings.perStyleOverrides?.[style];
    if (!overrides) return;

    // Mutate optsRef so event sinks pick up per-style enabled/volume
    const s = optsRef.current.settings as Record<string, unknown>;
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) s[key] = value;
    }

    // ── Bass ──
    if (bassInstrumentRef.current) {
      if (overrides.bassComplexity !== undefined)
        bassInstrumentRef.current.setComplexity(
          overrides.bassComplexity as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        );
      if (overrides.bassOctaveUp !== undefined)
        bassInstrumentRef.current.setOctaveShift(overrides.bassOctaveUp ? 1 : 0);
    }
    if (bassChannelRef.current && overrides.bassVolume !== undefined) {
      bassChannelRef.current.volume.value = Tone.gainToDb(
        Math.max(0.001, overrides.bassVolume as number),
      );
    }

    // ── Piano ──
    if (pianoInstrumentRef.current) {
      if (overrides.pianoProfile)
        pianoInstrumentRef.current.setProfile(
          overrides.pianoProfile as import('@jazz/music-core').CompingProfileId,
        );
      if (overrides.pianoVoicingDensity)
        pianoInstrumentRef.current.setVoicingDensity(
          overrides.pianoVoicingDensity as import('@jazz/music-core').PianoVoicingDensity,
        );
      if (overrides.pianoRandomizationLevel !== undefined) {
        const lvl = overrides.pianoRandomizationLevel as string;
        pianoInstrumentRef.current.setHumanize(lvl !== 'off');
        pianoInstrumentRef.current.setRandomizationLevel(
          lvl as 'off' | 'subtle' | 'moderate' | 'high',
        );
      }
    }
    if (pianoChannelRef.current && overrides.pianoVolume !== undefined) {
      pianoChannelRef.current.volume.value = Tone.gainToDb(
        Math.max(0.001, overrides.pianoVolume as number),
      );
    }

    // ── Rhodes ──
    if (rhodesInstrumentRef.current) {
      if (overrides.rhodesLayerMode)
        rhodesInstrumentRef.current.setLayerMode(
          overrides.rhodesLayerMode as import('@jazz/music-core').RhodesLayerMode,
        );
      if (overrides.rhodesVoicingDensity)
        rhodesInstrumentRef.current.setVoicingDensity(
          overrides.rhodesVoicingDensity as import('@jazz/music-core').RhodesVoicingDensity,
        );
      if (overrides.rhodesLayerVolume !== undefined)
        rhodesInstrumentRef.current.setLayerVolume(overrides.rhodesLayerVolume as number);
      if (overrides.rhodesMode)
        rhodesInstrumentRef.current.setMode(
          overrides.rhodesMode as import('@jazz/music-core').RhodesCompingMode,
        );
    }
    if (rhodesChannelRef.current && overrides.rhodesVolume !== undefined) {
      rhodesChannelRef.current.volume.value = Tone.gainToDb(
        Math.max(0.001, overrides.rhodesVolume as number),
      );
    }

    // ── Drums ──
    if (drumInstrumentRef.current) {
      drumInstrumentRef.current.updateSettings(buildDrumSettingsPatch(overrides));
    }
    if (drumsMasterChannelRef.current && overrides.drumsVolume !== undefined) {
      drumsMasterChannelRef.current.volume.value = Tone.gainToDb(
        Math.max(0.001, overrides.drumsVolume as number),
      );
    }

    // ── Percussion ──
    if (percussionInstrumentRef.current) {
      const patch: Record<string, unknown> = {};
      if (overrides.percussionEnabled !== undefined) patch.enabled = overrides.percussionEnabled;
      if (overrides.percussionVolume !== undefined) patch.volume = overrides.percussionVolume;
      if (overrides.percussionHumanizeIntensity !== undefined)
        patch.humanizeIntensity = overrides.percussionHumanizeIntensity;

      // Per-sound overrides (data-driven from manifest.sounds)
      const percManifest = percussionManifestRef.current;
      const percSounds = percManifest?.sounds;
      if (percSounds) {
        const o = overrides as Record<string, unknown>;
        for (const sound of percSounds) {
          const pascal = sound.charAt(0).toUpperCase() + sound.slice(1);
          const enabledVal = o[`percussion${pascal}Enabled`];
          const volumeVal = o[`percussion${pascal}Volume`];
          if (enabledVal !== undefined) patch[`${sound}Enabled`] = enabledVal;
          if (volumeVal !== undefined) patch[`${sound}Volume`] = volumeVal;
        }
      }

      percussionInstrumentRef.current.updateSettings(
        patch as Partial<PercussionInstrumentSettings>,
      );
      // Update organism if pattern changed
      if (overrides.percussionPattern !== undefined) {
        percussionInstrumentRef.current.setOrganismId(overrides.percussionPattern as string | null);
      }
    }
    if (percussionMasterChannelRef.current && overrides.percussionVolume !== undefined) {
      percussionMasterChannelRef.current.volume.value = Tone.gainToDb(
        Math.max(0.001, overrides.percussionVolume as number),
      );
    }

    // ── Guitar ──
    if (guitarChannelRef.current && overrides.guitarVolume !== undefined) {
      guitarChannelRef.current.volume.value = Tone.gainToDb(
        Math.max(0.001, overrides.guitarVolume as number),
      );
    }
  }, [settings.style, settings.perStyleOverrides]);

  // Update Rhodes layer volume (not style-specific)
  useEffect(() => {
    if (!rhodesInstrumentRef.current) return;
    rhodesInstrumentRef.current.setLayerVolume(settings.rhodesLayerVolume ?? 0.5);
  }, [settings.rhodesLayerVolume]);

  // Update Piano volume
  useEffect(() => {
    if (!pianoChannelRef.current) return;
    pianoChannelRef.current.volume.value = Tone.gainToDb(
      Math.max(0.001, settings.pianoVolume ?? 0.7),
    );
  }, [settings.pianoVolume]);

  // Update Piano randomization level
  useEffect(() => {
    if (!pianoInstrumentRef.current) return;
    const level = (settings.pianoRandomizationLevel ?? 'off') as
      | 'off'
      | 'subtle'
      | 'moderate'
      | 'high';
    pianoInstrumentRef.current.setHumanize(level !== 'off');
    pianoInstrumentRef.current.setRandomizationLevel(level);
  }, [settings.pianoRandomizationLevel]);

  // Update Guitar volume
  useEffect(() => {
    if (!guitarChannelRef.current) return;
    guitarChannelRef.current.volume.value = Tone.gainToDb(
      Math.max(0.001, settings.guitarVolume ?? 0.6),
    );
  }, [settings.guitarVolume]);

  // Reload piano sample library when pianoSampleLibrary changes
  useEffect(() => {
    if (!initializedRef.current) return;

    const activePianoManifest =
      settings.pianoSampleLibrary === 'upright-kw' ? pianoManifest : salamanderManifest;
    const pianoRes = createPitchedResources(
      activePianoManifest.sampleManifest,
      settings.audioFormat,
    );

    // Dispose old samplers before replacing
    pianoDisposeRef.current();

    // Connect new samplers to the existing EQ3
    const eq3 = pianoEQ3Ref.current;
    for (const s of pianoRes.samplers.values()) {
      if (eq3) s.connect(eq3);
    }

    pianoSamplersRef.current = pianoRes.samplers;
    pianoDisposeRef.current = pianoRes.dispose;
  }, [settings.pianoSampleLibrary, settings.audioFormat]);

  // Update drum instrument settings + per-sound channel volumes
  useEffect(() => {
    if (!drumInstrumentRef.current) return;
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
      tomEnabled: settings.drumsTomEnabled ?? true,
      tomVolume: settings.drumsTomVolume ?? 0.7,
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
    if (drumsHighTomChannelRef.current)
      drumsHighTomChannelRef.current.volume.value = Tone.gainToDb(settings.drumsTomVolume ?? 0.7);
    if (drumsLowTomChannelRef.current)
      drumsLowTomChannelRef.current.volume.value = Tone.gainToDb(settings.drumsTomVolume ?? 0.7);
  }, [
    settings.drumsEnabled,
    settings.drumsVolume,
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
    settings.drumsTomEnabled,
    settings.drumsTomVolume,
  ]);

  // Sync organism selection (drumsPattern) to DrumInstrument
  useEffect(() => {
    if (!drumInstrumentRef.current) return;
    drumInstrumentRef.current.setOrganismId((settings.drumsPattern as string | null) ?? null);
  }, [settings.drumsPattern]);

  // Reload drum sample resources when kit changes (jazz-drum-kit ↔ funk-drum-kit)
  const prevDrumKitRef = useRef(settings.drumKit);
  useEffect(() => {
    if (!initializedRef.current) return;
    if (settings.drumKit === prevDrumKitRef.current) return;
    prevDrumKitRef.current = settings.drumKit;

    const manifest = resolveDrumKit(settings.drumKit).manifest;
    drumsRrPerLayerRef.current = manifest.sampleManifest.rrCount ?? 4;

    // Dispose old players
    drumsDisposeRef.current?.();

    const drumsRes = createOneshotResources(manifest.sampleManifest, settings.audioFormat);
    const channels: DrumChannels = {
      bassDrum: drumsBassDrumChannelRef.current,
      snare: drumsSnareChannelRef.current,
      hihat: drumsHihatChannelRef.current,
      ride: drumsRideChannelRef.current,
      crash: drumsCrashChannelRef.current,
      rim: drumsRimChannelRef.current,
      highTom: drumsHighTomChannelRef.current,
      lowTom: drumsLowTomChannelRef.current,
      master: drumsMasterChannelRef.current,
    };
    for (const [sound, arr] of drumsRes.players) {
      const ch = pickDrumChannel(sound, channels);
      if (ch) for (const p of arr) p.connect(ch);
    }
    drumsPlayersRef.current = drumsRes.players;
    drumsDisposeRef.current = drumsRes.dispose;
    drumsRrRef.current = {};
  }, [settings.drumKit, settings.audioFormat]);

  // Update swing ratio — read per-style from settings + Zustand
  useEffect(() => {
    if (!engineRef.current) return;
    const style = (settings.style ?? 'swing') as Style;
    const profile = getStyleProfile(style);
    const perStyleSwing = (
      settings.perStyleOverrides?.[style] as Record<string, unknown> | undefined
    )?.swingRatio as number | undefined;
    const zs = useLocalSettingsStore.getState().settings;
    const zustandPerStyleSwing = (
      zs.perStyleOverrides?.[style] as Record<string, unknown> | undefined
    )?.swingRatio as number | undefined;
    engineRef.current.setSwingRatio(perStyleSwing ?? zustandPerStyleSwing ?? profile.swingRatio);
  }, [settings.style, settings.perStyleOverrides]);

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
    const entries = buildChordTimelineEntries(opts.sections ?? [], seq.bars, opts.timeSignature);
    const timeline = new ChordTimeline(entries);
    bassInstrumentRef.current?.setTimeline(timeline);
    rhodesInstrumentRef.current?.setTimeline(new ChordTimeline(entries));
    pianoInstrumentRef.current?.setTimeline(new ChordTimeline(entries));
    // Propagate sections to drum instrument for section-driven cell scheduling
    engineRef.current?.setSections(opts.sections ?? null);
  }, [opts.sections, opts.timeSignature]);

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

    // Wire grid sections into the drum instrument for section-driven cell scheduling
    engine.setSections(sections);

    // Sync chord timeline to bass, Rhodes, and Piano instruments
    const timelineEntries = buildChordTimelineEntries(
      sections,
      seq.bars,
      optsRef.current.timeSignature,
    );
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

    // When resuming from pause, cancel any pending transport events left over
    // from before the pause. Otherwise they will fire alongside the newly
    // scheduled events and trigger Tone.js "Start time must be strictly
    // greater than previous start time" errors (same player started twice at
    // the same audio time).
    if (currentState.status === 'paused') {
      Tone.Transport.cancel();
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

    const countInBars = optsRef.current.settings.countIn ?? 1;
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

    if (scheduleTimerRef.current !== null) clearTimeout(scheduleTimerRef.current);

    const scheduleTick = (): boolean => {
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
        const a = adapterRef.current!;
        a.stop();
        a.setLoop(false);
        a.ticks = 0;
        lastScheduledRef.current = 0;
        engineRef.current?.stop();

        // Stop any currently-playing oneshot samples (drums, percussion)
        // so long samples (e.g. hihat_stir) don't ring out after transport stop.
        for (const players of drumsPlayersRef.current.values()) {
          for (const player of players) {
            try {
              player.stop();
            } catch {
              /* player already stopped */
            }
          }
        }
        for (const players of percussionPlayersRef.current.values()) {
          for (const player of players) {
            try {
              player.stop();
            } catch {
              /* player already stopped */
            }
          }
        }

        machine.dispatch({ type: 'stop' });
        return false;
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
      return true;
    };

    const runLoop = () => {
      if (scheduleTick() && engineRef.current?.status === 'playing') {
        scheduleTimerRef.current = setTimeout(runLoop, 25);
      }
    };
    runLoop();
  }, []);

  const pause = useCallback(() => {
    const engine = engineRef.current;
    const machine = machineRef.current;
    if (!engine || !machine) return;

    countInTimeoutsRef.current.forEach(clearTimeout);
    countInTimeoutsRef.current = [];
    usePlaybackStore.getState()._setCountIn(false, 0);

    if (scheduleTimerRef.current !== null) {
      clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
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

    if (scheduleTimerRef.current !== null) {
      clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }

    const adapter = adapterRef.current!;
    adapter.stop();
    adapter.setLoop(false);
    adapter.ticks = 0;
    lastScheduledRef.current = 0;
    prevTicksRef.current = 0;

    engine.stop();

    // Stop any currently-playing oneshot samples (drums, percussion) so they
    // don't ring out after the transport has stopped.
    for (const players of drumsPlayersRef.current.values()) {
      for (const player of players) {
        try {
          player.stop();
        } catch {
          /* player already stopped */
        }
      }
    }
    for (const players of percussionPlayersRef.current.values()) {
      for (const player of players) {
        try {
          player.stop();
        } catch {
          /* player already stopped */
        }
      }
    }

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
