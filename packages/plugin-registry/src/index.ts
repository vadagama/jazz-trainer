import type { PluginDefinition } from '@jazz/plugin-sdk';
import coreEditor from '@jazz/plugin-core-editor';
import corePlayer from '@jazz/plugin-core-player';
import catalog from '@jazz/plugin-catalog';
import adminCatalog from '@jazz/plugin-admin-catalog';
import adminUsers from '@jazz/plugin-admin-users';
import adminRoles from '@jazz/plugin-admin-roles';
import adminContent from '@jazz/plugin-admin-content';
import adminFlags from '@jazz/plugin-admin-flags';
import adminAssets from '@jazz/plugin-admin-assets';
import adminDiagnostics from '@jazz/plugin-admin-diagnostics';
import adminDrumConstructor from '@jazz/plugin-admin-drum-constructor';
import adminPercussionConstructor from '@jazz/plugin-admin-percussion-constructor';
import adminPianoConstructor from '@jazz/plugin-admin-piano-constructor';
import adminBassConstructor from '@jazz/plugin-admin-bass-constructor';
import adminRhodesConstructor from '@jazz/plugin-admin-rhodes-constructor';
import jazzDrumKit from '@jazz/plugin-jazz-drum-kit';
import funkDrumKit from '@jazz/plugin-funk-drum-kit';
import percussion from '@jazz/plugin-percussion';
import metronomePlugin from '@jazz/plugin-metronome';
import uprightPiano from '@jazz/plugin-upright-piano';
import bass from '@jazz/plugin-bass';
import rhodes from '@jazz/plugin-rhodes';
import theoryChordTones from '@jazz/plugin-theory-chord-tones';
import theoryApproachNotes from '@jazz/plugin-theory-approach-notes';
import theoryArpeggios from '@jazz/plugin-theory-arpeggios';
import theoryRhythm from '@jazz/plugin-theory-rhythm';
import theoryGroove from '@jazz/plugin-theory-groove';
import theoryBlues from '@jazz/plugin-theory-blues';
import theoryScales from '@jazz/plugin-theory-scales';
import theoryChords from '@jazz/plugin-theory-chords';
import theoryIntervals from '@jazz/plugin-theory-intervals';
import theoryIIVI from '@jazz/plugin-theory-ii-v-i';
import theoryScalesJazz from '@jazz/plugin-theory-scales-jazz';
import theoryVoicings from '@jazz/plugin-theory-voicings';
import theoryVoiceLeading from '@jazz/plugin-theory-voice-leading';
import theoryDiminishedHarmony from '@jazz/plugin-theory-diminished-harmony';
import theoryColtraneChanges from '@jazz/plugin-theory-coltrane-changes';
import theoryBluesAdvanced from '@jazz/plugin-theory-blues-advanced';
import theoryRhythmChanges from '@jazz/plugin-theory-rhythm-changes';
import theoryTurnarounds from '@jazz/plugin-theory-turnarounds';
import theoryTritoneSub from '@jazz/plugin-theory-tritone-sub';
import theoryModalInterchange from '@jazz/plugin-theory-modal-interchange';
import theorySecondaryDominants from '@jazz/plugin-theory-secondary-dominants';
import earTraining from '@jazz/plugin-ear-training';
import rhythmDrills from '@jazz/plugin-rhythm-drills';
import chordQuiz from '@jazz/plugin-chord-quiz';
import progressionRecognition from '@jazz/plugin-progression-recognition';
import practiceCards from '@jazz/plugin-practice-cards';
import visualMidiKeyboard from '@jazz/plugin-visual-midi-keyboard';
import theoryCatalog from '@jazz/plugin-theory-catalog';
import coreSettings from '@jazz/plugin-core-settings';

export const PLUGINS: PluginDefinition[] = [
  coreEditor,
  corePlayer,
  catalog,
  adminCatalog,
  adminUsers,
  adminRoles,
  adminContent,
  adminFlags,
  adminAssets,
  adminDiagnostics,
  adminDrumConstructor,
  adminPercussionConstructor,
  adminPianoConstructor,
  adminBassConstructor,
  adminRhodesConstructor,
  jazzDrumKit,
  funkDrumKit,
  percussion,
  metronomePlugin,
  uprightPiano,
  bass,
  rhodes,
  theoryChordTones,
  theoryApproachNotes,
  theoryArpeggios,
  theoryRhythm,
  theoryGroove,
  theoryBlues,
  theoryScales,
  theoryChords,
  theoryIntervals,
  theoryIIVI,
  theoryScalesJazz,
  theoryVoicings,
  theoryVoiceLeading,
  theoryDiminishedHarmony,
  theoryColtraneChanges,
  theoryBluesAdvanced,
  theoryRhythmChanges,
  theoryTurnarounds,
  theoryTritoneSub,
  theoryModalInterchange,
  theorySecondaryDominants,
  earTraining,
  rhythmDrills,
  chordQuiz,
  progressionRecognition,
  practiceCards,
  visualMidiKeyboard,
  theoryCatalog,
  coreSettings,
];
