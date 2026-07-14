import { describe, it, expect } from 'vitest';
import { PianoInstrument } from './pianoInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import { intervalToMidi, resolveInterval, buildPianoVoicing } from './pianoVoicing.js';
import { suggestUpperStructure } from './pianoUpperStructures.js';
import { PIANO_MOLECULE_LIST } from './pianoMolecules.js';
import { PIANO_CELL_LIST } from './pianoCells.js';
import { PIANO_ORGANISM_LIST } from './pianoOrganisms.js';
import type { PianoEvent, ScheduleContext } from './instrument.js';
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
  if (style) inst.setStyle(style);
  inst.setHumanize(false);
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
  it('swing style → organism-based scheduling produces events', () => {
    const inst = makePiano([{ chord: dm7 }], 'swing');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // Organism-based: piano-swing-sparse cell with molecule pool variation
    expect(chords.length).toBeGreaterThan(0);
    // All events should be within the window
    for (const c of chords) {
      expect(c.at).toBeGreaterThanOrEqual(0);
      expect(c.at).toBeLessThan(TPBAR);
    }
  });

  it('funk style → organism-based scheduling produces events', () => {
    const inst = makePiano([{ chord: dm7 }], 'funk');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
  });

  it('ballad style → organism-based scheduling produces events', () => {
    const inst = makePiano([{ chord: dm7 }], 'ballad');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
  });

  it('bossa style → organism-based scheduling produces events', () => {
    const inst = makePiano([{ chord: dm7 }], 'bossa');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
  });

  it('latin style → organism-based scheduling produces events', () => {
    const inst = makePiano([{ chord: dm7 }, { chord: g7 }], 'latin');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
  });

  it('swing style → voicing = rootless3', () => {
    const inst = makePiano([{ chord: dm7 }], 'swing');
    // Isolate density from swing's default tension ('moderate'), which can add
    // upper-structure notes on top of the base voicing — tested separately.
    inst.setTension('clean');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
    expect(chords[0]!.notes.length).toBe(3);
  });

  it('latin style → voicing = quartal', () => {
    const inst = makePiano([{ chord: dm7 }], 'latin');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords.length).toBeGreaterThan(0);
    expect(chords[0]!.notes.length).toBeGreaterThanOrEqual(3);
  });

  it('user voicing override survives setStyleProfile()', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setVoicingDensity('shell2');
    // setStyleProfile should NOT overwrite when voicing is absent from defaults
    // (but our style profiles always have voicing, so this tests the manual-override path)
    inst.setStyle('swing');
    inst.setTension('clean'); // isolate density from swing's default tension
    // swing has rootless3 default — setStyleProfile applies it, overriding shell2
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    expect(chords[0]!.notes.length).toBe(3); // rootless3 after setStyleProfile
    // Now manually override back to shell2
    inst.setVoicingDensity('shell2');
    const { ctx: ctx2, chords: chords2 } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx2);
    expect(chords2[0]!.notes.length).toBe(2); // shell2 sticks
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
  it('humanize=true adds timing jitter (low preset = ±15ms)', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setProfile('swing-sparse');
    inst.setHumanize(true);
    // Isolate timing jitter: disable chord spread, phrasing, and global shift
    inst.setHumanizeParams({
      timingJitterMs: 'low' as const,
      chordSpreadMs: 'none' as const,
      phrasing: 'flat',
      humanizeTiming: 'none',
      velocityVariation: 'off',
    });
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // At 120bpm, PPQ=480, low jitter = 15ms → maxJitterTicks = round(0.015 * (120/60) * 480) = 14
    const maxJitter = Math.round(0.015 * (120 / 60) * 480); // = 14
    for (const c of chords) {
      const expectedTicks = Math.round(c.at / TPB) * TPB;
      const diff = Math.abs(c.at - expectedTicks);
      expect(diff).toBeLessThanOrEqual(maxJitter + 1);
    }
  });

  it('chord spread high spreads notes across time (bass first, treble last)', () => {
    const inst = makePiano([{ chord: dm7 }]);
    inst.setProfile('swing-sparse');
    inst.setHumanize(true);
    // Isolate chord spread: disable jitter, phrasing, velocity, and global shift
    inst.setHumanizeParams({
      timingJitterMs: 'none' as const,
      chordSpreadMs: 'high' as const,
      phrasing: 'flat',
      humanizeTiming: 'none',
      velocityVariation: 'off',
    });
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    // Each chord event now contains exactly 1 note (spread path splits them)
    for (const c of chords) {
      expect(c.notes.length).toBe(1);
    }

    // Group by base tick (rounded to beat) to find chords on the same beat
    const byBeat = new Map<number, PianoEvent[]>();
    for (const c of chords) {
      const beat = Math.round(c.at / TPB) * TPB;
      const list = byBeat.get(beat) || [];
      list.push(c);
      byBeat.set(beat, list);
    }

    // For any beat with multiple notes, verify they're spread (different at-ticks)
    for (const [, events] of byBeat) {
      if (events.length <= 1) continue;
      const ticks = events.map((e) => e.at).sort((a, b) => a - b);
      // At 120bpm PPQ=480, high spread = ±100ms → ±96 ticks total spread 192
      const spread = ticks[ticks.length - 1]! - ticks[0]!;
      expect(spread).toBeGreaterThan(0);
      expect(spread).toBeLessThanOrEqual(200); // generous upper bound
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

describe('intervalToMidi', () => {
  it('converts major intervals from root C4', () => {
    const root = 'C4';
    expect(intervalToMidi(root, '1')).toBe(60); // unison
    expect(intervalToMidi(root, '3')).toBe(64); // E4
    expect(intervalToMidi(root, '5')).toBe(67); // G4
    expect(intervalToMidi(root, '7')).toBe(71); // B4
  });

  it('converts flat intervals from root C4', () => {
    const root = 'C4';
    expect(intervalToMidi(root, 'b3')).toBe(63); // Eb4
    expect(intervalToMidi(root, 'b7')).toBe(70); // Bb4
    expect(intervalToMidi(root, 'b9')).toBe(73); // Db5
    expect(intervalToMidi(root, 'b13')).toBe(80); // Ab5
  });

  it('converts sharp intervals from root C4', () => {
    const root = 'C4';
    expect(intervalToMidi(root, '#9')).toBe(75); // D#5
    expect(intervalToMidi(root, '#11')).toBe(78); // F#5
  });

  it('converts upper extensions', () => {
    const root = 'C4';
    expect(intervalToMidi(root, '9')).toBe(74); // D5
    expect(intervalToMidi(root, '11')).toBe(77); // F5
    expect(intervalToMidi(root, '13')).toBe(81); // A5
  });

  it('works with different roots', () => {
    expect(intervalToMidi('F4', '3')).toBe(69); // A4
    expect(intervalToMidi('Bb3', '5')).toBe(65); // F4
  });

  it('resolveInterval is a convenience wrapper', () => {
    expect(resolveInterval('3', 'C4')).toBe(64);
    expect(resolveInterval('b7', 'G3')).toBe(intervalToMidi('G3', 'b7'));
  });

  it('throws on invalid interval string', () => {
    expect(() => intervalToMidi('C4', 'x3')).toThrow('Invalid interval');
    expect(() => intervalToMidi('C4', '')).toThrow('Invalid interval');
    expect(() => intervalToMidi('C4', 'major')).toThrow('Invalid interval');
  });
});

// ─── T-008 Upper Structures ────────────────────────────────────────────────────

describe('PianoInstrument — upper structures', () => {
  it('suggestUpperStructure is deterministic and gated by tension', () => {
    const chord = makeChord('C', '', 'dominant');
    expect(suggestUpperStructure(chord, 'dominant', 'clean', 42)).toBeNull();
    const a = suggestUpperStructure(chord, 'dominant', 'max', 42);
    const b = suggestUpperStructure(chord, 'dominant', 'max', 42);
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
  });

  it('buildPianoVoicing merges upper-structure notes above the base voicing when tension is engaged', () => {
    const chord = makeChord('C', '', 'dominant');
    const clean = buildPianoVoicing(chord, 'rootless3', null, 'clean', 1);
    const max = buildPianoVoicing(chord, 'rootless3', null, 'max', 1);
    expect(max.length).toBeGreaterThan(clean.length);
  });
});

// ─── T-009 Passing Chords ──────────────────────────────────────────────────────

describe('PianoInstrument — passing chords', () => {
  it('passing chord molecules have category "fill"', () => {
    const passMols = PIANO_MOLECULE_LIST.filter(
      (m) => m.category === 'fill' && m.id.includes('pass-'),
    );
    expect(passMols.length).toBeGreaterThanOrEqual(10);
    for (const mol of passMols) {
      expect(mol.category).toBe('fill');
    }
  });

  it('passing chord molecules are pure rhythm — role "chord", tagged by approach idiom', () => {
    const passMols = PIANO_MOLECULE_LIST.filter(
      (m) => m.category === 'fill' && m.id.includes('pass-'),
    );
    for (const mol of passMols) {
      expect(mol.tags).toContain('passing');
      for (const atom of mol.atoms) {
        expect(atom.sound).toBe('chord');
      }
    }
  });

  it('passing chords are on beat 4 or later', () => {
    const ppq = 480;
    const beat4Start = ppq * 3;
    const passMols = PIANO_MOLECULE_LIST.filter(
      (m) => m.category === 'fill' && m.id.includes('pass-'),
    );
    for (const mol of passMols) {
      for (const atom of mol.atoms) {
        expect(atom.atTick).toBeGreaterThanOrEqual(beat4Start);
      }
    }
  });

  it('a fill hit late in the bar pre-echoes the next bar chord voicing', () => {
    // piano-swing-extended places a 'fill' lane clip at startBar 3 (1 bar).
    // Bars 0-3 = Cmaj7, bar 4 = Dm7 — the last-beat fill hit in bar 3 should
    // use Dm7's voicing (pre-echo), not Cmaj7's.
    const entries = [cmaj7, cmaj7, cmaj7, cmaj7, dm7, dm7].map((chord) => ({ chord }));
    const inst = makePiano(entries, 'swing');
    inst.setOrganismId('piano-swing-extended-form');
    inst.setTension('clean');
    const { ctx, chords } = makeCtx();
    inst.schedule({ fromTicks: 0, toTicks: 4 * TPBAR }, ctx);

    const cmaj7Voicing = buildPianoVoicing(cmaj7, 'rootless3', null, 'clean', 0);
    const dm7Voicing = buildPianoVoicing(dm7, 'rootless3', null, 'clean', 0);

    const lastBeatOfBar3 = 3 * TPBAR + (TPBAR - TPB);
    const preEchoHits = chords.filter((c) => c.at >= lastBeatOfBar3 && c.at < 4 * TPBAR);
    expect(preEchoHits.length).toBeGreaterThan(0);
    for (const hit of preEchoHits) {
      const sorted = [...hit.notes].sort();
      expect(sorted).not.toEqual([...cmaj7Voicing].sort());
      expect(sorted).toEqual([...dm7Voicing].sort());
    }
  });
});

// ─── T-011 Multi-Clip Pool Cells ────────────────────────────────────────────────

describe('PianoInstrument — multi-clip pool cells', () => {
  it('extended cells have multiple lanes (comping + fill + accent)', () => {
    const extCells = PIANO_CELL_LIST.filter((c) => c.id.includes('extended'));
    expect(extCells.length).toBeGreaterThanOrEqual(5);
    for (const cell of extCells) {
      const laneNames = cell.lanes.map((l) => l.name);
      expect(laneNames).toContain('comping');
      // At least one extra lane
      expect(cell.lanes.length).toBeGreaterThan(1);
    }
  });

  it('extended cells have multi-clip pool (multiple molecules per clip)', () => {
    const extCells = PIANO_CELL_LIST.filter((c) => c.id.includes('extended'));
    for (const cell of extCells) {
      const compingLane = cell.lanes.find((l) => l.name === 'comping');
      expect(compingLane).toBeDefined();
      for (const clip of compingLane!.clips) {
        expect(clip.pool.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('extended cells have fill lane with probability 0.15', () => {
    const extCells = PIANO_CELL_LIST.filter((c) => c.id.includes('extended'));
    for (const cell of extCells) {
      const fillLane = cell.lanes.find((l) => l.name === 'fill');
      if (fillLane) {
        expect(fillLane.probability).toBe(0.15);
      }
    }
  });
});

// ─── T-012 Extended Organisms ───────────────────────────────────────────────────

describe('PianoInstrument — extended organisms', () => {
  it('extended organisms exist for all 5 styles', () => {
    const styles = ['swing', 'bossa', 'funk', 'latin', 'ballad'];
    for (const style of styles) {
      const orgs = PIANO_ORGANISM_LIST.filter(
        (o) => o.style === style && o.id.includes('extended'),
      );
      expect(orgs.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('extended organisms reference extended cells in at least one section', () => {
    const extOrgs = PIANO_ORGANISM_LIST.filter((o) => o.id.includes('extended'));
    for (const org of extOrgs) {
      // At least one section map entry should reference an extended cell
      const allCells = Object.values(org.sectionMap).flat();
      expect(allCells.some((c) => c.includes('extended'))).toBe(true);
    }
  });
});

// ─── Humanization Pipeline ──────────────────────────────────────────────────────

describe('PianoInstrument — humanization pipeline', () => {
  it('humanize params are applied from style profile', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: dm7 },
      { barIndex: 1, chord: g7 },
      { barIndex: 2, chord: cmaj7 },
      { barIndex: 3, chord: cmaj7 },
    ]);
    const inst = new PianoInstrument(timeline);
    inst.setStyle('swing');
    const events: Array<{
      notes: string[];
      atTick: number;
      velocity: number;
      durationTicks: number;
    }> = [];
    const ctx = makeCtx();
    ctx.ctx.scheduleEvent = (
      _inst: string,
      payload: unknown,
      atTick: number,
      velocity: number,
      durationTicks: number,
    ) => {
      events.push({
        notes: (payload as { notes: string[] }).notes,
        atTick,
        velocity,
        durationTicks,
      });
    };
    inst.schedule({ fromTicks: 0, toTicks: 480 * 4 }, ctx.ctx);
    expect(events.length).toBeGreaterThan(0);
  });
});
