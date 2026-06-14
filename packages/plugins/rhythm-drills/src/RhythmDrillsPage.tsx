import { useState, useCallback, useRef, useEffect } from 'react';
import type { InputPort, MidiEvalScore } from '@jazz/music-core/audio';
import { evaluateRhythm, scoreRhythmEval } from '@jazz/music-core/audio';
import { useMidiInput } from './hooks/useMidiInput';

// ---------------------------------------------------------------------------
// Simple rhythm exercise: tap the displayed rhythm on a MIDI controller.
// ---------------------------------------------------------------------------

interface RhythmExercise {
  /** Label for the rhythm pattern. */
  label: string;
  /** Expected beat times in seconds (from exercise start). */
  beats: number[];
  /** Duration of the listening window in seconds. */
  windowSec: number;
}

const EXERCISES: RhythmExercise[] = [
  { label: 'Quarter notes (4/4)', beats: [0, 1, 2, 3], windowSec: 6 },
  { label: 'Half notes', beats: [0, 2], windowSec: 6 },
  { label: 'Off-beats', beats: [0.5, 1.5, 2.5, 3.5], windowSec: 6 },
  { label: 'Clave 3-2', beats: [0, 0.75, 1.5, 2, 2.5], windowSec: 6 },
];

export interface RhythmDrillsPageProps {
  inputPort?: InputPort | null;
}

export function RhythmDrillsPage({ inputPort }: RhythmDrillsPageProps) {
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'listening' | 'scored'>('ready');
  const [events, setEvents] = useState<import('@jazz/music-core/audio').MidiInputEvent[]>([]);
  const [score, setScore] = useState<MidiEvalScore | null>(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const exercise = EXERCISES[exerciseIdx % EXERCISES.length]!;

  // Start listening
  const handleStart = useCallback(() => {
    setEvents([]);
    setScore(null);
    setPhase('listening');
    startTimeRef.current = performance.now();

    // Auto-stop after window
    timerRef.current = setTimeout(() => {
      setPhase('scored');
    }, exercise.windowSec * 1000);
  }, [exercise.windowSec]);

  // Stop early
  const handleStop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase('scored');
  }, []);

  // Collect MIDI events
  const handleNoteOn = useCallback(
    (event: import('@jazz/music-core/audio').MidiInputEvent) => {
      if (phase !== 'listening') return;
      setEvents((prev) => [...prev, event]);
    },
    [phase],
  );

  useMidiInput(inputPort, handleNoteOn, phase === 'listening');

  // Score after phase changes to 'scored'
  useEffect(() => {
    if (phase !== 'scored' || events.length === 0) return;

    // Convert absolute timestamps to relative times
    const relativeEvents = events.map((e) => ({
      ...e,
      timestamp: (e.timestamp - startTimeRef.current) / 1000,
    }));

    const result = evaluateRhythm(relativeEvents, exercise.beats, 0.2);
    const s = scoreRhythmEval(result, 0.2);
    setScore(s);
  }, [phase, events, exercise.beats]);

  // Next exercise
  const handleNext = useCallback(() => {
    setExerciseIdx((i) => (i + 1) % EXERCISES.length);
    setPhase('ready');
    setEvents([]);
    setScore(null);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="mx-auto max-w-md space-y-8 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rhythm Drills</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap the rhythm on your MIDI controller</p>
      </div>

      {/* Exercise info */}
      <div className="rounded-md border border-border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">Exercise</p>
        <p className="text-lg font-semibold">{exercise.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {exercise.beats.length} beats in {exercise.windowSec}s window
        </p>
      </div>

      {/* Beat visualization */}
      <div className="flex items-center justify-center gap-2">
        {exercise.beats.map((beat, i) => (
          <div key={i} className="h-10 w-4 rounded-sm bg-primary/30" title={`Beat at ${beat}s`} />
        ))}
      </div>

      {/* Phase-based UI */}
      {phase === 'ready' && (
        <button
          onClick={handleStart}
          disabled={!inputPort}
          className="w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {inputPort ? '▶ Start' : '⚠️ No MIDI device connected'}
        </button>
      )}

      {phase === 'listening' && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="mb-2 h-3 w-full rounded-full bg-muted">
              <div
                className="h-3 rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.min(
                    ((performance.now() - startTimeRef.current) / (exercise.windowSec * 1000)) *
                      100,
                    100,
                  )}%`,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">Listening… ({events.length} taps)</p>
          </div>
          <button
            onClick={handleStop}
            className="w-full rounded-md border border-border px-4 py-3 font-medium hover:bg-muted"
          >
            ⏹ Stop &amp; Score
          </button>
        </div>
      )}

      {phase === 'scored' && score && (
        <div className="space-y-4 rounded-md border border-border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Result</p>
          <p className="text-3xl font-bold tabular-nums">{Math.round(score.score * 100)}%</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Accuracy: {Math.round(((score.details?.accuracy as number) ?? 0) * 100)}%</p>
            <p>
              Hits: {(score.details?.hits as number) ?? 0} / {(score.details?.total as number) ?? 0}
            </p>
          </div>
          <button
            onClick={handleNext}
            className="w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Next Exercise →
          </button>
        </div>
      )}
    </div>
  );
}

export default RhythmDrillsPage;
