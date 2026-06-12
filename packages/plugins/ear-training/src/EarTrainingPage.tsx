import { useState, useCallback, useRef } from 'react';
import type { InputPort, ScheduledNote } from '@jazz/music-core/audio';
import { evaluateNote } from '@jazz/music-core/audio';
import { useMidiInput } from './hooks/useMidiInput';

// ---------------------------------------------------------------------------
// Simple interval exercise: play the displayed note on a MIDI keyboard.
// ---------------------------------------------------------------------------

const EXERCISE_NOTES: ScheduledNote[] = [
  { time: 0, note: 'C4', duration: 1, velocity: 0.8 },
  { time: 0, note: 'D4', duration: 1, velocity: 0.8 },
  { time: 0, note: 'E4', duration: 1, velocity: 0.8 },
  { time: 0, note: 'F4', duration: 1, velocity: 0.8 },
  { time: 0, note: 'G4', duration: 1, velocity: 0.8 },
  { time: 0, note: 'A4', duration: 1, velocity: 0.8 },
  { time: 0, note: 'B4', duration: 1, velocity: 0.8 },
  { time: 0, note: 'C5', duration: 1, velocity: 0.8 },
];

export interface EarTrainingPageProps {
  /** MIDI input port (provided by host). */
  inputPort?: InputPort | null;
}

export function EarTrainingPage({ inputPort }: EarTrainingPageProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const target = EXERCISE_NOTES[currentIdx % EXERCISE_NOTES.length]!;

  const handleNoteOn = useCallback(
    (event: import('@jazz/music-core/audio').MidiInputEvent) => {
      const result = evaluateNote(event, target, { timingTolerance: 5 }); // generous tolerance

      setAttempts((a) => a + 1);

      if (result.hit) {
        setFeedback('correct');
        setScore((s) => s + 1);

        // Move to next note after short delay
        feedbackTimer.current = setTimeout(() => {
          setFeedback('idle');
          setCurrentIdx((i) => (i + 1) % EXERCISE_NOTES.length);
        }, 800);
      } else {
        setFeedback('wrong');
        feedbackTimer.current = setTimeout(() => {
          setFeedback('idle');
        }, 600);
      }
    },
    [target],
  );

  useMidiInput(inputPort, handleNoteOn);

  return (
    <div className="mx-auto max-w-md space-y-8 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ear Training</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Play the note shown below on your MIDI keyboard
        </p>
      </div>

      {/* Target note display */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-border bg-card">
          <span className="text-5xl font-bold tabular-nums">{target.note}</span>
        </div>

        {/* Feedback indicator */}
        <div
          className={`h-4 w-4 rounded-full transition-colors ${
            feedback === 'correct'
              ? 'bg-green-500'
              : feedback === 'wrong'
                ? 'bg-red-500'
                : 'bg-muted'
          }`}
        />
      </div>

      {/* Score */}
      <div className="text-center text-sm text-muted-foreground">
        Score: {score} / {attempts || 1}
        {attempts > 0 && <> ({Math.round((score / attempts) * 100)}%)</>}
      </div>

      {/* MIDI status */}
      <div className="rounded-md border border-border bg-card p-4 text-center text-xs text-muted-foreground">
        {inputPort
          ? '🎹 MIDI input active — play your keyboard'
          : '⚠️ MIDI input not available — connect a MIDI device'}
      </div>
    </div>
  );
}

export default EarTrainingPage;
