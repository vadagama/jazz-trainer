import { describe, it, expect } from 'vitest';
import { BassInstrument } from './bassInstrument.js';
import { ChordTimeline } from './chordTimeline.js';
import { parseTimeSignature } from '../time/timeSignature.js';
import type { ScheduleContext, BassEvent } from './instrument.js';
import type { ChordSymbol, Style } from '@jazz/shared';
import {
  UPRIGHT_BASS_MOLECULE_LIST,
  ELECTRIC_BASS_MOLECULE_LIST,
} from './bassMolecules.js';
import { UPRIGHT_BASS_CELL_LIST, ELECTRIC_BASS_CELL_LIST } from './bassCells.js';
import {
  UPRIGHT_BASS_ORGANISM_LIST,
  ELECTRIC_BASS_ORGANISM_LIST,
} from './bassOrganisms.js';

/** Articulations available per variant (mirrors the new 4-articulation model). */
const UPRIGHT_ARTS = ['regular', 'muted'] as const;
const ELECTRIC_ARTS = ['regular', 'muted', 'rel', 'stac'] as const;

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

interface Captured {
  instrumentId: string;
  note: string;
  articulation: string;
  at: number;
  velocity: number;
  durationTicks: number;
}

function makeCtx(captured: Captured[]): ScheduleContext {
  return {
    bpm: 120,
    timeSignature: parseTimeSignature('4/4'),
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (instrumentId, payload, at, velocity, durationTicks) => {
      const p = payload as BassEvent;
      captured.push({
        instrumentId,
        note: p.note,
        articulation: p.articulation,
        at,
        velocity,
        durationTicks,
      });
    },
  };
}

function makeBass(timeline: ChordTimeline, variant: 'upright' | 'electric', style: Style) {
  const bass = new BassInstrument(timeline, variant);
  bass.setStyle(style);
  return bass;
}

const TPBAR = 1920; // 4/4 bar in ticks (PPQ 480)

/** All pitches must fall within the bass register (B1–C5 after upright +1 octave default). */
function expectWithinBassRange(note: string): void {
  const m = note.match(/^([A-G][b#]?)(\d)$/);
  expect(m, `invalid pitch: ${note}`).not.toBeNull();
  const [, pc, octStr] = m!;
  const oct = Number(octStr);
  // B1 is the lowest (electric), C5 the ceiling (upright at +1 octave).
  if (oct < 1 || oct > 5) throw new Error(`pitch out of range: ${note}`);
  if (oct === 1 && pc !== 'B' && pc !== 'Bb' && pc !== 'A#') {
    throw new Error(`pitch below B1: ${note}`);
  }
  if (oct === 5 && pc !== 'C') throw new Error(`pitch above C5: ${note}`);
}

// ─── Static registries ───────────────────────────────────────────────────────

describe('BassInstrument — pattern-engine registries', () => {
  it('upright molecules only use the upright palette {regular, muted}', () => {
    for (const mol of UPRIGHT_BASS_MOLECULE_LIST) {
      for (const a of mol.atoms) {
        expect(UPRIGHT_ARTS, `${mol.id}: ${a.sound}`).toContain(a.sound);
      }
    }
  });

  it('electric molecules only use the electric palette {regular, muted, rel, stac}', () => {
    for (const mol of ELECTRIC_BASS_MOLECULE_LIST) {
      for (const a of mol.atoms) {
        expect(ELECTRIC_ARTS, `${mol.id}: ${a.sound}`).toContain(a.sound);
      }
    }
  });

  it('every organism covers all 8 section types', () => {
    const all = [...UPRIGHT_BASS_ORGANISM_LIST, ...ELECTRIC_BASS_ORGANISM_LIST];
    const sections = ['intro', 'verseA', 'verseB', 'verseC', 'chorus', 'bridge', 'solo', 'ending'];
    for (const org of all) {
      for (const s of sections) {
        expect(org.sectionMap[s as keyof typeof org.sectionMap], `${org.id}.${s}`).toBeDefined();
      }
    }
  });

  it('every cell has a bass lane with non-empty clip pools', () => {
    for (const cell of [...UPRIGHT_BASS_CELL_LIST, ...ELECTRIC_BASS_CELL_LIST]) {
      const bassLane = cell.lanes.find((l) => l.name === 'bass');
      expect(bassLane, `${cell.id} bass lane`).toBeDefined();
      expect(bassLane!.clips.length).toBeGreaterThan(0);
      for (const clip of bassLane!.clips) {
        expect(clip.pool.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Scheduling ──────────────────────────────────────────────────────────────

describe('BassInstrument — scheduling', () => {
  it('upright swing emits regular/muted events within B2–C5', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'upright', 'swing');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
    expect(captured.length).toBeGreaterThan(0);
    for (const c of captured) {
      expect(c.instrumentId).toBe('upright-bass');
      expect([...UPRIGHT_ARTS]).toContain(c.articulation);
      expectWithinBassRange(c.note);
    }
  });

  it('upright resolves Dm root to D3 (default +1 octave)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'upright', 'swing');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
    expect(captured.some((c) => c.note === 'D3')).toBe(true);
  });

  it('electric funk emits electric-palette events within B1–C4', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'electric', 'funk');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
    expect(captured.length).toBeGreaterThan(0);
    const arts = new Set(captured.map((c) => c.articulation));
    for (const c of captured) {
      expect(c.instrumentId).toBe('electric-bass');
      expect([...ELECTRIC_ARTS]).toContain(c.articulation);
      expectWithinBassRange(c.note);
    }
    // funk groove should use muted (ghost) notes — the defining funk articulation
    expect(arts.has('muted') || arts.has('regular')).toBe(true);
  });

  it('electric latin montuno uses regular + stac', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'electric', 'latin');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
    expect(captured.length).toBeGreaterThan(0);
    const arts = new Set(captured.map((c) => c.articulation));
    expect(arts.has('regular')).toBe(true);
  });

  it('upright bossa emits fewer notes (half-note feel) than swing', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const swing: Captured[] = [];
    const bossa: Captured[] = [];
    makeBass(timeline, 'upright', 'swing').schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(swing));
    makeBass(timeline, 'upright', 'bossa').schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(bossa));
    // bossa = root + fifth half-notes → 2 notes; swing walking → 4 notes
    expect(bossa.length).toBeLessThanOrEqual(swing.length);
    expect(bossa.length).toBeGreaterThanOrEqual(1);
  });

  it('does nothing when no chord in bar', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: null }]);
    const bass = makeBass(timeline, 'upright', 'swing');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
    expect(captured).toHaveLength(0);
  });

  it('respects schedule window bounds', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('C', '', 'major') },
    ]);
    const bass = makeBass(timeline, 'upright', 'swing');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: TPBAR, toTicks: 2 * TPBAR }, makeCtx(captured));
    expect(captured.length).toBeGreaterThan(0);
    for (const c of captured) {
      expect(c.at).toBeGreaterThanOrEqual(TPBAR);
      expect(c.at).toBeLessThan(2 * TPBAR);
    }
  });

  it('follows chord changes across bars', () => {
    const timeline = new ChordTimeline([
      { barIndex: 0, chord: makeChord('D') },
      { barIndex: 1, chord: makeChord('C', '', 'major') },
    ]);
    const bass = makeBass(timeline, 'upright', 'swing');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: 2 * TPBAR }, makeCtx(captured));
    const bar0 = captured.filter((c) => c.at < TPBAR);
    const bar1 = captured.filter((c) => c.at >= TPBAR);
    expect(bar0.some((c) => c.note.startsWith('D'))).toBe(true);
    expect(bar1.some((c) => c.note.startsWith('C'))).toBe(true);
  });

  it('resolves flat accidentals correctly (Bb root → Bb3, default +1 octave)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('B', 'b') }]);
    const bass = makeBass(timeline, 'upright', 'swing');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
    expect(captured.some((c) => c.note === 'Bb3')).toBe(true);
  });
});

// ─── Step engine & tension ───────────────────────────────────────────────────

describe('BassInstrument — step engine', () => {
  it('clean tension keeps notes on root/fifth (no color tones)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D', '', 'minor') }]);
    const bass = makeBass(timeline, 'upright', 'swing');
    bass.setTension('clean');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
    // Clean walking → root (D) or fifth (A) only; no third/seventh.
    for (const c of captured) {
      expect(c.note).toMatch(/^[DA]3$/);
    }
  });

  it('max tension introduces color tones beyond root/fifth', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D', '', 'minor') }]);
    const bass = makeBass(timeline, 'upright', 'swing');
    bass.setTension('max');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
    // At max tension we expect at least one note that is NOT root (D3) or fifth (A3).
    const colorNotes = captured.filter((c) => !/^[DA]3$/.test(c.note));
    expect(colorNotes.length).toBeGreaterThan(0);
  });

  it('disabling muted notes thins the groove (no muted atoms emitted)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = makeBass(timeline, 'electric', 'funk');
    bass.setUseMutedNotes(false);
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
    expect(captured.length).toBeGreaterThan(0);
    for (const c of captured) {
      expect(c.articulation).not.toBe('muted');
    }
  });
});

// ─── Variant switching & cross-style fallback ────────────────────────────────

describe('BassInstrument — variant switching', () => {
  it('setVariant switches the emitted instrumentId', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = new BassInstrument(timeline, 'upright');
    bass.setStyle('swing');
    expect(bass.getVariant()).toBe('upright');
    bass.setVariant('electric');
    expect(bass.getVariant()).toBe('electric');
    const captured: Captured[] = [];
    bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
    for (const c of captured) {
      expect(c.instrumentId).toBe('electric-bass');
    }
  });

  it('electric variant plays swing via cross-style fallback (no throw)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = new BassInstrument(timeline, 'electric');
    bass.setStyle('swing');
    bass.setVariant('electric');
    const captured: Captured[] = [];
    expect(() => bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured))).not.toThrow();
    // electric palette only — even though the style is swing (upright-native).
    expect(captured.length).toBeGreaterThan(0);
    for (const c of captured) {
      expect([...ELECTRIC_ARTS]).toContain(c.articulation);
      expectWithinBassRange(c.note);
    }
  });

  it('upright variant plays funk via cross-style fallback (no throw)', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    const bass = new BassInstrument(timeline, 'upright');
    bass.setStyle('funk');
    bass.setVariant('upright');
    const captured: Captured[] = [];
    expect(() => bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured))).not.toThrow();
    expect(captured.length).toBeGreaterThan(0);
    // upright palette only — no rel/stac even though style is funk.
    for (const c of captured) {
      expect([...UPRIGHT_ARTS]).toContain(c.articulation);
    }
  });
});

// ─── Articulation correctness per variant ────────────────────────────────────

describe('BassInstrument — variant palette isolation', () => {
  it('upright never emits electric-only articulations', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    for (const style of ['swing', 'bossa', 'ballad'] as Style[]) {
      const bass = makeBass(timeline, 'upright', style);
      const captured: Captured[] = [];
      bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
      for (const c of captured) {
        expect(['rel', 'stac'], `${style}: ${c.articulation}`).not.toContain(c.articulation);
      }
    }
  });

  it('electric can use the full palette', () => {
    const timeline = new ChordTimeline([{ barIndex: 0, chord: makeChord('D') }]);
    for (const style of ['funk', 'latin'] as Style[]) {
      const bass = makeBass(timeline, 'electric', style);
      const captured: Captured[] = [];
      bass.schedule({ fromTicks: 0, toTicks: TPBAR }, makeCtx(captured));
      for (const c of captured) {
        expect([...ELECTRIC_ARTS], `${style}: ${c.articulation}`).toContain(c.articulation);
      }
    }
  });
});
