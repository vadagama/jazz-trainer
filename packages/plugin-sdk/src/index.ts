export { manifestSchema, validateManifest } from './manifest.schema';

export { apiClient, ApiError } from './apiClient';

export { usePlaybackStore } from './stores/usePlaybackStore';
export { useEditorStore } from './stores/useEditorStore';
export { useLocalSettingsStore } from './stores/useLocalSettingsStore';

export { useAuth, useLogout } from './queries/useAuth';
export { useSettings, useUpdateSettings } from './queries/useSettings';
export { useEffectiveSettings } from './queries/useEffectiveSettings';

export type { UseTransportOptions, TransportControls } from './transport';
export {
  PluginProvider,
  usePluginTransport,
  usePluginDrumPreview,
  usePluginPercussionPreview,
  useInstruments,
} from './host-context';
export type { UseTransportFn } from './host-context';
export type {
  DrumPreviewControls,
  DrumPreviewKit,
  DrumPreviewPlayOptions,
  UseDrumPreviewFn,
} from './drumPreview';
export type {
  PercussionPreviewControls,
  PercussionPreviewPlayOptions,
  UsePercussionPreviewFn,
} from './percussionPreview';
export type { PluginManifest, PluginManifestInput } from './manifest.schema';
export { instrumentManifestSchema, validateInstrumentManifest } from './instrumentManifest.schema';

export type {
  RouteContribution,
  NavItemContribution,
  CommandContribution,
  ActivityContribution,
  InstrumentContribution,
  PluginContributions,
} from './extension-points';

export type {
  AudioService,
  StorageService,
  SettingsService,
  NavigationService,
  EventBus,
  PluginContext,
  InstrumentRegistryService,
  InstrumentInfo,
} from './context';

export type { ActivityType, ActivityState, ActivityResult, ActivityDefinition } from './activity';

export { definePlugin } from './definePlugin';
export type { PluginDefinition } from './definePlugin';

export { usePermission } from './hooks/usePermission';
export { useFlag } from './hooks/useFlag';
export { useStyleSettings } from './hooks/useStyleSettings';
export type { UseStyleSettingsReturn } from './hooks/useStyleSettings';

export type {
  LectureMeta,
  TopicId,
  LectureBlock,
  TextBlock,
  ImageBlock,
  DiagramBlock,
  SheetMusicBlock,
  PlaybackConfig,
  KeyboardBlock,
  ChordAudioBlock,
  AudioBlock,
  VideoBlock,
  MiniTrainerBlock,
  QuizBlock,
  DividerBlock,
  CalloutBlock,
  MiniExercise,
  PlayArpeggioExercise,
  PlayScaleExercise,
  PlayChordExercise,
  PlayProgressionExercise,
  PlayRhythmExercise,
  ImproviseExercise,
  ActiveQuiz,
  PlayTheNoteQuiz,
  PlayNoteQuestion,
  PlayTheChordQuiz,
  PlayChordQuestion,
  CompleteThePhraseQuiz,
  CompletePhraseQuestion,
  TranscribeQuiz,
  TranscribeQuestion,
  LectureSection,
  LectureDefinition,
} from './lecture-engine/types';
export {
  useMidiVisualizer,
  type KeyState,
  type KeyboardMode,
  type RecentNote,
  type UseMidiVisualizerOptions,
  type UseMidiVisualizerResult,
} from './hooks/useMidiVisualizer';
export { useMidiConnection, type UseMidiConnectionResult } from './hooks/useMidiConnection';
export { useComputerKeyboardStore } from './stores/useComputerKeyboardStore';
