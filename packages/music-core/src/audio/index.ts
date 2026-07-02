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
  type VibraphoneEvent,
  type OrganEvent,
  type ClarinetEvent,
  type PercussionEvent,
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
  BassRandomizer,
  type BassRandomizationLevel,
  type ApproachVariant,
} from './bassRandomizer.js';
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
  RANGE_MIN_HIGH,
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
  type MidiDeviceInfo,
} from './ports.js';
export { type SoloInstrument, type PolySynthLike, type SamplerLike } from './soloInstrument.js';
export { SynthSoloInstrument, type SynthSoloInstrumentOptions } from './synthSoloInstrument.js';
export {
  SamplerSoloInstrument,
  type SamplerSoloInstrumentOptions,
} from './samplerSoloInstrument.js';
export { ReuseSoloInstrument } from './reuseSoloInstrument.js';
export {
  type SoloInstrumentManifest,
  type SoloInstrumentFactories,
  type SoloInstrumentSamples,
} from './soloInstrumentManifest.js';
export { SOLO_INSTRUMENT_MANIFESTS } from './soloInstrumentRegistry.js';
export { SoloInstrumentHost } from './soloInstrumentHost.js';
export { DuckingCompressor, type DuckingCompressorOptions } from './duckingCompressor.js';
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
  type HumanizeIntensity,
  type DrumInstrumentSettings,
} from './drumInstrument.js';
export {
  PercussionInstrument,
  DEFAULT_PERCUSSION_SETTINGS,
  type PercussionPattern,
  type PercussionInstrumentSettings,
} from './percussionInstrument.js';
export {
  PERCUSSION_SAMPLE_FILES,
  PERCUSSION_BASE_URL,
  type PercussionSound,
} from './percussionSampleRegistry.js';
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
export { type InstrumentManifest, resolveInstrumentDefaults } from './instrumentManifest.js';
export {
  VIBRAPHONE_LAYERS,
  VIBRAPHONE_SAMPLER_BASE_URL,
  pickVibraphoneLayer,
  type VibraphoneVelocityLayer,
} from './vibraphoneSampleRegistry.js';
export { VibraphoneInstrument, type VibraphonePattern } from './vibraphoneInstrument.js';
export {
  ORGAN_LAYERS,
  ORGAN_SAMPLER_BASE_URL,
  pickOrganLayer,
  type OrganVelocityLayer,
} from './organSampleRegistry.js';
export { OrganInstrument, type OrganPattern } from './organInstrument.js';
export {
  CLARINET_LAYERS,
  CLARINET_SAMPLER_BASE_URL,
  pickClarinetLayer,
  type ClarinetVelocityLayer,
} from './clarinetSampleRegistry.js';
export { ClarinetInstrument, type ClarinetPattern } from './clarinetInstrument.js';
export {
  getKeyboardKeys,
  noteNameToMidi,
  type KeyLayout,
  type KeyboardLayoutOptions,
} from './keyboardLayout.js';
export {
  buildKeyMap,
  describeKeyMap,
  DEFAULT_WHITE_KEYS,
  DEFAULT_BLACK_KEYS,
  type ComputerKeyMap,
} from './computerKeyboardLayout.js';
export { bassManifest } from './bassManifest.js';
export { rhodesManifest } from './rhodesManifest.js';
export { pianoManifest } from './pianoManifest.js';
export { salamanderManifest } from './salamanderManifest.js';
export { drumsManifest } from './drumsManifest.js';
export { modernKitManifest } from './modernKitManifest.js';
export { guitarManifest } from './guitarManifest.js';
export { electricGuitarManifest } from './electricGuitarManifest.js';
export { vibraphoneManifest } from './vibraphoneManifest.js';
export { organManifest } from './organManifest.js';
export { clarinetManifest } from './clarinetManifest.js';
export { percussionManifest } from './percussionManifest.js';
export { GuitarInstrument, type GuitarMode, type GuitarVoicing } from './guitarInstrument.js';
export { PianoInstrument } from './pianoInstrument.js';
export {
  PianoRandomizer,
  type PianoRandomizationLevel,
  type PianoBarContext,
} from './pianoRandomizer.js';
export { buildPianoVoicing, type PianoVoicingDensity } from './pianoVoicing.js';
export { avoidConflicts } from './pianoRhodesInteraction.js';
export { testSoloInstrumentContract } from './soloInstrument.contract.js';

// -- Solo instrument manifests --
export { synthDefaultManifest } from './manifests/synthDefaultManifest.js';
export { pianoUprightSoloManifest } from './manifests/pianoUprightSoloManifest.js';
export { pianoSalamanderSoloManifest } from './manifests/pianoSalamanderSoloManifest.js';
export { rhodesJRhodes3cSoloManifest } from './manifests/rhodesJRhodes3cSoloManifest.js';
export { clarinetManifest as clarinetSoloManifest } from './manifests/clarinetManifest.js';
export { vibraphoneManifest as vibraphoneSoloManifest } from './manifests/vibraphoneManifest.js';
export { guitarNylonSoloManifest } from './manifests/guitarNylonSoloManifest.js';
export {
  getCompPattern as getPianoCompPattern,
  getCompingProfile,
  COMP_PATTERNS as PIANO_COMP_PATTERNS,
  COMPING_PROFILES as PIANO_COMPING_PROFILES,
  type CompPatternId,
  type CompingProfileId,
  type CompingProfile,
} from './pianoComping.js';
