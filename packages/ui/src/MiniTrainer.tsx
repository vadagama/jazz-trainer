import { type ReactNode, useState, useCallback, useMemo } from 'react';
import type {
  MiniExercise,
  PlayArpeggioExercise,
  PlayScaleExercise,
  PlayChordExercise,
  PlayProgressionExercise,
  PlayRhythmExercise,
} from '@jazz/plugin-sdk';
import { parseChord, noteNameToMidi } from '@jazz/music-core';
import { SCALE_TYPES, SCALE_INTERVALS, type ScaleType } from '@jazz/music-core';
import { VirtualKeyboard } from './VirtualKeyboard';
import { Button } from './button';
import { Badge } from './badge';

// ---------------------------------------------------------------------------
// MiniTrainer — mini exercise embedded in a lecture
// v1.1: play-arpeggio, play-scale, play-chord, play-progression, play-rhythm
// ---------------------------------------------------------------------------

export interface MiniTrainerProps {
  exercise: MiniExercise;
}

// ── Chord-to-notes helpers ───────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dominant: [0, 4, 7, 10],
  diminished: [0, 3, 6],
  halfDiminished: [0, 3, 6, 10],
  augmented: [0, 4, 8],
  suspended: [0, 5, 7],
  power: [0, 7],
};

function chordToNotes(chordName: string): string[] {
  const result = parseChord(chordName);
  if (!result.ok || !result.value) return [chordName];

  const { root, rootAccidental, quality, extensions } = result.value;
  const rootName = rootAccidental ? `${root}${rootAccidental}` : root;

  let intervals = CHORD_INTERVALS[quality];
  if (!intervals) intervals = [0, 4, 7];

  if (extensions.includes('7') && quality === 'major') {
    intervals = [0, 4, 7, 11];
  } else if (extensions.includes('7') && quality === 'minor') {
    intervals = [0, 3, 7, 10];
  }

  const rootMidi = noteNameToMidi(`${rootName}3`);
  return intervals.map((i) => {
    const midi = (rootMidi + i) % 12;
    return NOTE_NAMES[midi]!;
  });
}

function chordToMidiNotes(chordName: string, octave = 4): number[] {
  const result = parseChord(chordName);
  if (!result.ok || !result.value) return [];

  const { root, rootAccidental, quality, extensions } = result.value;
  const rootName = rootAccidental ? `${root}${rootAccidental}` : root;
  const rootMidi = noteNameToMidi(`${rootName}${octave}`);

  let intervals = CHORD_INTERVALS[quality];
  if (!intervals) intervals = [0, 4, 7];

  if (extensions.includes('7') && quality === 'major') {
    intervals = [0, 4, 7, 11];
  } else if (extensions.includes('7') && quality === 'minor') {
    intervals = [0, 3, 7, 10];
  }

  return intervals.map((i) => rootMidi + i);
}

// ── Scale helpers ─────────────────────────────────────────────────────────

function parseScaleSpec(scale: string): { root: string; type: ScaleType } | null {
  const parts = scale.split(/\s+/);
  if (parts.length < 2) return null;
  const root = parts[0]!;
  const typeName = parts.slice(1).join('-').toLowerCase();
  const scaleType = SCALE_TYPES.find((t) => t === typeName);
  if (!scaleType) return null;
  return { root, type: scaleType };
}

function scaleToMidiNotes(root: string, type: ScaleType, octaves: 1 | 2): number[] {
  const intervals = SCALE_INTERVALS[type];
  const rootMidi = noteNameToMidi(`${root}4`);
  const notes: number[] = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of intervals) {
      notes.push(rootMidi + oct * 12 + interval);
    }
  }
  // Add the octave note at the end
  notes.push(rootMidi + octaves * 12);
  return notes;
}

// ── Shared feedback ──────────────────────────────────────────────────────

function FeedbackBanner({
  result,
  expected,
}: {
  result: 'correct' | 'incorrect' | null;
  expected?: string;
}) {
  if (!result) return null;
  return (
    <div
      className={`text-center py-2 rounded ${
        result === 'correct'
          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
      }`}
    >
      {result === 'correct'
        ? '✓ Правильно!'
        : expected
          ? `✗ Ожидалось: ${expected}`
          : '✗ Неправильно'}
    </div>
  );
}

function DoneScreen({
  score,
  total,
  onReset,
}: {
  score: number;
  total: number;
  onReset: () => void;
}) {
  return (
    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
      <p className="text-lg font-semibold text-green-700 dark:text-green-300">
        🎉 Упражнение завершено!
      </p>
      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
        Результат: {score} / {total}
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onReset}>
        Повторить
      </Button>
    </div>
  );
}

// ── Play Arpeggio ───────────────────────────────────────────────────────

function PlayArpeggioTrainer({ exercise }: { exercise: PlayArpeggioExercise }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'waiting' | 'feedback' | 'done'>('waiting');
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);

  const currentChord = exercise.chords[currentIdx] ?? '';
  const currentChordNotes = useMemo(() => chordToNotes(currentChord), [currentChord]);
  const currentExpected = currentChordNotes[noteIndex] ?? '';

  const handleKeyClick = useCallback(
    (midiNote: number) => {
      if (phase === 'feedback' || phase === 'done') return;
      const playedNote = NOTE_NAMES[midiNote % 12];
      if (!playedNote || !currentExpected) return;

      const isCorrect = playedNote === currentExpected;
      setLastResult(isCorrect ? 'correct' : 'incorrect');
      if (isCorrect) setScore((s) => s + 1);
      setTotal((t) => t + 1);
      setPhase('feedback');

      const delay = exercise.feedback === 'end-of-phrase' ? 1500 : 800;
      setTimeout(() => {
        const notesLen = currentChordNotes.length;
        const nextNoteIdx = noteIndex + 1;
        if (nextNoteIdx >= notesLen) {
          const nextChordIdx = currentIdx + 1;
          if (nextChordIdx >= exercise.chords.length) {
            setPhase('done');
          } else {
            setCurrentIdx(nextChordIdx);
            setNoteIndex(0);
            setPhase('waiting');
            setLastResult(null);
          }
        } else {
          setNoteIndex(nextNoteIdx);
          setPhase('waiting');
          setLastResult(null);
        }
      }, delay);
    },
    [phase, currentIdx, noteIndex, currentExpected, currentChordNotes.length, exercise],
  );

  const reset = useCallback(() => {
    setCurrentIdx(0);
    setNoteIndex(0);
    setPhase('waiting');
    setLastResult(null);
    setScore(0);
    setTotal(0);
  }, []);

  if (phase === 'done') return <DoneScreen score={score} total={total} onReset={reset} />;

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Мини-тренажёр</Badge>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Аккорд {currentIdx + 1}/{exercise.chords.length}
        </span>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{currentChord}</p>
        <p className="text-sm text-gray-500 mt-1">
          Сыграйте арпеджио: {currentChordNotes.join(' → ')}
        </p>
      </div>
      <FeedbackBanner result={lastResult} expected={currentExpected} />
      <VirtualKeyboard
        mode="chord-highlight"
        chordNotes={chordToMidiNotes(currentChord)}
        compact
        onKeyClick={handleKeyClick}
      />
      <div className="flex justify-between text-sm text-gray-500">
        <span>
          Нота {noteIndex + 1}/{currentChordNotes.length}
        </span>
        <span>
          Счёт: {score}/{total}
        </span>
      </div>
    </div>
  );
}

// ── Play Scale ──────────────────────────────────────────────────────────

function PlayScaleTrainer({ exercise }: { exercise: PlayScaleExercise }) {
  const spec = useMemo(() => parseScaleSpec(exercise.scale), [exercise.scale]);
  const midiNotes = useMemo(
    () => (spec ? scaleToMidiNotes(spec.root, spec.type, exercise.octaves) : []),
    [spec, exercise.octaves],
  );

  const [noteIndex, setNoteIndex] = useState(0);
  const [phase, setPhase] = useState<'waiting' | 'feedback' | 'done'>('waiting');
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);

  const currentExpected = midiNotes[noteIndex];
  const expectedName = currentExpected !== undefined ? NOTE_NAMES[currentExpected % 12] : '';

  const handleKeyClick = useCallback(
    (midiNote: number) => {
      if (phase === 'feedback' || phase === 'done' || currentExpected === undefined) return;
      const isCorrect = midiNote % 12 === currentExpected % 12;
      setLastResult(isCorrect ? 'correct' : 'incorrect');
      if (isCorrect) setScore((s) => s + 1);
      setPhase('feedback');

      setTimeout(() => {
        const nextIdx = noteIndex + 1;
        if (nextIdx >= midiNotes.length) {
          setPhase('done');
        } else {
          setNoteIndex(nextIdx);
          setPhase('waiting');
          setLastResult(null);
        }
      }, 800);
    },
    [phase, noteIndex, currentExpected, midiNotes.length],
  );

  const reset = useCallback(() => {
    setNoteIndex(0);
    setPhase('waiting');
    setLastResult(null);
    setScore(0);
  }, []);

  if (!spec) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-red-600 text-sm">
        Unknown scale: {exercise.scale}
      </div>
    );
  }

  if (phase === 'done')
    return <DoneScreen score={score} total={midiNotes.length} onReset={reset} />;

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Мини-тренажёр</Badge>
        <span className="text-sm text-gray-600 dark:text-gray-400">Гамма</span>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{exercise.scale}</p>
        <p className="text-sm text-gray-500 mt-1">
          {exercise.direction === 'ascending'
            ? 'Восходящая'
            : exercise.direction === 'descending'
              ? 'Нисходящая'
              : 'Восходящая и нисходящая'}{' '}
          · {exercise.octaves} {exercise.octaves === 1 ? 'октава' : 'октавы'}
        </p>
      </div>
      <FeedbackBanner result={lastResult} expected={expectedName} />
      <VirtualKeyboard
        mode="scale-highlight"
        scaleNotes={midiNotes}
        compact
        onKeyClick={handleKeyClick}
      />
      <div className="flex justify-between text-sm text-gray-500">
        <span>
          Нота {noteIndex + 1}/{midiNotes.length}
        </span>
        <span>Счёт: {score}</span>
      </div>
    </div>
  );
}

// ── Play Chord ──────────────────────────────────────────────────────────

function PlayChordTrainer({ exercise }: { exercise: PlayChordExercise }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<'waiting' | 'feedback' | 'done'>('waiting');
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const currentChord = exercise.chords[currentIdx] ?? '';
  const expectedMidis = useMemo(() => {
    if (!currentChord) return [];
    return [...new Set(chordToMidiNotes(currentChord).map((m) => m % 12))].sort((a, b) => a - b);
  }, [currentChord]);

  const toggleNote = useCallback(
    (midiNote: number) => {
      if (phase === 'feedback' || phase === 'done') return;
      setSelectedNotes((prev) => {
        const next = new Set(prev);
        const note = midiNote % 12;
        if (next.has(note)) next.delete(note);
        else next.add(note);
        return next;
      });
    },
    [phase],
  );

  const handleSubmit = useCallback(() => {
    if (phase === 'feedback' || phase === 'done' || expectedMidis.length === 0) return;
    setTotal((t) => t + 1);

    const selected = [...selectedNotes].sort((a, b) => a - b);
    const isCorrect =
      selected.length === expectedMidis.length && selected.every((n, i) => n === expectedMidis[i]);

    setLastResult(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) setScore((s) => s + 1);
    setPhase('feedback');

    setTimeout(() => {
      const nextIdx = currentIdx + 1;
      if (nextIdx >= exercise.chords.length) {
        setPhase('done');
      } else {
        setCurrentIdx(nextIdx);
        setSelectedNotes(new Set());
        setPhase('waiting');
        setLastResult(null);
      }
    }, 1500);
  }, [phase, currentIdx, selectedNotes, expectedMidis, exercise.chords.length]);

  const reset = useCallback(() => {
    setCurrentIdx(0);
    setSelectedNotes(new Set());
    setPhase('waiting');
    setLastResult(null);
    setScore(0);
    setTotal(0);
  }, []);

  const expectedNames = expectedMidis.map((m) => NOTE_NAMES[m]!).join(' ');

  if (phase === 'done') return <DoneScreen score={score} total={total} onReset={reset} />;

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Мини-тренажёр</Badge>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Аккорд {currentIdx + 1}/{exercise.chords.length}
        </span>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{currentChord}</p>
        <p className="text-sm text-gray-500 mt-1">Выберите ноты аккорда: {expectedNames}</p>
      </div>
      <FeedbackBanner
        result={lastResult}
        expected={lastResult === 'incorrect' ? expectedNames : undefined}
      />
      <VirtualKeyboard
        mode="chord-highlight"
        chordNotes={expectedMidis.map((m) => m + 48)}
        compact
        onKeyClick={toggleNote}
      />
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Выбрано: {selectedNotes.size} / {expectedMidis.length}
        </span>
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={selectedNotes.size === 0 || phase === 'feedback'}
        >
          Проверить
        </Button>
      </div>
    </div>
  );
}

// ── Play Progression ────────────────────────────────────────────────────

function PlayProgressionTrainer({ exercise }: { exercise: PlayProgressionExercise }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<'waiting' | 'feedback' | 'done'>('waiting');
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const currentChord = exercise.progression[currentIdx] ?? '';
  const expectedMidis = useMemo(() => {
    if (!currentChord) return [];
    return [...new Set(chordToMidiNotes(currentChord).map((m) => m % 12))].sort((a, b) => a - b);
  }, [currentChord]);

  const toggleNote = useCallback(
    (midiNote: number) => {
      if (phase === 'feedback' || phase === 'done') return;
      setSelectedNotes((prev) => {
        const next = new Set(prev);
        const note = midiNote % 12;
        if (next.has(note)) next.delete(note);
        else next.add(note);
        return next;
      });
    },
    [phase],
  );

  const handleSubmit = useCallback(() => {
    if (phase === 'feedback' || phase === 'done' || expectedMidis.length === 0) return;
    setTotal((t) => t + 1);

    const selected = [...selectedNotes].sort((a, b) => a - b);
    const isCorrect =
      selected.length === expectedMidis.length && selected.every((n, i) => n === expectedMidis[i]);

    setLastResult(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) setScore((s) => s + 1);
    setPhase('feedback');

    setTimeout(() => {
      const nextIdx = currentIdx + 1;
      if (nextIdx >= exercise.progression.length) {
        setPhase('done');
      } else {
        setCurrentIdx(nextIdx);
        setSelectedNotes(new Set());
        setPhase('waiting');
        setLastResult(null);
      }
    }, 1500);
  }, [phase, currentIdx, selectedNotes, expectedMidis, exercise.progression.length]);

  const reset = useCallback(() => {
    setCurrentIdx(0);
    setSelectedNotes(new Set());
    setPhase('waiting');
    setLastResult(null);
    setScore(0);
    setTotal(0);
  }, []);

  const expectedNames = expectedMidis.map((m) => NOTE_NAMES[m]!).join(' ');

  if (phase === 'done') return <DoneScreen score={score} total={total} onReset={reset} />;

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Мини-тренажёр</Badge>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Аккорд {currentIdx + 1}/{exercise.progression.length} · ♩ = {exercise.tempo}
        </span>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{currentChord}</p>
        <p className="text-sm text-gray-500 mt-1">Прогрессия: {exercise.progression.join(' → ')}</p>
        <p className="text-sm text-gray-500">Выберите ноты: {expectedNames}</p>
      </div>
      <FeedbackBanner
        result={lastResult}
        expected={lastResult === 'incorrect' ? expectedNames : undefined}
      />
      <VirtualKeyboard
        mode="chord-highlight"
        chordNotes={expectedMidis.map((m) => m + 48)}
        compact
        onKeyClick={toggleNote}
      />
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Выбрано: {selectedNotes.size} / {expectedMidis.length}
        </span>
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={selectedNotes.size === 0 || phase === 'feedback'}
        >
          Проверить
        </Button>
      </div>
    </div>
  );
}

// ── Play Rhythm ─────────────────────────────────────────────────────────

function PlayRhythmTrainer({ exercise }: { exercise: PlayRhythmExercise }) {
  const noteName = exercise.note.replace(/\d+$/, '');
  const [clicks, setClicks] = useState<number[]>([]);
  const [phase, setPhase] = useState<'waiting' | 'done'>('waiting');
  const [_startTime] = useState(() => Date.now());

  const handleKeyClick = useCallback(
    (_midiNote: number) => {
      if (phase === 'done') return;
      setClicks((prev) => [...prev, Date.now()]);
    },
    [phase],
  );

  const handleDone = useCallback(() => {
    setPhase('done');
  }, []);

  const reset = useCallback(() => {
    setClicks([]);
    setPhase('waiting');
  }, []);

  const intervals = clicks.length > 1 ? clicks.slice(1).map((t, i) => t - clicks[i]!) : [];

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Мини-тренажёр</Badge>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Ритм · ♩ = {exercise.tempo}
        </span>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{exercise.pattern}</p>
        <p className="text-sm text-gray-500 mt-1">Отстучите ритм на ноте {noteName}</p>
      </div>
      <VirtualKeyboard
        mode="chord-highlight"
        chordNotes={noteName ? [noteNameToMidi(`${noteName}4`)] : []}
        compact
        onKeyClick={handleKeyClick}
      />
      <div className="text-center text-sm text-gray-500">
        Нажатий: {clicks.length}
        {intervals.length > 0 && (
          <span className="ml-2">| Интервалы: {intervals.map((ms) => `${ms}ms`).join(', ')}</span>
        )}
      </div>
      <div className="flex justify-center gap-2">
        {phase === 'waiting' ? (
          <Button variant="default" size="sm" onClick={handleDone} disabled={clicks.length === 0}>
            Завершить
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={reset}>
            Повторить
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main MiniTrainer (dispatcher) ───────────────────────────────────────

export function MiniTrainer({ exercise }: MiniTrainerProps): ReactNode {
  switch (exercise.type) {
    case 'play-arpeggio':
      return <PlayArpeggioTrainer exercise={exercise} />;
    case 'play-scale':
      return <PlayScaleTrainer exercise={exercise} />;
    case 'play-chord':
      return <PlayChordTrainer exercise={exercise} />;
    case 'play-progression':
      return <PlayProgressionTrainer exercise={exercise} />;
    case 'play-rhythm':
      return <PlayRhythmTrainer exercise={exercise} />;
    case 'improvise':
      return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-gray-500 text-sm">
          [improvise] — доступно в v1.2
        </div>
      );
    default:
      return null;
  }
}
