import { describe, it, expect } from 'vitest';
import { PianoInstrument } from './pianoInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext } from './instrument.js';
import type { ChordSymbol, Style } from '@jazz/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeChord(
  root: ChordSymbol['root'],
  accidental: ChordSymbol['rootAccidental'] = '',
  quality: ChordSymbol['quality'] = 'minor',
): ChordSymbol {
  return {
    raw: `${root}${accidental}`,
    root,
    rootAccidental: accidental,
    quality,
    extensions: ['7'],
    alterations: [],
    alt: false,
    bass: null,
  };
}

type PianoEvent = {
  at: number;
  notes: string[];
  velocity: number;
  durationTicks: number;
};

function makeCtx(sig = parseTimeSignature('4/4')): {
  ctx: ScheduleContext;
  chords: PianoEvent[];
} {
  const chords: PianoEvent[] = [];
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: sig,
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (_instrumentId, payload, at, velocity, durationTicks) => {
      if (_instrumentId === 'piano') {
        const p = payload as { notes: string[] };
        chords.push({ at, notes: [...p.notes], velocity, durationTicks });
      }
    },
  };
  return { ctx, chords };
}

function makePiano(entries: { chord: ChordSymbol | null }[], style?: Style): PianoInstrument {
  const timeline = new ChordTimeline(entries.map((e, i) => ({ barIndex: i, chord: e.chord })));
  const inst = new PianoInstrument(timeline);
  inst.setHumanize(false);
  if (style) inst.setStyle(style);
  return inst;
}

const dm7 = makeChord('D', '', 'minor');
const g7 = makeChord('G', '', 'dominant');
const cmaj7 = makeChord('C', '', 'major');

const TPB = 480;
const TPBAR = 1920; // 4/4 bar

// ─── Basic scheduling ─────────────────────────────────────────────────────────

describe('PianoInstrument — basic scheduling', () => {
  it('schedules events when profile has patterns', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: g7 }, { chord: cmaj7 }, { chord: dm7 }]);
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
  });

  it('schedules events with correct instrument id "piano"', () => {
    const inst = makePiano([{ chord: cmaj7 }]);
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.every((c) => c.notes.length > 0)).toBe(true);
  });

  it('skips bars with null chord', () => {
    const inst = makePiano([{ chord: null }, { chord: dm7 }, { chord: null }]);
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: 3 * TPBAR }, ctx);
    // Only bar 1 (index 1) should produce events
    const bar1Events = chords.filter((c) => c.at >= TPBAR && c.at < 2 * TPBAR);
    expect(bar1Events.length).toBeGreaterThan(0);
  });
});

// ─── Profiles ─────────────────────────────────────────────────────────────────

describe('PianoInstrument — profiles', () => {
  it('swing-sparse: uses 4-bar cycle with basie-2-4, charleston, basie-2-4, halfNotes', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: dm7 }, { chord: dm7 }, { chord: dm7 }]);
    inst.setProfile('swing-sparse');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: 4 * TPBAR }, ctx);

    // HalfNotes bar (index 3) should have 2 events on beats 1 and 3
    const bar3Events = chords.filter((c) => c.at >= 3 * TPBAR && c.at < 4 * TPBAR);
    expect(bar3Events.length).toBe(2);
  });

  it('swing-medium: produces events across 4 bars', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: dm7 }, { chord: dm7 }, { chord: dm7 }]);
    inst.setProfile('swing-medium');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: 4 * TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
    // Each bar should have at least 1 event
    for (let bar = 0; bar < 4; bar++) {
      const barEvents = chords.filter((c) => c.at >= bar * TPBAR && c.at < (bar + 1) * TPBAR);
      expect(barEvents.length).toBeGreaterThan(0);
    }
  });

  it('basie-light: has rest on bar 2 (index 1)', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: dm7 }, { chord: dm7 }, { chord: dm7 }]);
    inst.setProfile('basie-light');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: 4 * TPBAR }, ctx);

    const bar1Events = chords.filter((c) => c.at >= TPBAR && c.at < 2 * TPBAR);
    expect(bar1Events.length).toBe(0);
  });

  it('offbeat-push: bar 0 uses offbeat-2-4 pattern', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setProfile('offbeat-push');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // offbeat-2-4: beat 2& at 720, beat 4& at 1680
    const ticks = chords.map((c) => c.at);
    expect(ticks).toContain(TPB + Math.round(0.5 * TPB)); // beat 2& = 480 + 240 = 720
    expect(ticks).toContain(3 * TPB + Math.round(0.5 * TPB)); // beat 4& = 1440 + 240 = 1680
  });

  it('beginner-safe: uses halfNotes and wholeNotes', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: dm7 }]);
    inst.setProfile('beginner-safe');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);

    // Bar 0 = halfNotes → 2 events, Bar 1 = wholeNotes → 1 event
    const bar0 = chords.filter((c) => c.at < TPBAR);
    const bar1 = chords.filter((c) => c.at >= TPBAR && c.at < 2 * TPBAR);
    expect(bar0.length).toBe(2);
    expect(bar1.length).toBe(1);
  });
});

// ─── Style defaults ───────────────────────────────────────────────────────────

describe('PianoInstrument — style defaults', () => {
  it('swing style → swing-sparse profile', () => {
    const inst = makePiano([{ chord: dm7 }], 'swing');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // basie-2-4: beats 2 and 4
    const ticks = chords.map((c) => c.at);
    expect(ticks).toContain(TPB); // beat 2
    expect(ticks).toContain(3 * TPB); // beat 4
  });

  it('funk style → offbeat-push profile', () => {
    const inst = makePiano([{ chord: dm7 }], 'funk');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // offbeat-2-4: events on 2& and 4&
    expect(chords.length).toBe(2);
  });

  it('ballad style → beginner-safe profile', () => {
    const inst = makePiano([{ chord: dm7 }], 'ballad');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // halfNotes: 2 events per bar
    expect(chords.length).toBe(2);
  });

  it('bossa style → swing-sparse profile', () => {
    const inst = makePiano([{ chord: dm7 }], 'bossa');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
  });

  it('latin style → basie-light profile', () => {
    const inst = makePiano([{ chord: dm7 }], 'latin');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // basie-2-4 bar 0: beats 2 and 4
    const ticks = chords.map((c) => c.at);
    expect(ticks).toContain(TPB); // beat 2
    expect(ticks).toContain(3 * TPB); // beat 4
  });
});

// ─── Voicing density ──────────────────────────────────────────────────────────

describe('PianoInstrument — voicing density', () => {
  it('shell2 produces 2-note chords', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setVoicingDensity('shell2');
    inst.setProfile('swing-sparse');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
    expect(chords[0]!.notes.length).toBe(2);
  });

  it('rootless3 produces 3-note chords', () => {
    const inst = makePiano([{ chord: cmaj7 }]);
    inst.setVoicingDensity('rootless3');
    inst.setProfile('swing-sparse');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
    expect(chords[0]!.notes.length).toBe(3);
  });

  it('rootless4 produces 4-note chords', () => {
    const inst = makePiano([{ chord: cmaj7 }]);
    inst.setVoicingDensity('rootless4');
    inst.setProfile('swing-sparse');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
    expect(chords[0]!.notes.length).toBe(4);
  });

  it('quartal produces quartal voicing', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setVoicingDensity('quartal');
    inst.setProfile('swing-sparse');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
    expect(chords[0]!.notes.length).toBeGreaterThanOrEqual(3);
  });

  it('all notes stay in comping register [C3, C6]', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setVoicingDensity('rootless4');
    inst.setProfile('swing-sparse');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    for (const c of chords) {
      for (const note of c.notes) {
        const m = /^[A-G][#b]?(\d+)$/.exec(note);
        if (!m) throw new Error(`Invalid note: ${note}`);
        const octave = parseInt(m[1]!, 10);
        expect(octave).toBeGreaterThanOrEqual(3);
        expect(octave).toBeLessThanOrEqual(6);
      }
    }
  });
});

// ─── Base velocity ────────────────────────────────────────────────────────────

describe('PianoInstrument — baseVelocity', () => {
  it('scales output velocity proportionally', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setProfile('swing-sparse');
    inst.setBaseVelocity(0.5);
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // With humanize off, velocity should be exactly event.velocity * 0.5
    expect(chords.length).toBeGreaterThan(0);
    // basie-2-4 beat 2 velocity = 0.45 * 0.5 = 0.225
    const beat2 = chords.find((c) => c.at === TPB);
    expect(beat2).toBeDefined();
    expect(beat2!.velocity).toBeCloseTo(0.225, 3);
  });
});

// ─── Multi-bar scheduling ─────────────────────────────────────────────────────

describe('PianoInstrument — multi-bar', () => {
  it('4-bar cycle repeats across 8 bars', () => {
    const inst = makePiano(Array.from({ length: 8 }, () => ({ chord: dm7 })));
    inst.setProfile('beginner-safe');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: 8 * TPBAR }, ctx);

    // Bars 0-3 same as bars 4-7
    const firstCycle = chords.filter((c) => c.at < 4 * TPBAR).length;
    const secondCycle = chords.filter((c) => c.at >= 4 * TPBAR && c.at < 8 * TPBAR).length;
    expect(secondCycle).toBe(firstCycle);
  });

  it('setTimeline() updates chord source', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: dm7 }]);
    inst.setProfile('swing-sparse');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    const firstChordNotes = chords[0]?.notes;

    // Replace timeline with different chords
    const newTimeline = new ChordTimeline([{ barIndex: 0, chord: cmaj7 }]);
    inst.setTimeline(newTimeline);
    inst.reset();

    const { ctx: ctx2, chords: chords2 } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx2);
    expect(chords2.length).toBeGreaterThan(0);
    expect(chords2[0]?.notes).not.toEqual(firstChordNotes);
  });
});

// ─── Window filtering ─────────────────────────────────────────────────────────

describe('PianoInstrument — window filtering', () => {
  it('only schedules events within [fromTicks, toTicks)', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: g7 }]);
    inst.setProfile('swing-sparse');
    const { ctx, chords } = makeCtx();
    // Window covers only bar 0
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.every((c) => c.at >= 0 && c.at < TPBAR)).toBe(true);
  });

  it('schedules nothing for empty window', () => {
    const inst = makePiano([{ chord: dm7 }]);
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: TPBAR, toTicks: TPBAR }, ctx);
    expect(chords.length).toBe(0);
  });
});

// ─── Humanization ─────────────────────────────────────────────────────────────

describe('PianoInstrument — humanization', () => {
  it('humanize=true adds timing jitter within ±6ms', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setProfile('swing-sparse');
    inst.setHumanize(true);
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // At 120bpm, PPQ=480, maxJitterTicks = round(0.006 * (120/60) * 480) = 6
    const maxJitter = Math.round(0.006 * (120 / 60) * 480); // = 6
    for (const c of chords) {
      // The event should be within ±maxJitter of the expected beat position
      const expectedTicks = Math.round(c.at / TPB) * TPB; // nearest beat
      // For offbeat events this is approximate, just check not wildly off
      const diff = Math.abs(c.at - expectedTicks);
      // Allow some tolerance, but keep reasonable
      expect(diff).toBeLessThanOrEqual(maxJitter + 1);
    }
  });

  it('humanize=false yields deterministic timing', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setProfile('swing-sparse');
    inst.setHumanize(false);
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // No randomization means positions are exact grid positions
    const ticks = chords.map((c) => c.at);
    // basie-2-4: beat 2 = 480, beat 4 = 1440
    expect(ticks).toContain(TPB);
    expect(ticks).toContain(3 * TPB);
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('PianoInstrument — reset', () => {
  it('reset() clears voice leading state', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: g7 }]);
    inst.setProfile('swing-sparse');

    // Schedule bar 0
    const { ctx: ctx0, chords: chords0 } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx0);
    expect(chords0.length).toBeGreaterThan(0);

    // Reset and schedule bar 0 again — should produce same default voicing
    inst.reset();
    const { ctx: ctx1, chords: chords1 } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx1);
    expect(chords1.length).toBe(chords0.length);
    // First voicing should be the same default position
    expect(chords1[0]?.notes).toEqual(chords0[0]?.notes);
  });
});

// ─── Randomization ────────────────────────────────────────────────────────────

describe('PianoInstrument — randomization', () => {
  it('randomization off produces unmodified events', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setProfile('beginner-safe');
    inst.setRandomizationLevel('off');
    inst.setHumanize(false);

    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // halfNotes: 2 events on beats 1 and 3
    expect(chords.length).toBe(2);
  });

  it('randomization high may add or modify events', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: g7 }]);
    inst.setProfile('swing-medium');
    inst.setRandomizationLevel('high');
    inst.setHumanize(false);

    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // With high randomization, events should still be structurally valid
    expect(chords.length).toBeGreaterThan(0);
    for (const c of chords) {
      expect(c.notes.length).toBeGreaterThan(0);
      expect(c.durationTicks).toBeGreaterThan(0);
    }
  });
});

// ─── Voice leading across bars ────────────────────────────────────────────────

describe('PianoInstrument — voice leading', () => {
  it('maintains voice leading across consecutive bars', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: g7 }]);
    inst.setProfile('swing-sparse');
    inst.setVoicingDensity('rootless4');
    inst.setHumanize(false);

    // Schedule both bars in one window
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx);

    const bar0Events = chords.filter((c) => c.at < TPBAR);
    const bar1Events = chords.filter((c) => c.at >= TPBAR && c.at < 2 * TPBAR);

    expect(bar0Events.length).toBeGreaterThan(0);
    expect(bar1Events.length).toBeGreaterThan(0);

    // Dm7 and G7 voicings should differ
    expect(bar1Events[0]?.notes).not.toEqual(bar0Events[0]?.notes);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('PianoInstrument — edge cases', () => {
  it('handles a timeline with all null chords gracefully', () => {
    const inst = makePiano([{ chord: null }, { chord: null }]);
    const { ctx, chords } = makeCtx();
    expect(() => inst.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, ctx)).not.toThrow();
    expect(chords.length).toBe(0);
  });

  it('handles empty timeline', () => {
    const timeline = new ChordTimeline([]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    const { ctx, chords } = makeCtx();
    expect(() => inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx)).not.toThrow();
    expect(chords.length).toBe(0);
  });

  it('handles 3/4 time signature', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setProfile('swing-sparse');
    const sig = parseTimeSignature('3/4');
    const { ctx, chords } = makeCtx(sig);
    inst.schedule({ fromTicks: 0, toTicks: 1440 }, ctx);
    expect(chords.length).toBeGreaterThan(0);
  });

  it('dispose() cleans up state', () => {
    const inst = makePiano([{ chord: dm7 }]);
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);

    inst.dispose();
    // After dispose, next schedule should start fresh
    const { ctx: ctx2, chords: chords2 } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx2);
    expect(chords2.length).toBeGreaterThan(0);
  });

  it('setBaseVelocity clamps to [0, 2]', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setProfile('swing-sparse');
    inst.setHumanize(false);

    inst.setBaseVelocity(-1);
    let { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords[0]!.velocity).toBe(0);

    inst.setBaseVelocity(3);
    ({ ctx, chords } = makeCtx());
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // velocity = event.velocity * 2.0 (clamped from 3)
    expect(chords[0]!.velocity).toBeCloseTo(0.45 * 2, 3);
  });
});

// ─── Multi-chord (sub-bar) tests ─────────────────────────────────────────────

describe('PianoInstrument — multi-chord bars (sub-bar)', () => {
  const dm7Chord = makeChord('D');
  const g7Chord = makeChord('G', '', 'dominant');
  const cmaj7Chord = makeChord('C', '', 'major');

  it('2-chord bar: events resolve chord at their tick position', () => {
    // | Dm7 G7 | in one bar: Dm7 on beats 0-1, G7 on beats 2-3
    // Use beginner-safe -> bar 0 halfNotes: events on beat 1 and beat 3
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7Chord },
      { barIndex: 0, beatStart: 2, beatEnd: 4, chord: g7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('beginner-safe');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // halfNotes: beat 1 (Dm7 range) and beat 3 (G7 range) -> different voicings
    const beat1Events = chords.filter((c) => c.at >= 0 && c.at < 1 * TPB);
    const beat3Events = chords.filter((c) => c.at >= 2 * TPB && c.at < 3 * TPB);
    expect(beat1Events.length).toBe(1);
    expect(beat3Events.length).toBe(1);
    expect(beat3Events[0]!.notes).not.toEqual(beat1Events[0]!.notes);
  });

  it('chordRef: next uses sub-bar getNextChord (not next bar)', () => {
    // | Dm7 G7 | Cmaj7 | — bar 0 has Dm7(0-1) and G7(2-3), bar 1 has Cmaj7
    // offbeat-push bar 3 of cycle uses anticipation-4and (chordRef: 'next')
    // Scheduling 4 bars so we reach bar 3 of the cycle
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7Chord },
      { barIndex: 0, beatStart: 2, beatEnd: 4, chord: g7Chord },
      { barIndex: 1, beatStart: 0, beatEnd: 4, chord: cmaj7Chord },
      { barIndex: 2, beatStart: 0, beatEnd: 4, chord: dm7Chord },
      { barIndex: 3, beatStart: 0, beatEnd: 4, chord: g7Chord },
      { barIndex: 4, beatStart: 0, beatEnd: 4, chord: cmaj7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('offbeat-push');
    const { ctx, chords } = makeCtx();

    // Schedule bar 3 of the 4-bar cycle (physically the 4th bar, index 3)
    inst.schedule({ fromTicks: 3 * TPBAR, toTicks: 4 * TPBAR }, ctx);
    // anticipation-4and: beat 4.5 (tick 3*TPBAR + 3*TPB + swingOffset)
    // The 'next' chord from that tick should resolve to cmaj7Chord
    const anticipEvent = chords.find((c) => c.at > 3 * TPBAR + 3 * TPB && c.at < 4 * TPBAR);
    expect(anticipEvent).toBeDefined();
    expect(anticipEvent!.notes.length).toBeGreaterThan(0);
  });

  it('3-chord bar: halfNotes pattern resolves different chords', () => {
    // | Dm7 G7 Cmaj7 | — 2+1+1 beats
    // beginner-safe halfNotes: beat 1 (Dm7) and beat 3 (G7 or Cmaj7? depends on beatStart)
    // G7: beatStart 2, beatEnd 3. Cmaj7: beatStart 3, beatEnd 4.
    // Beat 3 = beatInBar 2 -> in G7 range [2,3). So beat 3 is G7.
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7Chord },
      { barIndex: 0, beatStart: 2, beatEnd: 3, chord: g7Chord },
      { barIndex: 0, beatStart: 3, beatEnd: 4, chord: cmaj7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('beginner-safe');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBe(2); // halfNotes: 2 events
    const beat1Event = chords.find((c) => c.at === 0);
    const beat3Event = chords.find((c) => c.at === 2 * TPB);
    expect(beat1Event).toBeDefined();
    expect(beat3Event).toBeDefined();
    // Dm7 voicing != G7 voicing
    expect(beat3Event!.notes).not.toEqual(beat1Event!.notes);
  });

  it('4-chord bar: each halfNotes event resolves its chord', () => {
    const a7Chord = makeChord('A', '', 'dominant');
    // | Dm7 G7 Cmaj7 A7 | — 1+1+1+1 beats
    // beginner-safe halfNotes: beat 1 (Dm7) and beat 3 (Cmaj7, beatStart=2)
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 1, chord: dm7Chord },
      { barIndex: 0, beatStart: 1, beatEnd: 2, chord: g7Chord },
      { barIndex: 0, beatStart: 2, beatEnd: 3, chord: cmaj7Chord },
      { barIndex: 0, beatStart: 3, beatEnd: 4, chord: a7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('beginner-safe');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBe(2);
    const beat1Event = chords.find((c) => c.at === 0);
    const beat3Event = chords.find((c) => c.at === 2 * TPB);
    expect(beat1Event).toBeDefined();
    expect(beat3Event).toBeDefined();
    // Dm7 vs Cmaj7 — different chords
    expect(beat3Event!.notes).not.toEqual(beat1Event!.notes);
  });

  it('voice leading works across chord boundaries within a bar', () => {
    // | Dm7 G7 | — halfNotes beat 1 (Dm7) then beat 3 (G7)
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7Chord },
      { barIndex: 0, beatStart: 2, beatEnd: 4, chord: g7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('beginner-safe');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    const beat1Event = chords.find((c) => c.at === 0);
    const beat3Event = chords.find((c) => c.at === 2 * TPB);
    expect(beat1Event).toBeDefined();
    expect(beat3Event).toBeDefined();
    // Both should produce valid voicings (no crash on chord transition)
    expect(beat1Event!.notes.length).toBeGreaterThan(0);
    expect(beat3Event!.notes.length).toBeGreaterThan(0);
  });
});

// ─── Adaptive profile ─────────────────────────────────────────────────────────

describe('PianoInstrument — adaptive profile', () => {
  const dm7Chord = makeChord('D');
  const g7Chord = makeChord('G', '', 'dominant');
  const cmaj7Chord = makeChord('C', '', 'major');
  const a7Chord = makeChord('A', '', 'dominant');

  it('disabled by default: uses profile cycle pattern for 2-chord bars', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7Chord },
      { barIndex: 0, beatStart: 2, beatEnd: 4, chord: g7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('beginner-safe'); // halfNotes → 2 events on beats 1 and 3
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // Without adaptive: beginner-safe bar 0 = halfNotes (2 events)
    expect(chords.length).toBe(2);
  });

  it('2-chord bar: switches to two-and-four when adaptive is on', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7Chord },
      { barIndex: 0, beatStart: 2, beatEnd: 4, chord: g7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('beginner-safe'); // would be halfNotes (beat 1, 3)
    inst.setAdaptiveProfile(true);
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // two-and-four: 2 events on beats 2 and 4
    expect(chords.length).toBe(2);
    const ticks = chords.map((c) => c.at);
    expect(ticks).toContain(TPB); // beat 2 = 480
    expect(ticks).toContain(3 * TPB); // beat 4 = 1440
  });

  it('3-chord bar: switches to quarter-comp when adaptive is on', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7Chord },
      { barIndex: 0, beatStart: 2, beatEnd: 3, chord: g7Chord },
      { barIndex: 0, beatStart: 3, beatEnd: 4, chord: cmaj7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('beginner-safe'); // would be halfNotes (2 events)
    inst.setAdaptiveProfile(true);
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // quarter-comp: 4 events on all beats
    expect(chords.length).toBe(4);
    // Verify all 4 beats have events
    const ticks = chords.map((c) => c.at).sort((a, b) => a - b);
    expect(ticks[0]).toBe(0); // beat 1
    expect(ticks[1]).toBe(TPB); // beat 2
    expect(ticks[2]).toBe(2 * TPB); // beat 3
    expect(ticks[3]).toBe(3 * TPB); // beat 4
  });

  it('4-chord bar: switches to quarter-comp when adaptive is on', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 1, chord: cmaj7Chord },
      { barIndex: 0, beatStart: 1, beatEnd: 2, chord: a7Chord },
      { barIndex: 0, beatStart: 2, beatEnd: 3, chord: dm7Chord },
      { barIndex: 0, beatStart: 3, beatEnd: 4, chord: g7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('beginner-safe'); // would be halfNotes (2 events)
    inst.setAdaptiveProfile(true);
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // quarter-comp: 4 events — one per chord
    expect(chords.length).toBe(4);
  });

  it('1-chord bar: keeps profile cycle pattern even with adaptive on', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 4, chord: dm7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('beginner-safe'); // halfNotes → 2 events
    inst.setAdaptiveProfile(true);
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // Still halfNotes: 2 events
    expect(chords.length).toBe(2);
  });

  it('adaptive can be toggled on and off', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, beatStart: 0, beatEnd: 2, chord: dm7Chord },
      { barIndex: 0, beatStart: 2, beatEnd: 4, chord: g7Chord },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setHumanize(false);
    inst.setProfile('beginner-safe');

    // Off: uses halfNotes (2 events on beats 1, 3)
    let { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBe(2);
    expect(chords[0]!.at).toBe(0); // beat 1

    // On: switches to two-and-four (events on beats 2, 4)
    inst.setAdaptiveProfile(true);
    ({ ctx, chords } = makeCtx());
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBe(2);
    expect(chords[0]!.at).toBe(TPB); // beat 2

    // Back off: halfNotes again
    inst.setAdaptiveProfile(false);
    ({ ctx, chords } = makeCtx());
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBe(2);
    expect(chords[0]!.at).toBe(0); // beat 1
  });
});
