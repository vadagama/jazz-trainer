import { type ReactNode, useState, useCallback, useMemo } from 'react';
import type {
  ActiveQuiz,
  PlayTheNoteQuiz,
  PlayNoteQuestion,
  PlayTheChordQuiz,
  PlayChordQuestion,
} from '@jazz/plugin-sdk';
import { noteNameToMidi } from '@jazz/music-core';
import { VirtualKeyboard } from './VirtualKeyboard';
import { Button } from './button';
import { Badge } from './badge';

// ---------------------------------------------------------------------------
// ActiveQuiz — active quiz embedded in a lecture
// v1.1: play-the-note, play-the-chord
// ---------------------------------------------------------------------------

export interface ActiveQuizProps {
  quiz: ActiveQuiz;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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
        🎉 Проверка завершена!
      </p>
      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
        Результат: {score} / {total}
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onReset}>
        Попробовать снова
      </Button>
    </div>
  );
}

// ── Play The Note ───────────────────────────────────────────────────────

function PlayTheNoteQuizComponent({ quiz }: { quiz: PlayTheNoteQuiz }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'waiting' | 'feedback' | 'done'>('waiting');
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);

  const questions = quiz.questions;
  const currentQuestion: PlayNoteQuestion | undefined = questions[currentIdx];
  const expectedNote = currentQuestion?.expectedNote ?? '';
  const expectedMidi = expectedNote ? noteNameToMidi(expectedNote) : -1;
  const expectedName = expectedMidi >= 0 ? NOTE_NAMES[expectedMidi % 12] : '';

  const handleKeyClick = useCallback(
    (midiNote: number) => {
      if (phase === 'feedback' || phase === 'done' || !currentQuestion) return;

      const playedNote = NOTE_NAMES[midiNote % 12];
      const isCorrect = playedNote === expectedName;
      setLastResult(isCorrect ? 'correct' : 'incorrect');
      if (isCorrect) setScore((s) => s + 1);
      setPhase('feedback');

      setTimeout(() => {
        const nextIdx = currentIdx + 1;
        if (nextIdx >= questions.length) {
          setPhase('done');
        } else {
          setCurrentIdx(nextIdx);
          setPhase('waiting');
          setLastResult(null);
        }
      }, 1500);
    },
    [phase, currentIdx, currentQuestion, expectedName, questions.length],
  );

  const reset = useCallback(() => {
    setCurrentIdx(0);
    setPhase('waiting');
    setLastResult(null);
    setScore(0);
  }, []);

  if (phase === 'done')
    return <DoneScreen score={score} total={questions.length} onReset={reset} />;

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <Badge>Проверка</Badge>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Вопрос {currentIdx + 1}/{questions.length}
        </span>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {currentQuestion?.prompt ?? ''}
        </p>
        <p className="text-sm text-gray-500 mt-1">Сыграйте ноту на клавиатуре</p>
      </div>
      <FeedbackBanner
        result={lastResult}
        expected={lastResult === 'incorrect' ? expectedNote : undefined}
      />
      <VirtualKeyboard
        mode="chord-highlight"
        chordNotes={expectedMidi >= 0 ? [expectedMidi] : []}
        compact
        onKeyClick={handleKeyClick}
      />
      <div className="text-right text-sm text-gray-500">
        Счёт: {score}/{currentIdx + (phase === 'feedback' ? 1 : 0)}
      </div>
    </div>
  );
}

// ── Play The Chord ──────────────────────────────────────────────────────

function PlayTheChordQuizComponent({ quiz }: { quiz: PlayTheChordQuiz }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<'waiting' | 'feedback' | 'done'>('waiting');
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);

  const questions = quiz.questions;
  const currentQuestion: PlayChordQuestion | undefined = questions[currentIdx];

  const expectedMidis = useMemo(() => {
    if (!currentQuestion) return [];
    return currentQuestion.expectedNotes
      .map((n) => {
        try {
          return noteNameToMidi(n) % 12;
        } catch {
          return -1;
        }
      })
      .filter((n) => n >= 0)
      .sort((a, b) => a - b);
  }, [currentQuestion]);

  const expectedNames = expectedMidis.map((m) => NOTE_NAMES[m]!).join(' ');

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

    const selected = [...selectedNotes].sort((a, b) => a - b);
    const isCorrect =
      selected.length === expectedMidis.length && selected.every((n, i) => n === expectedMidis[i]);

    setLastResult(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) setScore((s) => s + 1);
    setPhase('feedback');

    setTimeout(() => {
      const nextIdx = currentIdx + 1;
      if (nextIdx >= questions.length) {
        setPhase('done');
      } else {
        setCurrentIdx(nextIdx);
        setSelectedNotes(new Set());
        setPhase('waiting');
        setLastResult(null);
      }
    }, 1500);
  }, [phase, currentIdx, selectedNotes, expectedMidis, questions.length]);

  const reset = useCallback(() => {
    setCurrentIdx(0);
    setSelectedNotes(new Set());
    setPhase('waiting');
    setLastResult(null);
    setScore(0);
  }, []);

  if (phase === 'done')
    return <DoneScreen score={score} total={questions.length} onReset={reset} />;

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <Badge>Проверка</Badge>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Вопрос {currentIdx + 1}/{questions.length}
        </span>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {currentQuestion?.prompt ?? ''}
        </p>
        <p className="text-sm text-gray-500 mt-1">Выберите все ноты аккорда на клавиатуре</p>
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

// ── Main ActiveQuiz (dispatcher) ────────────────────────────────────────

export function ActiveQuiz({ quiz }: ActiveQuizProps): ReactNode {
  switch (quiz.type) {
    case 'play-the-note':
      return <PlayTheNoteQuizComponent quiz={quiz} />;
    case 'play-the-chord':
      return <PlayTheChordQuizComponent quiz={quiz} />;
    case 'complete-the-phrase':
    case 'transcribe':
      return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-gray-500 text-sm">
          [{quiz.type}] — доступно в v1.2
        </div>
      );
    default:
      return null;
  }
}
