import type { Section, TimeSignatureString } from '@jazz/shared';
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
 * Expand sections into a linear playback order respecting repeatEnd markers.
 * - repeatEnd.count = N  → play that section N times total
 * - repeatEnd.count = null on the LAST section → infinite loop
 */
export function buildFlatSequence(sections: Section[]): FlatSequence {
  const bars: number[] = [];
  let globalOffset = 0;
  let infiniteLoopStart: number | null = null;

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]!;
    const sectionBars = section.bars;
    const isLastSection = si === sections.length - 1;

    const lastBar = sectionBars[sectionBars.length - 1];
    const isInfiniteSection = isLastSection && lastBar?.repeatEnd?.count === null;

    if (isInfiniteSection) {
      infiniteLoopStart = bars.length;
      expandRange(sectionBars, 0, sectionBars.length - 2, globalOffset, bars);
      bars.push(globalOffset + sectionBars.length - 1);
    } else {
      expandRange(sectionBars, 0, sectionBars.length - 1, globalOffset, bars);
    }

    globalOffset += sectionBars.length;
  }

  return { bars, infiniteLoopStart };
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
