import { describe, it, expect } from 'vitest';
import { RhodesInstrument } from './rhodesInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { buildVoicing, noteToMidi } from './rhodesVoicing.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext } from './instrument.js';
import type { ChordSymbol } from '@jazz/shared';

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

type ChordEvent = {
  at: number;
  notes: string[];
  velocity: number;
  durationTicks: number;
};

function makeCtx(sig = parseTimeSignature('4/4')): {
  ctx: ScheduleContext;
  chords: ChordEvent[];
} {
  const chords: ChordEvent[] = [];
  const ctx: ScheduleContext = {
    bpm: 120,
    timeSignature: sig,
    swingRatio: 0.50,
    scheduleClick: () => {},
    scheduleChord: (at, notes, velocity, durationTicks) =>
      chords.push({ at, notes: [...notes], velocity, durationTicks }),
  };
  return { ctx, chords };
}

function makeRhodes(entries: { chord: ChordSymbol | null }[]) {
  const timeline = new ChordTimeline(
    entries.map((e, i) => ({ barIndex: i, chord: e.chord })),
  );
  const inst = new RhodesInstrument(timeline);
  inst.setHumanize(false); // deterministic tests
  return inst;
}

const dm7   = makeChord('D', '', 'minor');
const g7    = makeChord('G', '', 'dominant');
const cmaj7 = makeChord('C', '', 'major');

const TPB  = 480;  // ticks per beat
const TPBAR = 1920; // ticks per bar (4/4)

// ─── Basic scheduling ─────────────────────────────────────────────────────────

describe('RhodesInstrument — wholeNotes', () => {
  it('schedules one chord per bar on beat 1', () => {
    const inst = makeRhodes([{ chord: dm7 }, { chord: g7 }, { chord: cmaj7 }]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR * 3 }, ctx);

    expect(chords).toHaveLength(3);
    expect(chords.map((c) => c.at)).toEqual([0, TPBAR, TPBAR * 2]);
  });

  it('first chord notes match default buildVoicing (Dm7 rootless3)', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]?.notes).toEqual(buildVoicing(dm7, 'rootless3', null));
  });

  it('duration = Math.round(3.6 × TPB)', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]?.durationTicks).toBe(Math.round(3.6 * TPB));
  });

  it('velocity = 0.54 × baseVelocity (default 1.0)', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]?.velocity).toBeCloseTo(0.54);
  });
});

describe('RhodesInstrument — halfNotes', () => {
  it('schedules two chords per bar (beats 1 and 3)', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('halfNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords).toHaveLength(2);
    expect(chords[0]?.at).toBe(0);
    expect(chords[1]?.at).toBe(2 * TPB); // beat 3
  });

  it('beat 1 duration = Math.round(1.65 × TPB)', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('halfNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]?.durationTicks).toBe(Math.round(1.65 * TPB));
  });

  it('beat 3 duration = Math.round(1.45 × TPB)', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('halfNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[1]?.durationTicks).toBe(Math.round(1.45 * TPB));
  });

  it('beat 1 louder than beat 3 (0.55 > 0.49)', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('halfNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]!.velocity).toBeGreaterThan(chords[1]!.velocity);
    expect(chords[0]?.velocity).toBeCloseTo(0.55);
    expect(chords[1]?.velocity).toBeCloseTo(0.49);
  });
});

describe('RhodesInstrument — quarterNotes', () => {
  it('schedules 4 chords per bar on beats 1–4', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('quarterNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords).toHaveLength(4);
    expect(chords.map((c) => c.at)).toEqual([0, TPB, 2 * TPB, 3 * TPB]);
  });

  it('velocities match spec: 0.53, 0.42, 0.50, 0.44', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('quarterNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords.map((c) => c.velocity)).toEqual(
      expect.arrayContaining([
        expect.closeTo(0.53, 2),
        expect.closeTo(0.42, 2),
        expect.closeTo(0.50, 2),
        expect.closeTo(0.44, 2),
      ]),
    );
  });
});

// ─── Window filtering ─────────────────────────────────────────────────────────

describe('RhodesInstrument — window filtering', () => {
  it('only schedules events within [fromTicks, toTicks)', () => {
    const inst = makeRhodes([{ chord: dm7 }, { chord: g7 }, { chord: cmaj7 }]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    // Window starts after bar 0 — should only see bars 1 and 2
    inst.schedule({ fromTicks: TPB, toTicks: TPBAR * 3 }, ctx);

    expect(chords.map((c) => c.at)).toEqual([TPBAR, TPBAR * 2]);
  });

  it('schedules nothing for an empty window', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 5000, toTicks: 5001 }, ctx);

    expect(chords).toHaveLength(0);
  });
});

// ─── Null chords / absent callback ───────────────────────────────────────────

describe('RhodesInstrument — null chord and missing callback', () => {
  it('skips bars with null chord', () => {
    const inst = makeRhodes([
      { chord: dm7 },
      { chord: null },
      { chord: cmaj7 },
    ]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR * 3 }, ctx);

    expect(chords).toHaveLength(2);
    expect(chords[0]?.at).toBe(0);
    expect(chords[1]?.at).toBe(TPBAR * 2);
  });

  it('does nothing when scheduleChord is absent', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    const ctx: ScheduleContext = {
      bpm: 120,
      timeSignature: parseTimeSignature('4/4'),
      swingRatio: 0.50,
      scheduleClick: () => {},
      // scheduleChord intentionally absent
    };
    expect(() => inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx)).not.toThrow();
  });
});

// ─── Voicing density ─────────────────────────────────────────────────────────

describe('RhodesInstrument — voicing density', () => {
  it('shell2 produces 2-note chords', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('wholeNotes');
    inst.setVoicingDensity('shell2');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]?.notes).toHaveLength(2);
  });

  it('rootless3 produces 3-note chords', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('wholeNotes');
    inst.setVoicingDensity('rootless3');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]?.notes).toHaveLength(3);
  });

  it('rootless4 produces 4-note chords', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('wholeNotes');
    inst.setVoicingDensity('rootless4');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]?.notes).toHaveLength(4);
  });

  it('all notes stay in [C3, C6] for rootless4 Dm7', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('wholeNotes');
    inst.setVoicingDensity('rootless4');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    for (const note of chords[0]!.notes) {
      expect(noteToMidi(note)).toBeGreaterThanOrEqual(48); // C3
      expect(noteToMidi(note)).toBeLessThanOrEqual(84);    // C6
    }
  });
});

// ─── baseVelocity scaling ─────────────────────────────────────────────────────

describe('RhodesInstrument — baseVelocity', () => {
  it('scales output velocity proportionally', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('wholeNotes');
    inst.setBaseVelocity(0.5); // half of 1.0
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]?.velocity).toBeCloseTo(0.54 * 0.5);
  });
});

// ─── Voice leading across windows ────────────────────────────────────────────

describe('RhodesInstrument — voice leading', () => {
  it('maintains prevVoicing across consecutive schedule() calls', () => {
    const inst = makeRhodes([{ chord: dm7 }, { chord: g7 }]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    // Schedule bar 0 and bar 1 in separate calls (simulates lookahead windows)
    inst.schedule({ fromTicks: 0,     toTicks: TPBAR     }, ctx);
    inst.schedule({ fromTicks: TPBAR, toTicks: TPBAR * 2 }, ctx);

    expect(chords).toHaveLength(2);
    const dm7Notes = chords[0]!.notes;
    const g7Notes  = chords[1]!.notes;

    // Voice-led G7 must have lower total movement than default
    const defaultG7 = buildVoicing(g7, 'rootless3', null);
    const distLed = dm7Notes
      .map((n, i) => Math.abs(noteToMidi(n) - noteToMidi(g7Notes[i]!)))
      .reduce((a, b) => a + b, 0);
    const distDef = dm7Notes
      .map((n, i) => Math.abs(noteToMidi(n) - noteToMidi(defaultG7[i]!)))
      .reduce((a, b) => a + b, 0);
    expect(distLed).toBeLessThanOrEqual(distDef);
  });

  it('reset() clears prevVoicing — next chord uses default position', () => {
    const inst = makeRhodes([{ chord: dm7 }, { chord: g7 }]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    // Warm up prevVoicing with bar 0
    inst.schedule({ fromTicks: 0,     toTicks: TPBAR     }, ctx);
    inst.reset();
    // Bar 1 should now use default voicing (no prevVoicing)
    inst.schedule({ fromTicks: TPBAR, toTicks: TPBAR * 2 }, ctx);

    const g7Default = buildVoicing(g7, 'rootless3', null);
    expect(chords[1]?.notes).toEqual(g7Default);
  });

  it('ii–V–I: Dm7→G7→Cmaj7 all notes stay in [C3, C6]', () => {
    const inst = makeRhodes([{ chord: dm7 }, { chord: g7 }, { chord: cmaj7 }]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR * 3 }, ctx);

    for (const event of chords) {
      for (const note of event.notes) {
        expect(noteToMidi(note)).toBeGreaterThanOrEqual(48);
        expect(noteToMidi(note)).toBeLessThanOrEqual(84);
      }
    }
  });
});

// ─── Multi-bar / multi-window ─────────────────────────────────────────────────

describe('RhodesInstrument — multi-bar', () => {
  it('halfNotes: 2 bars produce 4 chord events', () => {
    const inst = makeRhodes([{ chord: dm7 }, { chord: g7 }]);
    inst.setMode('halfNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR * 2 }, ctx);

    expect(chords).toHaveLength(4);
    expect(chords.map((c) => c.at)).toEqual([0, 960, 1920, 2880]);
  });

  it('quarterNotes: 2 bars produce 8 chord events', () => {
    const inst = makeRhodes([{ chord: dm7 }, { chord: g7 }]);
    inst.setMode('quarterNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR * 2 }, ctx);

    expect(chords).toHaveLength(8);
  });

  it('setTimeline() updates chord source mid-playback', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('wholeNotes');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
    // Swap timeline
    inst.setTimeline(new ChordTimeline([{ barIndex: 0, chord: g7 }]));
    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]?.notes).toEqual(buildVoicing(dm7, 'rootless3', null));
    expect(chords[1]?.notes).not.toEqual(chords[0]?.notes);
  });

  it('setMode accepts swing pattern id without throwing', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    expect(() => inst.setMode('charleston')).not.toThrow();
    expect(() => inst.setMode('anticipation-4and')).not.toThrow();
  });

  it('humanize jitter never pushes first note before window.fromTicks', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: dm7 }]);
    const inst = new RhodesInstrument(timeline);
    inst.setMode('wholeNotes');
    inst.setHumanize(true);

    for (let i = 0; i < 50; i++) {
      inst.reset();
      const { ctx, chords } = makeCtx();
      inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);
      expect(chords[0]?.at).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Swing patterns ───────────────────────────────────────────────────────────

describe('RhodesInstrument — swing patterns (subdivision)', () => {
  it('charleston: beat 1 at tick 0, beat 2& at tick 720', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('charleston');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords).toHaveLength(2);
    expect(chords[0]?.at).toBe(0);
    expect(chords[1]?.at).toBe(TPB + TPB / 2); // beat 2 & = 720
  });

  it('charleston: velocities 0.55 and 0.48', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('charleston');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords[0]?.velocity).toBeCloseTo(0.55);
    expect(chords[1]?.velocity).toBeCloseTo(0.48);
  });

  it('basie-2-4: schedules beats 2 and 4 (no subdivision)', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('basie-2-4');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords).toHaveLength(2);
    expect(chords[0]?.at).toBe(TPB);       // beat 2
    expect(chords[1]?.at).toBe(3 * TPB);   // beat 4
  });

  it('offbeat-2-4: beat 2& at 720, beat 4& at 1680', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('offbeat-2-4');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords).toHaveLength(2);
    expect(chords[0]?.at).toBe(TPB + TPB / 2);      // beat 2& = 720
    expect(chords[1]?.at).toBe(3 * TPB + TPB / 2);  // beat 4& = 1680
  });

  it('one-twoand-four: schedules 3 events per bar', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('one-twoand-four');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords).toHaveLength(3);
    expect(chords[0]?.at).toBe(0);               // beat 1
    expect(chords[1]?.at).toBe(TPB + TPB / 2);  // beat 2&
    expect(chords[2]?.at).toBe(3 * TPB);         // beat 4
  });

  it('twoand-only: one event per bar at beat 2&', () => {
    const inst = makeRhodes([{ chord: dm7 }]);
    inst.setMode('twoand-only');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords).toHaveLength(1);
    expect(chords[0]?.at).toBe(TPB + TPB / 2); // beat 2& = 720
  });
});

describe('RhodesInstrument — chordRef: next (anticipation)', () => {
  it('anticipation-4and: voices using next bar chord', () => {
    const inst = makeRhodes([{ chord: dm7 }, { chord: g7 }]);
    inst.setMode('anticipation-4and');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords).toHaveLength(1);
    expect(chords[0]?.at).toBe(3 * TPB + TPB / 2); // beat 4& = 1680
    expect(chords[0]?.notes).toEqual(buildVoicing(g7, 'rootless3', null));
  });

  it('anticipation-4and: skips event when next chord is null', () => {
    const inst = makeRhodes([{ chord: dm7 }]); // no bar 1
    inst.setMode('anticipation-4and');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords).toHaveLength(0);
  });

  it('four-and-sparse: voices using next bar chord at beat 4&', () => {
    const inst = makeRhodes([{ chord: dm7 }, { chord: cmaj7 }]);
    inst.setMode('four-and-sparse');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR }, ctx);

    expect(chords).toHaveLength(1);
    expect(chords[0]?.at).toBe(3 * TPB + TPB / 2); // beat 4& = 1680
    expect(chords[0]?.notes).toEqual(buildVoicing(cmaj7, 'rootless3', null));
  });

  it('anticipation-4and: voice leading carries into next bar after anticipation', () => {
    const inst = makeRhodes([{ chord: dm7 }, { chord: g7 }, { chord: cmaj7 }]);
    inst.setMode('anticipation-4and');
    const { ctx, chords } = makeCtx();

    inst.schedule({ fromTicks: 0, toTicks: TPBAR * 3 }, ctx);

    // 3 bars × 1 event each
    expect(chords).toHaveLength(2); // bar 2 has no next chord → skips
    // Bar 0 anticipates G7, bar 1 anticipates Cmaj7
    expect(chords[0]?.notes).toEqual(buildVoicing(g7, 'rootless3', null));
  });
});
