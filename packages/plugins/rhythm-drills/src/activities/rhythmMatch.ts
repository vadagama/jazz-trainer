import type { MidiInputEvent } from '@jazz/music-core/audio';
import { evaluateRhythm, scoreRhythmEval } from '@jazz/music-core/audio';
import type { ActivityDefinition, ActivityState } from '@jazz/plugin-sdk';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface RhythmMatchState {
  /** Expected beat times in seconds (relative to start). */
  expectedTimes: number[];
  /** Collected MIDI events. */
  events: MidiInputEvent[];
  /** When listening started (performance.now). */
  startTime: number;
  /** Duration of the exercise window in seconds. */
  windowDuration: number;
  /** Whether the time window has closed. */
  closed: boolean;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface RhythmMatchOptions {
  /** Expected beat times in seconds. */
  expectedTimes: number[];
  /** Timing tolerance in seconds (default: 0.2). */
  timingTolerance?: number;
  /** Duration of the listening window in seconds. */
  windowDuration?: number;
}

/**
 * Create an {@link ActivityDefinition} for rhythm matching with MIDI input.
 *
 * The player taps rhythm on a MIDI keyboard/controller. Events are
 * collected during a time window and then matched against expected
 * beat positions using greedy nearest-neighbor assignment.
 */
export function createRhythmMatchActivity(
  opts: RhythmMatchOptions,
): ActivityDefinition<RhythmMatchState> {
  const timingTolerance = opts.timingTolerance ?? 0.2;
  const windowDuration = opts.windowDuration ?? Math.max(...opts.expectedTimes) + 2;

  return {
    id: 'rhythm-match',
    type: 'exercise',

    start: (_ctx: unknown): ActivityState<RhythmMatchState> => ({
      status: 'active',
      data: {
        expectedTimes: opts.expectedTimes,
        events: [],
        startTime: performance.now(),
        windowDuration,
        closed: false,
      },
    }),

    evaluate: (state, answer) => {
      const event = answer as MidiInputEvent | undefined;
      if (!event || typeof event.timestamp !== 'number') {
        return { score: 0, maxScore: 1 };
      }

      const { data } = state;
      if (state.status !== 'active' || data.closed) {
        return { score: 0, maxScore: 1 };
      }

      // Record the event
      data.events.push(event);

      // Check if window has elapsed
      const elapsed = (performance.now() - data.startTime) / 1000;
      if (elapsed >= data.windowDuration) {
        data.closed = true;
        const result = evaluateRhythm(data.events, data.expectedTimes, timingTolerance);
        return scoreRhythmEval(result, timingTolerance);
      }

      // Partial feedback: just confirm event was recorded
      return {
        score: 0,
        maxScore: 1,
        details: { eventsCollected: data.events.length, elapsed },
      };
    },

    report: (state) => {
      const { data } = state;
      if (data.events.length === 0) {
        return { score: 0, maxScore: 1, durationMs: performance.now() - data.startTime };
      }

      const result = evaluateRhythm(data.events, data.expectedTimes, timingTolerance);
      const score = scoreRhythmEval(result, timingTolerance);

      return {
        ...score,
        durationMs: performance.now() - data.startTime,
        details: {
          ...score.details,
          expectedBeats: data.expectedTimes.length,
          eventsCollected: data.events.length,
        },
      };
    },
  };
}
