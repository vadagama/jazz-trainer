import type { RepeatEnd, Section, TimeSignatureString } from '@jazz/shared';
import { parseChord } from '../chords/parseChord.js';
import type { ChordTimelineEntry } from '../audio/chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';

/**
 * Flat playback sequence resolved from sections with repeat markers.
 * Each entry is the original 0-based bar index in the grid.
 */
export interface FlatSequence {
  bars: number[];
  infiniteLoopStart: number | null;
}

/**
 * Recursively expand bars [from..to] respecting nested repeat markers.
 * The LAST repeatEnd in the range is the outermost repeat — it plays the whole
 * sub-range (including inner repeats) N times. Earlier markers are inner repeats.
 */
export function expandRange(
  sectionBars: Section['bars'],
  from: number,
  to: number,
  globalOffset: number,
  result: number[],
): void {
  if (from > to) return;

  let outerIdx = -1;
  for (let bi = to; bi >= from; bi--) {
    if (sectionBars[bi]?.repeatEnd) {
      outerIdx = bi;
      break;
    }
  }

  if (outerIdx === -1) {
    for (let bi = from; bi <= to; bi++) result.push(globalOffset + bi);
    return;
  }

  const times = sectionBars[outerIdx]!.repeatEnd!.count ?? 1;

  for (let t = 0; t < times; t++) {
    expandRange(sectionBars, from, outerIdx - 1, globalOffset, result);
    result.push(globalOffset + outerIdx);
  }

  for (let bi = outerIdx + 1; bi <= to; bi++) result.push(globalOffset + bi);
}

/**
 * Marker on the last bar of the last section: it repeats the WHOLE form,
 * not just the last section. `count: null` = infinite loop, `count: N` = N full passes.
 */
function getFormRepeat(sections: Section[]): RepeatEnd | undefined {
  if (sections.length === 0) return undefined;
  const lastSection = sections[sections.length - 1]!;
  const lastBar = lastSection.bars[lastSection.bars.length - 1];
  return lastBar?.repeatEnd;
}

/**
 * Build a single linear pass over the form (one playthrough of all sections),
 * respecting inner/nested `repeatEnd` markers. The form-repeat marker on the
 * last bar of the last section is stripped before expansion so it is not
 * mistaken for an inner repeat (then the bar plays once as the form endpoint).
 */
function buildFormPass(sections: Section[]): number[] {
  const formRepeat = getFormRepeat(sections);
  const norm = sections.map((s, si) => {
    if (si !== sections.length - 1 || formRepeat === undefined) return s.bars;
    const lastIdx = s.bars.length - 1;
    return s.bars.map((b, bi) =>
      bi === lastIdx ? ({ ...b, repeatEnd: undefined } as typeof b) : b,
    );
  });

  const bars: number[] = [];
  let globalOffset = 0;
  for (let si = 0; si < norm.length; si++) {
    expandRange(norm[si]!, 0, norm[si]!.length - 1, globalOffset, bars);
    globalOffset += sections[si]!.bars.length;
  }
  return bars;
}

/**
 * Expand sections into a linear playback order respecting repeatEnd markers.
 * A `repeatEnd` on the LAST bar of the LAST section repeats the whole form:
 * - count = N  → the whole form plays N times total, then stops
 * - count = null → the whole form loops infinitely from bar 0
 * `repeatEnd` on any non-last bar repeats its inner sub-range (see expandRange).
 */
export function buildFlatSequence(sections: Section[]): FlatSequence {
  const formRepeat = getFormRepeat(sections);

  if (formRepeat === undefined) {
    return { bars: buildFormPass(sections), infiniteLoopStart: null };
  }

  const onePass = buildFormPass(sections);

  if (formRepeat.count === null) {
    // Infinite loop: one pass, wrap back to bar 0
    return { bars: onePass, infiniteLoopStart: 0 };
  }

  // Finite form-repeat: N full passes, then auto-stop (infiniteLoopStart stays null)
  const bars: number[] = [];
  for (let p = 0; p < formRepeat.count; p++) bars.push(...onePass);
  return { bars, infiniteLoopStart: null };
}

/**
 * Build ChordTimeline entries from sections + flat bar sequence.
 * Uses flat sequence position as barIndex so getChordAtTick resolves
 * entries by virtual tick position, not by original grid bar index.
 */
export function buildChordTimelineEntries(
  sections: Section[],
  flatBars: number[],
  timeSignature: TimeSignatureString,
): ChordTimelineEntry[] {
  const allBars = sections.flatMap((s) => s.bars);
  const sig = parseTimeSignature(timeSignature);
  const beatsPerBar = sig.beatsPerBar;
  const result: ChordTimelineEntry[] = [];

  const resolveChord = (slot: {
    symbol: string;
    parsed?: { root: unknown; quality: unknown } | null;
  }) => {
    if (slot.parsed) return slot.parsed as ChordTimelineEntry['chord'];
    const r = parseChord(slot.symbol);
    return (r.ok && r.value ? r.value : null) as ChordTimelineEntry['chord'];
  };

  for (let flatPos = 0; flatPos < flatBars.length; flatPos++) {
    const barIdx = flatBars[flatPos]!;
    const bar = allBars[barIdx];
    if (!bar || bar.chords.length === 0) {
      result.push({ barIndex: flatPos, beatStart: 0, beatEnd: beatsPerBar, chord: null });
      continue;
    }

    const chords = bar.chords;

    if (chords.length === 1) {
      result.push({ barIndex: flatPos, chord: resolveChord(chords[0]!) });
      continue;
    }

    let beatCursor = 0;
    for (const slot of chords) {
      const chordBeats = slot.beats ?? Math.floor(beatsPerBar / chords.length);
      const resolvedBeatEnd = Math.min(beatCursor + chordBeats, beatsPerBar);
      result.push({
        barIndex: flatPos,
        beatStart: beatCursor,
        beatEnd: resolvedBeatEnd,
        chord: resolveChord(slot),
      });
      beatCursor = resolvedBeatEnd;
    }
  }
  return result;
}
