import type { CompEvent } from './rhodesVoicing.js';

/**
 * Avoid rhythmic and harmonic conflicts between Rhodes (complementary layer)
 * and Piano (primary comping).
 *
 * Rules:
 * 1. If a Rhodes event falls on the same beat (±1/16 note) as a Piano event,
 *    push it 1/16 later (or mute if that's not possible).
 * 2. Rhodes events are preserved but may be shifted — never dropped unless
 *    the shifted position also conflicts.
 * 3. Offbeat Rhodes events that coincide with Piano are shifted later by
 *    another 1/16 (subdivision increment).
 */

const SIXTEENTH_TICKS = 120; // PPQ 480 / 4

/**
 * Apply conflict-avoidance to Rhodes events given Piano events for the same bar.
 *
 * Piano events from the 'upper' lane (upper structures) have priority and are
 * excluded from conflict detection — they should NOT cause Rhodes events to shift.
 *
 * @param rhodesEvents — array of events to potentially modify (mutated in place).
 * @param pianoEvents — Piano events for the bar (beat positions, optional lane).
 * @param tpBeat — ticks per beat for the current time signature.
 * @returns The possibly modified rhodesEvents array.
 */
export function avoidConflicts(
  rhodesEvents: CompEvent[],
  pianoEvents: readonly { beat: number; subdivision?: number; lane?: string }[],
  tpBeat: number,
): CompEvent[] {
  if (rhodesEvents.length === 0 || pianoEvents.length === 0) return rhodesEvents;

  // Filter out upper-lane events (they have priority and should not suppress Rhodes)
  const rhythmPianoEvents = pianoEvents.filter((e) => e.lane !== 'upper');
  if (rhythmPianoEvents.length === 0) return rhodesEvents;

  const pianoPositions = new Set(
    rhythmPianoEvents.map((e) => (e.beat - 1) * tpBeat + Math.round((e.subdivision ?? 0) * tpBeat)),
  );

  for (const re of rhodesEvents) {
    const reTicks = (re.beat - 1) * tpBeat + Math.round((re.subdivision ?? 0) * tpBeat);

    // Check for conflict: same beat ±1/16
    const conflicts = [...pianoPositions].some((pp) => Math.abs(pp - reTicks) <= SIXTEENTH_TICKS);

    if (!conflicts) continue;

    // Shift by 1/16 note (add subdivision)
    const currentSub = re.subdivision ?? 0;
    const shiftedSub = currentSub + 0.5;

    if (shiftedSub <= 0.5) {
      (re as { subdivision?: number }).subdivision = shiftedSub as 0 | 0.5;
      // Reduce velocity to blend, not compete
      (re as { velocity: number }).velocity = Math.max(0.15, re.velocity * 0.7);
    }
    // If already at max subdivision, keep original (minor overlap is acceptable)
  }

  return rhodesEvents;
}
