import type { ChordSymbol } from '@jazz/shared';
import { ticksPerBar, ticksPerBeat, type TimeSignature } from '../time/timeSignature.js';

export interface ChordTimelineEntry {
  /** Original bar index in the grid (before repeat expansion). */
  barIndex: number;
  /**
   * Beat within the bar (0-based) where this chord becomes active.
   * Defaults to 0 for backward compatibility (whole-bar entry).
   */
  beatStart?: number;
  /**
   * Beat within the bar (exclusive) where this chord ends.
   * Defaults to beatsPerBar for backward compatibility.
   */
  beatEnd?: number;
  /** The chord to play, or null if the bar is empty / unparsed. */
  chord: ChordSymbol | null;
}

/**
 * Maps a virtual flat-playback tick position to the chord active at that moment.
 * Supports sub-bar chord resolution: entries can span a subset of beats within a bar.
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
    const tpBeat = ticksPerBeat(sig);
    const bar = Math.floor(virtualTick / tpBar);
    const beatInBar = Math.floor((virtualTick % tpBar) / tpBeat);

    // Linear scan through entries for the matching bar + beat range.
    // Entries are stored in order, so this is efficient for typical grid sizes.
    for (const e of this.entries) {
      if (e.barIndex !== bar) continue;
      const start = e.beatStart ?? 0;
      const end = e.beatEnd ?? sig.beatsPerBar;
      if (beatInBar >= start && beatInBar < end) return e.chord;
    }
    return null;
  }

  /**
   * Returns the next chord that differs from the one active at `tick`.
   * Scans forward by one beat at a time, up to 2 bars ahead.
   */
  getNextChord(tick: number, sig: TimeSignature): ChordSymbol | null {
    const current = this.getChordAtTick(tick, sig);
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);
    for (let t = tick + tpBeat; t < tick + tpBar * 2; t += tpBeat) {
      const next = this.getChordAtTick(t, sig);
      if (next && next !== current) return next;
    }
    return null;
  }

  /** Returns the number of distinct chord entries in the given bar. */
  getChordCountInBar(barIndex: number): number {
    const seen = new Set<number>();
    for (const e of this.entries) {
      if (e.barIndex !== barIndex || !e.chord) continue;
      // Use beatStart as a unique key per chord slot within the bar
      seen.add(e.beatStart ?? 0);
    }
    return seen.size;
  }

  get length(): number {
    return this.entries.length;
  }
}
