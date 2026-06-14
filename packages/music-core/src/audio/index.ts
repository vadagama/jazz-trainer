export {
  MetronomeInstrument,
  type Instrument,
  type ScheduleWindow,
  type ScheduleContext,
  type MetronomeOptions,
  type BassArticulation,
  type BassEvent,
  type RhodesEvent,
  type PianoEvent,
  type DrumEvent,
  type GuitarEvent,
  type GuitarStrum,
  type InstrumentEventPayload,
} from './instrument.js';
export {
  TransportEngine,
  type TransportEngineOptions,
  type ClickSink,
  type EventSink,
  type NoteSink,
  type BeatType,
} from './transportEngine.js';
export {
  METRONOME_SAMPLES,
  METRONOME_SAMPLE_BY_ID,
  BASS_SAMPLER,
  PIANO_SAMPLER,
  DRUMS_DRUMKIT,
  buildBassPluckUrls,
  buildBassMuteUrls,
  type MetronomeSampleDef,
  type SamplerDef,
  type DrumkitDef,
  type NoteMap,
  type DrumVoice,
} from './sampleRegistry.js';
export { RoundRobinCounter } from './rrCounter.js';
export { ChordTimeline, type ChordTimelineEntry } from './chordTimeline.js';
export { BassInstrument } from './bassInstrument.js';
export {
  RHODES_LAYERS,
  RHODES_SAMPLER_BASE_URL,
  pickRhodesLayer,
  type RhodesVelocityLayer,
} from './rhodesSampleRegistry.js';
export {
  UPRIGHT_LAYERS,
  UPRIGHT_SAMPLER_BASE_URL,
  pickPianoLayer,
  type PianoVelocityLayer,
} from './pianoSampleRegistry.js';
export {
  SALAMANDER_LAYERS,
  SALAMANDER_SAMPLER_BASE_URL,
  pickSalamanderLayer,
  type SalamanderVelocityLayer,
} from './salamanderSampleRegistry.js';
export { RhodesInstrument } from './rhodesInstrument.js';
export {
  buildVoicing,
  getCompPattern,
  getLayerPattern,
  LAYER_PATTERNS,
  noteToMidi,
  midiToNote,
  SWING_PATTERNS,
  type RhodesVoicingDensity,
  type RhodesCompingMode,
  type RhodesLayerMode,
  type CompChordRef,
  type CompEvent,
  type RhodesRhythmPattern,
} from './rhodesVoicing.js';
export { type ChordSink, type DrumSink } from './transportEngine.js';
export {
  type ScheduledNote,
  type ScheduledClick,
  type AudioPort,
  type MidiInputEvent,
  type InputPort,
} from './ports.js';
export { testAudioPortContract } from './ports.contract.js';
export {
  DRUM_SAMPLE_FILES,
  DRUMS_BASE_URL,
  SWIRLY_DRUMS_BASE_URL,
  type DrumSound,
} from './drumSampleRegistry.js';
export {
  DrumInstrument,
  DEFAULT_DRUM_SETTINGS,
  type DrumRidePattern,
  type DrumsPattern,
  type HumanizeIntensity,
  type DrumInstrumentSettings,
} from './drumInstrument.js';
export {
  evaluateNote,
  evaluateNoteSequence,
  evaluateRhythm,
  scoreNoteEval,
  scoreRhythmEval,
  type MidiEvalScore,
  type MidiEvalOptions,
  type NoteEvalResult,
  type RhythmEvalResult,
  type BeatEval,
} from './midiEval.js';
export { type SampleManifest } from './sampleManifest.js';
export { type InstrumentManifest } from './instrumentManifest.js';
export { bassManifest } from './bassManifest.js';
export { rhodesManifest } from './rhodesManifest.js';
export { pianoManifest } from './pianoManifest.js';
export { salamanderManifest } from './salamanderManifest.js';
export { drumsManifest } from './drumsManifest.js';
export { guitarManifest } from './guitarManifest.js';
export { GuitarInstrument, type GuitarMode, type GuitarVoicing } from './guitarInstrument.js';
export { PianoInstrument } from './pianoInstrument.js';
export {
  PianoRandomizer,
  type PianoRandomizationLevel,
  type PianoBarContext,
} from './pianoRandomizer.js';
export { buildPianoVoicing, type PianoVoicingDensity } from './pianoVoicing.js';
export { avoidConflicts } from './pianoRhodesInteraction.js';
export {
  getCompPattern as getPianoCompPattern,
  getCompingProfile,
  COMP_PATTERNS as PIANO_COMP_PATTERNS,
  COMPING_PROFILES as PIANO_COMPING_PROFILES,
  type CompPatternId,
  type CompingProfileId,
  type CompingProfile,
} from './pianoComping.js';
