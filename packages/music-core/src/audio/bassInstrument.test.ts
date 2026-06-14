import { describe, it, expect } from 'vitest';
import { BassInstrument } from './bassInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext } from './instrument.js';
import type { ChordSymbol, Style } from '@jazz/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeChord(
  root: ChordSymbol['root'],
  accidental: ChordSymbol['rootAccidental'] = '',
  quality: ChordSymbol['quality'] = 'minor',
  alterations: ChordSymbol['alterations'] = [],
): ChordSymbol {
  return {
    raw: `${root}${accidental}`,
    root,
    rootAccidental: accidental,
    quality,
    extensions: ['7'],
    alterations,
    alt: false,
    bass: null,
  };
}

function makeCtx(sig = parseTimeSignature('4/4')): {
  ctx: ScheduleContext;
  notes: Array<{
    at: number;
    note: string;
    velocity: number;
    durationTicks: number;
    articulation: string;
  }>;
} {
  const notes: Array<{
    at: number;
    note: string;
    velocity: number;
    durationTicks: number;
    articulation: string;
  }> = [];
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: sig,
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (_instrumentId, payload, at, velocity, durationTicks) => {
      if (_instrumentId === 'bass') {
        const p = payload as { note: string; articulation: string };
        notes.push({ at, note: p.note, velocity, durationTicks, articulation: p.articulation });
      }
    },
  };
  return { ctx, notes };
}

function makeBass(timeline: ChordTimeline, style?: Style): BassInstrument {
  const bass = new BassInstrument(timeline);
  if (style) bass.setStyle(style);
  return bass;
}

const TPB = 480; // ticks per beat in 4/4
const TPBAR = 1920; // ticks per bar in 4/4
const TPB3 = 480; // ticks per beat in 3/4
const TPBAR3 = 1440; // ticks per bar in 3/4

// ─── Swing: walking bass ─────────────────────────────────────────────────────

describe('BassInstrument — swing style (walking bass)', () => {
  it('complexity 1–2: plays root on every beat, alternating octaves', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(2);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(4);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[1]!.note).toBe('D3');
    expect(notes[2]!.note).toBe('D2');
    expect(notes[3]!.note).toBe('D3');
  });

  it('complexity 1–2: uses pluck articulation on all beats', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(1);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    for (const n of notes) expect(n.articulation).toBe('pluck');
  });

  it('complexity 3–4: root on strong beats, fifth on weak beats (Dm7)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(4);
    expect(notes[0]!.note).toBe('D2'); // beat 1: root
    expect(notes[1]!.note).toMatch(/^A[23]/); // beat 2: fifth
    expect(notes[2]!.note).toBe('D2'); // beat 3: root (strong in 4/4)
    expect(notes[3]!.note).toMatch(/^A[23]/); // beat 4: fifth
  });

  it('complexity 5–6: walking bass (root-3rd-5th-approach)', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('G', '', 'dominant') },
    ]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(4);
    expect(notes[0]!.note).toBe('D2'); // root
    expect(notes[1]!.note).toMatch(/^F[23]/); // third (minor)
    expect(notes[2]!.note).toMatch(/^A[23]/); // fifth
    // Last beat = approach to G7 (bar 0 = even → from above: Ab)
    expect(notes[3]!.note).toMatch(/^Ab[23]/);
  });

  it('walking bass: approach from below on odd bars', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('G', '', 'dominant') },
      { barIndex: 2, chord: makeChord('C', '', 'major') },
    ]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: TPBAR, toTicks: 2 * TPBAR }, ctx);
    expect(notes[3]!.note).toMatch(/^B[12]/); // bar 1 (odd) approach from below to C: B
  });

  it('walking bass: falls back to seventh when no next chord', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // Last beat: no next chord → falls back to seventh of Dm7 = C
    expect(notes[3]!.note).toMatch(/^C[23]/);
  });

  it('complexity 7: dense chord tones on all beats (Dm7: D F A C)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(7);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(4);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[1]!.note).toMatch(/^F[23]/);
    expect(notes[2]!.note).toMatch(/^A[23]/);
    expect(notes[3]!.note).toMatch(/^C[23]/);
  });

  it('applies beat-specific velocity', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes[0]!.velocity).toBe(0.82);
    expect(notes[1]!.velocity).toBe(0.68);
    expect(notes[2]!.velocity).toBe(0.76);
    expect(notes[3]!.velocity).toBe(0.7);
  });

  it('skips beats in bars with null chord', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: null },
      { barIndex: 2, chord: makeChord('C', '', 'major') },
    ]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);
    expect(notes).toHaveLength(8);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[4]!.note).toBe('C2');
  });

  it('resolves flat accidentals correctly (Bb, Ab)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('B', 'b') }]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes[0]!.note).toBe('Bb2');
  });

  it('walks in 3/4 (root-3rd-approach)', () => {
    const sig = parseTimeSignature('3/4');
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('G', '', 'dominant') },
    ]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx(sig);

    bass.schedule({ fromTicks: 0, toTicks: TPBAR3 }, ctx);
    expect(notes).toHaveLength(3);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[1]!.note).toMatch(/^F[23]/); // third in 3/4
    // Last beat = approach to G7 from above: Ab
    expect(notes[2]!.note).toMatch(/^Ab[23]/);
  });
});

// ─── Bossa: root-5th half notes ──────────────────────────────────────────────

describe('BassInstrument — bossa style (root-5th half notes)', () => {
  it('plays root on beat 1 and fifth on beat 3 (half-note pattern)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'bossa');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(2);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[0]!.at).toBe(0);
    expect(notes[1]!.note).toMatch(/^A[23]/);
    expect(notes[1]!.at).toBe(2 * TPB); // beat 3
  });

  it('uses half-note duration (gate ratio applied to half-bar slot)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'bossa');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    for (const n of notes) {
      expect(n.durationTicks).toBe(Math.floor((TPBAR / 2) * 0.92));
    }
  });

  it('uses pluck articulation', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'bossa');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    for (const n of notes) expect(n.articulation).toBe('pluck');
  });

  it('higher complexity alternates root octave between bars', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('D') },
    ]);
    const bass = makeBass(timeline, 'bossa');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);
    expect(notes).toHaveLength(4);
    expect(notes[0]!.note).toBe('D2'); // bar 0, beat 1: octave 2
    expect(notes[2]!.note).toBe('D3'); // bar 1, beat 1: octave 3
  });

  it('follows chord changes across bars', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('C', '', 'major') },
    ]);
    const bass = makeBass(timeline, 'bossa');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[2]!.note).toBe('C2'); // bar 1, beat 1
  });

  it('in 3/4: plays only root on beat 1', () => {
    const sig = parseTimeSignature('3/4');
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'bossa');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx(sig);

    bass.schedule({ fromTicks: 0, toTicks: TPBAR3 }, ctx);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[0]!.at).toBe(0);
  });
});

// ─── Funk: syncopated eighth-notes ───────────────────────────────────────────

describe('BassInstrument — funk style (syncopated eighth-notes)', () => {
  it('complexity 1–2: sparse — root on 1, fifth on 3', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'funk');
    bass.setComplexity(2);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(2);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[0]!.at).toBe(0); // beat 1
    expect(notes[1]!.note).toMatch(/^A[23]/);
    expect(notes[1]!.at).toBe(2 * TPB); // beat 3
  });

  it('complexity 3–4: medium syncopation — hits on 1, 1&, 2&, 4, 4&', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'funk');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(6);
    expect(notes[0]!.at).toBe(0); // beat 1
    expect(notes[1]!.at).toBe(TPB / 2); // beat 1&
    expect(notes[2]!.at).toBe(TPB + TPB / 2); // beat 2&
    expect(notes[3]!.at).toBe(2 * TPB + TPB / 2); // beat 3&
    expect(notes[4]!.at).toBe(3 * TPB); // beat 4
    expect(notes[5]!.at).toBe(3 * TPB + TPB / 2); // beat 4&
  });

  it('complexity 5–6: dense — syncopated with seventh on 4&', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'funk');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(6);
    // Last hit on 4& should be a seventh (C for Dm7)
    const lastNote = notes[notes.length - 1]!;
    expect(lastNote.at).toBe(3 * TPB + TPB / 2); // 4&
    expect(lastNote.note).toMatch(/^C[23]/);
  });

  it('complexity 7: highly syncopated with approach note on beat 4', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('G', '', 'dominant') },
    ]);
    const bass = makeBass(timeline, 'funk');
    bass.setComplexity(7);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(7);
    // Beat 1 starts with fifth
    expect(notes[0]!.note).toMatch(/^A[23]/);
    // Beat 4 has approach to G7
    const beat4 = notes.find((n) => n.at === 3 * TPB);
    expect(beat4!.note).toMatch(/^Ab[12]/);
  });

  it('eighth-note grid: rests correctly (no hits on downbeat 2 and 4 for medium)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'funk');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    const atTicks = notes.map((n) => n.at);
    // Should NOT have hits on beat 2 downbeat (TPB) or beat 3 downbeat (2*TPB)
    expect(atTicks).not.toContain(TPB); // beat 2 downbeat
    expect(atTicks).not.toContain(2 * TPB); // beat 3 downbeat
  });
});

// ─── Latin: montuno ──────────────────────────────────────────────────────────

describe('BassInstrument — latin style (montuno)', () => {
  it('plays root on beat 1, fifth on beat 2&, octave on beat 4', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'latin');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(3);
    expect(notes[0]!.note).toBe('D2'); // beat 1: root
    expect(notes[0]!.at).toBe(0);
    expect(notes[1]!.note).toMatch(/^A[23]/); // beat 2&: fifth
    expect(notes[1]!.at).toBe(TPB + TPB / 2); // 1.5 beats = 720 ticks
    expect(notes[2]!.note).toBe('D3'); // beat 4: octave
    expect(notes[2]!.at).toBe(3 * TPB); // 1440 ticks
  });

  it('beat 2& has slightly lower velocity (0.9 factor)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'latin');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    const offNote = notes[1]!;
    expect(offNote.velocity).toBeCloseTo(0.68 * 0.9, 2);
  });

  it('higher complexity: octave alternates on beat 1 between bars', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('D') },
    ]);
    const bass = makeBass(timeline, 'latin');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);
    expect(notes[0]!.note).toBe('D2'); // bar 0, beat 1
    expect(notes[3]!.note).toBe('D3'); // bar 1, beat 1 (alternates)
  });

  it('complexity 6+: plays seventh on beat 4 instead of octave', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'latin');
    bass.setComplexity(6);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes[2]!.note).toMatch(/^C[23]/); // seventh of Dm7
  });

  it('follows chord changes', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('C', '', 'major') },
    ]);
    const bass = makeBass(timeline, 'latin');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[3]!.note).toBe('C2');
  });

  it('in 3/4: plays root on beat 1, fifth on 2&, octave on beat 3 (last beat)', () => {
    const sig = parseTimeSignature('3/4');
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'latin');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx(sig);

    bass.schedule({ fromTicks: 0, toTicks: TPBAR3 }, ctx);
    expect(notes).toHaveLength(3);
    expect(notes[0]!.at).toBe(0);
    expect(notes[1]!.at).toBe(TPB3 + TPB3 / 2); // 2&
    expect(notes[2]!.at).toBe(2 * TPB3); // beat 3 = last beat
    expect(notes[2]!.note).toBe('D3'); // octave on last beat
  });
});

// ─── Ballad: two-feel ────────────────────────────────────────────────────────

describe('BassInstrument — ballad style (two-feel)', () => {
  it('plays only on beats 1 and 3', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'ballad');
    bass.setComplexity(7);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(2);
    expect(notes[0]!.at).toBe(0); // beat 1
    expect(notes[1]!.at).toBe(2 * TPB); // beat 3
  });

  it('complexity 4–6: root on beat 1, fifth on beat 3', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'ballad');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(2);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[1]!.note).toMatch(/^A[23]/); // fifth on beat 3
  });

  it('complexity 1–3: root on both beats 1 and 3', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'ballad');
    bass.setComplexity(2);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[1]!.note).toBe('D2'); // root on beat 3 too
  });

  it('notes have half-bar duration', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'ballad');
    bass.setComplexity(7);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    for (const n of notes) {
      expect(n.durationTicks).toBe(Math.floor((TPBAR / 2) * 0.92));
    }
  });

  it('complexity 7: alternates root octave between bars', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('D') },
    ]);
    const bass = makeBass(timeline, 'ballad');
    bass.setComplexity(7);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);
    expect(notes[0]!.note).toBe('D2'); // bar 0, beat 1
    expect(notes[2]!.note).toBe('D3'); // bar 1, beat 1 (alternates)
  });

  it('follows chord changes across bars', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('C', '', 'major') },
    ]);
    const bass = makeBass(timeline, 'ballad');
    bass.setComplexity(7);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);
    expect(notes[0]!.note).toBe('D2');
    expect(notes[2]!.note).toBe('C3'); // bar 1 (odd) → octave alternates to 3
  });

  it('in 3/4: plays only beat 1', () => {
    const sig = parseTimeSignature('3/4');
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'ballad');
    bass.setComplexity(7);
    const { ctx, notes } = makeCtx(sig);

    bass.schedule({ fromTicks: 0, toTicks: TPBAR3 }, ctx);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.at).toBe(0);
  });

  it('uses pluck articulation', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'ballad');
    bass.setComplexity(7);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    for (const n of notes) expect(n.articulation).toBe('pluck');
  });
});

// ─── Cross-style: setStyle changes behavior ───────────────────────────────────

describe('BassInstrument — style switching', () => {
  it('setStyle("swing") uses walking bass default complexity 5', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('G', '', 'dominant') },
    ]);
    const bass = new BassInstrument(timeline);
    bass.setStyle('swing');
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // Default complexity 5 = walking bass
    expect(notes[3]!.note).toMatch(/^Ab[23]/); // approach note from above to G
  });

  it('setStyle("ballad") switches to two-feel', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = new BassInstrument(timeline);
    bass.setStyle('ballad');
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(2); // two-feel = 2 notes per bar
  });

  it('setStyle("bossa") uses half-note pattern', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = new BassInstrument(timeline);
    bass.setStyle('bossa');
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(2);
    expect(notes[0]!.at).toBe(0);
    expect(notes[1]!.at).toBe(2 * TPB);
  });

  it('setStyle preserves complexity override', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = new BassInstrument(timeline);
    bass.setComplexity(1);
    bass.setStyle('swing'); // setStyle overwrites complexity to default (5)
    const { ctx, notes } = makeCtx();
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // Complexity reset to 5 = walking bass, not complexity 1
    expect(notes).toHaveLength(4);
  });

  it('setComplexity after setStyle overrides the default', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = new BassInstrument(timeline);
    bass.setStyle('swing');
    bass.setComplexity(2);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // Complexity 2 in swing = roots on quarters
    expect(notes[0]!.note).toBe('D2');
    expect(notes[1]!.note).toBe('D3');
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('BassInstrument — edge cases', () => {
  it('does nothing when no chord in bar', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: null }]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes).toHaveLength(0);
  });

  it('respects schedule window bounds', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('C', '', 'major') },
    ]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(5);
    const { ctx, notes } = makeCtx();

    // Only schedule second bar
    bass.schedule({ fromTicks: TPBAR, toTicks: 2 * TPBAR }, ctx);
    expect(notes[0]!.note).toBe('C2');
  });

  it('resolves b5 for halfDiminished chords', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D', '', 'halfDiminished') },
    ]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // beat 2 (weak) plays fifth: b5 → Ab for D half-dim
    expect(notes[1]!.note).toMatch(/^Ab[23]/);
  });

  it('resolves b5 when alteration "b5" is present', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('C', '', 'dominant', ['b5']) },
    ]);
    const bass = makeBass(timeline, 'swing');
    bass.setComplexity(3);
    const { ctx, notes } = makeCtx();

    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(notes[1]!.note).toMatch(/^Gb[23]/);
  });
});
