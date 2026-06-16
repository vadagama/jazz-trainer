import type { PluginDefinition } from '@jazz/plugin-sdk';
import coreEditor from '@jazz/plugin-core-editor';
import corePlayer from '@jazz/plugin-core-player';
import catalog from '@jazz/plugin-catalog';
import adminUsers from '@jazz/plugin-admin-users';
import adminContent from '@jazz/plugin-admin-content';
import adminFlags from '@jazz/plugin-admin-flags';
import adminAssets from '@jazz/plugin-admin-assets';
import adminDiagnostics from '@jazz/plugin-admin-diagnostics';
import theoryScales from '@jazz/plugin-theory-scales';
import theoryChords from '@jazz/plugin-theory-chords';
import theoryIntervals from '@jazz/plugin-theory-intervals';
import earTraining from '@jazz/plugin-ear-training';
import rhythmDrills from '@jazz/plugin-rhythm-drills';
import chordQuiz from '@jazz/plugin-chord-quiz';
import progressionRecognition from '@jazz/plugin-progression-recognition';
import practiceCards from '@jazz/plugin-practice-cards';

export const PLUGINS: PluginDefinition[] = [
  coreEditor,
  corePlayer,
  catalog,
  adminUsers,
  adminContent,
  adminFlags,
  adminAssets,
  adminDiagnostics,
  theoryScales,
  theoryChords,
  theoryIntervals,
  earTraining,
  rhythmDrills,
  chordQuiz,
  progressionRecognition,
  practiceCards,
];
