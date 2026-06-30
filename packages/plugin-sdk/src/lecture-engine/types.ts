// packages/plugin-sdk/src/lecture-engine/types.ts
// Phase 1 — v1.0: Lecture Engine MVP types

// ── Метаданные лекции ────────────────────────────────────────────────

export interface LectureMeta {
  id: string; // 'theory.chord-tones'
  title: string; // 'Аккордовые звуки'
  topic: TopicId;
  level: 1 | 2 | 3 | 4 | 5;
  duration: number; // минут
  prerequisites: string[]; // ID лекций-пререквизитов
  bonusPoints: number; // баллы за полное прохождение
  tags: string[]; // ['начинающий', 'гармония']
}

export type TopicId =
  | 'chord-tones'
  | 'approach-notes'
  | 'arpeggios'
  | 'rhythm'
  | 'groove'
  | 'blues'
  | 'scales-jazz'
  | 'voicings'
  | 'voice-leading'
  | 'ii-v-i'
  | 'turnarounds'
  | 'tritone-sub'
  | 'modal-interchange'
  | 'secondary-dominants'
  | 'diminished-harmony'
  | 'coltrane-changes'
  | 'blues-advanced'
  | 'rhythm-changes';

// ── Блоки лекции ─────────────────────────────────────────────────────

export type LectureBlock =
  | TextBlock
  | ImageBlock
  | DiagramBlock
  | SheetMusicBlock
  | KeyboardBlock
  | ChordAudioBlock
  | AudioBlock
  | VideoBlock
  | MiniTrainerBlock
  | QuizBlock
  | DividerBlock
  | CalloutBlock;

export interface TextBlock {
  type: 'text';
  content: string; // Markdown
}

export interface ImageBlock {
  type: 'image';
  src: string;
  caption?: string;
}

export interface DiagramBlock {
  type: 'diagram';
  mermaid: string;
}

export interface SheetMusicBlock {
  type: 'sheet-music';
  notes: string; // MusicXML или ABC-подобный формат
  playback: PlaybackConfig;
}

export interface PlaybackConfig {
  tempo: number; // BPM
  loop?: boolean;
  highlightNotes?: boolean;
  instrument?: 'piano' | 'rhodes' | 'guitar';
}

export interface KeyboardBlock {
  type: 'keyboard';
  highlight: string[]; // Note[], e.g. ['C4', 'E4', 'G4', 'B4']
  label?: string;
}

export interface ChordAudioBlock {
  type: 'chord-audio';
  /** Note names to play, e.g. ['C4', 'E4', 'G4', 'B4']. */
  notes: string[];
  /** Human-readable label shown next to the play button. */
  label?: string;
  /** Duration of each note in seconds. Default: 1.0 */
  noteDuration?: number;
  /** Whether to play all notes simultaneously (block chord) or as arpeggio. Default: 'block'. */
  mode?: 'block' | 'arpeggio';
  /** Delay between arpeggio notes in seconds. Default: 0.15 */
  arpeggioDelay?: number;
  /** Show a virtual keyboard with animated key highlighting during playback. */
  showKeyboard?: boolean;
  /** Show a notation staff with animated note highlighting during playback. */
  showStaff?: boolean;
}

export interface AudioBlock {
  type: 'audio';
  src: string; // URL mp3/m4a
  waveform?: boolean;
}

export interface VideoBlock {
  type: 'video';
  src: string; // URL или YouTube ID
  poster?: string;
}

export interface MiniTrainerBlock {
  type: 'mini-trainer';
  exercise: MiniExercise;
}

export interface QuizBlock {
  type: 'quiz';
  quiz: ActiveQuiz;
}

export interface DividerBlock {
  type: 'divider';
}

export interface CalloutBlock {
  type: 'callout';
  kind: 'tip' | 'warning' | 'info';
  content: string; // Markdown
}

// ── Мини-тренажёры ───────────────────────────────────────────────────

export type MiniExercise =
  | PlayArpeggioExercise
  | PlayScaleExercise // v1.1
  | PlayChordExercise // v1.1
  | PlayProgressionExercise // v1.1
  | PlayRhythmExercise // v1.1
  | ImproviseExercise; // v1.2

export interface PlayArpeggioExercise {
  type: 'play-arpeggio';
  chords: string[];
  input: 'midi' | 'keyboard' | 'both';
  feedback: 'note-by-note' | 'end-of-phrase';
}

export interface PlayScaleExercise {
  type: 'play-scale';
  scale: string;
  octaves: 1 | 2;
  direction: 'ascending' | 'descending' | 'both';
  input: 'midi' | 'keyboard' | 'both';
}

export interface PlayChordExercise {
  type: 'play-chord';
  chords: string[];
  input: 'midi' | 'keyboard' | 'both';
}

export interface PlayProgressionExercise {
  type: 'play-progression';
  progression: string[];
  tempo: number;
  input: 'midi' | 'keyboard' | 'both';
}

export interface PlayRhythmExercise {
  type: 'play-rhythm';
  pattern: string;
  note: string;
  tempo: number;
  input: 'midi' | 'keyboard' | 'both';
}

export interface ImproviseExercise {
  type: 'improvise';
  progression: string[];
  allowedNotes: string[];
  bars: number;
  tempo: number;
  input: 'midi' | 'keyboard' | 'both';
}

// ── Активные проверки ─────────────────────────────────────────────────

export type ActiveQuiz =
  | PlayTheNoteQuiz
  | PlayTheChordQuiz // v1.1
  | CompleteThePhraseQuiz // v1.2
  | TranscribeQuiz; // v1.2

export interface PlayTheNoteQuiz {
  type: 'play-the-note';
  questions: PlayNoteQuestion[];
  input: 'midi' | 'keyboard' | 'both';
}

export interface PlayNoteQuestion {
  prompt: string; // 'Сыграй терцию аккорда Cmaj7'
  expectedNote: string; // 'E4'
}

export interface PlayTheChordQuiz {
  type: 'play-the-chord';
  questions: PlayChordQuestion[];
  input: 'midi' | 'keyboard' | 'both';
}

export interface PlayChordQuestion {
  prompt: string;
  expectedNotes: string[];
}

export interface CompleteThePhraseQuiz {
  type: 'complete-the-phrase';
  questions: CompletePhraseQuestion[];
  input: 'midi' | 'keyboard' | 'both';
}

export interface CompletePhraseQuestion {
  prompt: string;
  playback: PlaybackConfig;
  expectedNotes: string[];
}

export interface TranscribeQuiz {
  type: 'transcribe';
  questions: TranscribeQuestion[];
  input: 'midi' | 'keyboard' | 'both';
}

export interface TranscribeQuestion {
  prompt: string;
  playback: PlaybackConfig;
  expectedNotes: string[];
}

// ── Секция ────────────────────────────────────────────────────────────

export interface LectureSection {
  id: string; // 'context', 'theory', 'sound', 'practice', 'assessment', 'next'
  title: string; // '1. Контекст', '2. Теория', ...
  blocks: LectureBlock[];
}

// ── Полное определение лекции ─────────────────────────────────────────

export interface LectureDefinition {
  meta: LectureMeta;
  sections: LectureSection[];
}
