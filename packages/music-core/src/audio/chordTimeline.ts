import type { ChordSymbol } from '@jazz/shared';
import { ticksPerBar, type TimeSignature } from '../time/timeSignature.js';

export interface ChordTimelineEntry {
  /** Original bar index in the grid (before repeat expansion). */
  barIndex: number;
  /** The chord to play, or null if the bar is empty / unparsed. */
  chord: ChordSymbol | null;
}

/**
 * Maps a virtual flat-playback tick position to the chord active at that moment.
 * Entries are in virtual playback order (repeat-expanded), not grid order.
 */
export class ChordTimeline {
  private entries: ChordTimelineEntry[];

  constructor(entries: ChordTimelineEntry[] = []) {
    this.entries = entries;
  }

  setEntries(entries: ChordTimelineEntry[]): void {
    this.entries = entries;
  }

  /** Returns the chord active at the given absolute virtual tick, or null. */
  getChordAtTick(virtualTick: number, sig: TimeSignature): ChordSymbol | null {
    const tpBar = ticksPerBar(sig);
    const virtualBar = Math.floor(virtualTick / tpBar);
    return this.entries[virtualBar]?.chord ?? null;
  }

  get length(): number {
    return this.entries.length;
  }
}
