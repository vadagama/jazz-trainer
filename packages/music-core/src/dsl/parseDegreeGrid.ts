import type { ParseError, ParseResult } from '@jazz/shared';
import { parseDegree, type DegreeStep } from './parseDegree.js';

/** One bar of the degree DSL: an ordered list of degree steps. */
export interface DegreeBar {
  id: string;
  slots: DegreeStep[];
}

/** Parsed degree grid — key-independent, expanded per key by the generator. */
export interface DegreeGrid {
  version: 1;
  bars: DegreeBar[];
}

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
 * Parse a harmony DSL written in scale degrees into a {@link DegreeGrid}.
 *
 * Mirrors {@link parseGrid}'s segmentation (`|` separates bars, whitespace/commas
 * separate steps within a bar, newlines act as spaces) but each token is a
 * scale degree (`I6`, `IIm7`, `V7`, `bII`, `V7/V`) rather than an absolute chord.
 * Invalid degrees are flagged with positioned errors without aborting the form.
 */
export function parseDegreeGrid(dsl: string): ParseResult<DegreeGrid> {
  const errors: ParseError[] = [];
  const text = dsl.replace(/[\r\n\t]+/g, ' ');

  const segments = splitBars(text);

  // Drop leading/trailing whitespace-only segments (edge pipes, trailing `||`).
  let start = 0;
  let end = segments.length;
  while (start < end && segments[start]!.text.trim() === '') start++;
  while (end > start && segments[end - 1]!.text.trim() === '') end--;
  const kept = segments.slice(start, end);

  const bars: DegreeBar[] = kept.map((seg, idx) => {
    const slots: DegreeStep[] = [];
    const tokenRe = /[^\s,]+/g;
    let t: RegExpExecArray | null;
    while ((t = tokenRe.exec(seg.text)) !== null) {
      const token = t[0];
      const tokenOffset = seg.offset + t.index;
      const res = parseDegree(token);
      if (res.value) {
        slots.push(res.value);
      }
      for (const err of res.errors) {
        errors.push({ ...err, position: tokenOffset + err.position, token });
      }
    }
    return { id: `b${idx + 1}`, slots };
  });

  const value: DegreeGrid = { version: 1, bars };
  return { ok: errors.length === 0, value, errors };
}
