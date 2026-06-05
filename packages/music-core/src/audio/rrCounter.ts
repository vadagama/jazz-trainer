import type { BassArticulation } from './instrument.js';

/**
 * Round-robin counter for bass samples.
 * Each (note, articulation) pair cycles through its 4 variants independently.
 */
export class RoundRobinCounter {
  private readonly counters = new Map<string, number>();

  /** Returns the next 1-based RR index for the given note+articulation pair. */
  next(note: string, articulation: BassArticulation): number {
    const key = `${note}_${articulation}`;
    const rrCount = 4;
    const current = this.counters.get(key) ?? 0;
    const result = current + 1;
    this.counters.set(key, result % rrCount);
    return result;
  }

  reset(): void {
    this.counters.clear();
  }
}
