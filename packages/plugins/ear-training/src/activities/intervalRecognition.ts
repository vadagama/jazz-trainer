import type { MidiInputEvent, ScheduledNote, MidiEvalOptions } from '@jazz/music-core/audio';
import { evaluateNote, evaluateNoteSequence } from '@jazz/music-core/audio';
import type { ActivityDefinition, ActivityState } from '@jazz/plugin-sdk';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface IntervalRecognitionState {
  target: ScheduledNote;
  reference?: ScheduledNote;
  events: MidiInputEvent[];
  listening: boolean;
  startTime: number;
  maxAttempts: number;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface IntervalRecognitionOptions {
  target: ScheduledNote;
  reference?: ScheduledNote;
  maxAttempts?: number;
  evalOptions?: MidiEvalOptions;
}

/**
 * Create an {@link ActivityDefinition} for interval recognition with MIDI input.
 *
 * The player must play the target note on a MIDI keyboard. Each note-on
 * event is evaluated against the target for pitch and timing correctness.
 */
export function createIntervalRecognitionActivity(
  opts: IntervalRecognitionOptions,
): ActivityDefinition<IntervalRecognitionState> {
  const evalOptions = opts.evalOptions ?? {};

  return {
    id: `interval-recognition-${opts.target.note}`,
    type: 'exercise',

    start: (_ctx: unknown): ActivityState<IntervalRecognitionState> => ({
      status: 'active',
      data: {
        target: opts.target,
        reference: opts.reference,
        events: [],
        listening: true,
        startTime: performance.now(),
        maxAttempts: opts.maxAttempts ?? 3,
      },
    }),

    evaluate: (state, answer) => {
      const event = answer as MidiInputEvent | undefined;
      if (!event || typeof event.note !== 'string') {
        return { score: 0, maxScore: 1 };
      }

      const { data } = state;
      if (state.status !== 'active') {
        return { score: 0, maxScore: 1 };
      }

      const evaluation = evaluateNote(event, data.target, evalOptions);
      data.events.push(event);

      // Full evaluation when max attempts reached
      if (data.events.length >= data.maxAttempts) {
        data.listening = false;
        const score = evaluateNoteSequence(
          data.events.map((e) => evaluateNote(e, data.target, evalOptions)),
          evalOptions,
        );
        return score;
      }

      return {
        score: evaluation.hit ? 1 : 0,
        maxScore: 1,
        details: {
          hit: evaluation.hit,
          timingDelta: evaluation.timingDelta,
          attemptNumber: data.events.length,
        },
      };
    },

    report: (state) => {
      const { data } = state;
      if (data.events.length === 0) {
        return { score: 0, maxScore: 1, durationMs: 0 };
      }

      const evaluations = data.events.map((e) => evaluateNote(e, data.target, evalOptions));
      const score = evaluateNoteSequence(evaluations, evalOptions);

      return {
        ...score,
        durationMs: performance.now() - data.startTime,
        details: { ...score.details, attempts: data.events.length, target: data.target.note },
      };
    },
  };
}
