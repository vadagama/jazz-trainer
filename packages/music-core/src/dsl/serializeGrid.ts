import type { GridContent } from '@jazz/shared';
import { serializeChord } from '../chords/serializeChord.js';

/**
 * Serialize {@link GridContent} back into a DSL string with `|` bar separators
 * and a trailing `||` terminator (docs/06-dsl.md §7).
 *
 * Chords are emitted in normalized form (via their parsed structure when
 * available), so `serializeGrid(parseGrid(x))` is round-trip stable.
 */
export function serializeGrid(content: GridContent): string {
  const bars = content.bars.map((bar) =>
    bar.chords.map((slot) => (slot.parsed ? serializeChord(slot.parsed) : slot.symbol)).join(' '),
  );
  return `${bars.join(' | ')} ||`;
}
