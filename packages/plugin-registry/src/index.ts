import type { PluginDefinition } from '@jazz/plugin-sdk';
import coreEditor from '@jazz/plugin-core-editor';
import corePlayer from '@jazz/plugin-core-player';
import catalog from '@jazz/plugin-catalog';
import adminUsers from '@jazz/plugin-admin-users';
import adminContent from '@jazz/plugin-admin-content';
import adminFlags from '@jazz/plugin-admin-flags';
import adminAssets from '@jazz/plugin-admin-assets';
import adminDiagnostics from '@jazz/plugin-admin-diagnostics';
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
  adminUsers,
  adminContent,
  adminFlags,
  adminAssets,
  adminDiagnostics,
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
