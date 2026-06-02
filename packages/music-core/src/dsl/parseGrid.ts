import type { Bar, ChordSlot, GridContent, ParseError, ParseResult } from '@jazz/shared';
import { parseChord } from '../chords/parseChord.js';

interface Segment {
  text: string;
  offset: number;
}

/** Split the DSL into bar segments on runs of `|`, tracking source offsets. */
function splitBars(text: string): Segment[] {
  const segments: Segment[] = [];
  const sepRe = /\|+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = sepRe.exec(text)) !== null) {
    segments.push({ text: text.slice(last, m.index), offset: last });
    last = m.index + m[0].length;
  }
  segments.push({ text: text.slice(last), offset: last });
  return segments;
}

/**
 * Parse a harmony DSL string into {@link GridContent} (docs/06-dsl.md §1, §5).
 *
 * - `|` separates bars; a run of `|` (e.g. trailing `||`) counts as one separator.
 * - Chords within a bar are split on whitespace or commas.
 * - Newlines are treated as spaces (multiline input is allowed).
 * - Invalid chords are flagged with a positioned error but do not abort the form;
 *   all errors are collected.
 */
export function parseGrid(dsl: string): ParseResult<GridContent> {
  const errors: ParseError[] = [];
  const text = dsl.replace(/[\r\n\t]+/g, ' ');

  const segments = splitBars(text);

  // Drop leading/trailing whitespace-only segments (artifacts of edge pipes and
  // the optional trailing `||` terminator). Internal empties stay as empty bars.
  let start = 0;
  let end = segments.length;
  while (start < end && segments[start]!.text.trim() === '') start++;
  while (end > start && segments[end - 1]!.text.trim() === '') end--;
  const kept = segments.slice(start, end);

  const bars: Bar[] = kept.map((seg, idx) => {
    const chords: ChordSlot[] = [];
    const tokenRe = /[^\s,]+/g;
    let t: RegExpExecArray | null;
    while ((t = tokenRe.exec(seg.text)) !== null) {
      const token = t[0];
      const tokenOffset = seg.offset + t.index;
      const res = parseChord(token);
      chords.push({ symbol: token, parsed: res.value ?? null });
      for (const err of res.errors) {
        errors.push({ ...err, position: tokenOffset + err.position, token });
      }
    }
    return { id: `b${idx + 1}`, chords };
  });

  const value: GridContent = { version: 1, bars };
  return { ok: errors.length === 0, value, errors };
}
