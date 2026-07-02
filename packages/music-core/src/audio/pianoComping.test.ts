import { describe, it, expect } from 'vitest';
import {
  getCompPattern,
  getCompingProfile,
  COMP_PATTERNS,
  COMPING_PROFILES,
  type CompPatternId,
  type CompingProfileId,
} from './pianoComping.js';

// ─── Pattern bricks ────────────────────────────────────────────────────────────

describe('montuno pattern', () => {
  const pattern = COMP_PATTERNS.montuno;

  it('has 4 events (dense syncopated Latin pattern)', () => {
    expect(pattern).toHaveLength(4);
  });

  it('hits on beats 1, 2-and, 3, and 4-and (offbeat accents)', () => {
    const beats = pattern.map((e) => ({ beat: e.beat, sub: e.subdivision }));
    expect(beats).toContainEqual({ beat: 1, sub: 0 }); // downbeat
    expect(beats).toContainEqual({ beat: 2, sub: 0.5 }); // offbeat accent
    expect(beats).toContainEqual({ beat: 3, sub: 0 }); // downbeat
    expect(beats).toContainEqual({ beat: 4, sub: 0.5 }); // anticipation offbeat
  });

  it('beat 4-and uses chordRef: next (anticipation)', () => {
    const last = pattern[3]!;
    expect(last.beat).toBe(4);
    expect(last.subdivision).toBe(0.5);
    expect(last.chordRef).toBe('next');
  });

  it('has higher velocity on downbeats than offbeats', () => {
    const beat1Vel = pattern[0]!.velocity;
    const beat3Vel = pattern[2]!.velocity;
    const offbeatVels = [pattern[1]!.velocity, pattern[3]!.velocity];
    expect(beat1Vel).toBeGreaterThan(Math.max(...offbeatVels));
    expect(beat3Vel).toBeGreaterThan(Math.max(...offbeatVels));
  });
});

describe('montuno-variant pattern', () => {
  const pattern = COMP_PATTERNS['montuno-variant'];

  it('has 3 events (sparser, starts on offbeat)', () => {
    expect(pattern).toHaveLength(3);
  });

  it('starts on beat 2-and (offbeat), no beat 1 hit', () => {
    expect(pattern[0]!.beat).toBe(2);
    expect(pattern[0]!.subdivision).toBe(0.5);
  });

  it('hits on beat 3 and beat 4-and', () => {
    expect(pattern[1]!.beat).toBe(3);
    expect(pattern[1]!.subdivision).toBe(0);
    expect(pattern[2]!.beat).toBe(4);
    expect(pattern[2]!.subdivision).toBe(0.5);
  });

  it('beat 4-and uses chordRef: next (anticipation)', () => {
    const last = pattern[2]!;
    expect(last.chordRef).toBe('next');
  });
});

// ─── getCompPattern lookup ─────────────────────────────────────────────────────

describe('getCompPattern', () => {
  it('returns montuno pattern for "montuno" id', () => {
    const p = getCompPattern('montuno');
    expect(p).toBe(COMP_PATTERNS.montuno);
    expect(p).toHaveLength(4);
  });

  it('returns montuno-variant pattern for "montuno-variant" id', () => {
    const p = getCompPattern('montuno-variant');
    expect(p).toBe(COMP_PATTERNS['montuno-variant']);
    expect(p).toHaveLength(3);
  });

  it('returns wholeNotes fallback for unknown id', () => {
    const p = getCompPattern('nonexistent' as CompPatternId);
    expect(p).toBe(COMP_PATTERNS.wholeNotes);
  });
});

// ─── latin-montuno profile ─────────────────────────────────────────────────────

describe('latin-montuno profile', () => {
  const profile = COMPING_PROFILES['latin-montuno'];

  it('exists in COMPING_PROFILES', () => {
    expect(profile).toBeDefined();
  });

  it('has id "latin-montuno"', () => {
    expect(profile!.id).toBe('latin-montuno');
  });

  it('has complexity 3 (advanced)', () => {
    expect(profile!.complexity).toBe(3);
  });

  it('has 4 bars: montuno, montuno-variant, basie-2-4, montuno', () => {
    expect(profile!.bars).toEqual(['montuno', 'montuno-variant', 'basie-2-4', 'montuno']);
  });

  it('bar 0 (montuno) has syncopated offbeat events', () => {
    const events = COMP_PATTERNS[profile!.bars[0]!]!;
    const hasOffbeat = events.some((e) => (e.subdivision ?? 0) > 0);
    expect(hasOffbeat).toBe(true);
  });

  it('bar 1 (montuno-variant) starts on offbeat', () => {
    const events = COMP_PATTERNS[profile!.bars[1]!]!;
    expect(events[0]!.beat).toBe(2);
    expect(events[0]!.subdivision).toBe(0.5);
  });

  it('bar 2 (basie-2-4) provides sparse contrast', () => {
    const events = COMP_PATTERNS[profile!.bars[2]!]!;
    expect(events).toHaveLength(2); // basie-2-4 is sparse
    expect(events.map((e) => e.beat)).toEqual([2, 4]);
  });

  it('bar 3 (montuno) returns to dense montuno feel', () => {
    expect(profile!.bars[3]).toBe('montuno');
  });
});

// ─── getCompingProfile lookup ──────────────────────────────────────────────────

describe('getCompingProfile', () => {
  it('returns latin-montuno for "latin-montuno" id', () => {
    const p = getCompingProfile('latin-montuno');
    expect(p.id).toBe('latin-montuno');
    expect(p.bars).toEqual(['montuno', 'montuno-variant', 'basie-2-4', 'montuno']);
  });

  it('returns swing-sparse fallback for unknown id', () => {
    const p = getCompingProfile('nonexistent');
    expect(p.id).toBe('swing-sparse');
  });
});

// ─── All CompPatternId values exist in COMP_PATTERNS ───────────────────────────

describe('COMP_PATTERNS completeness', () => {
  it('every pattern id resolves to a defined pattern', () => {
    const ids: CompPatternId[] = [
      'charleston',
      'reverse-charleston',
      'basie-2-4',
      'offbeat-2-4',
      'anticipation-4and',
      'one-twoand-four',
      'oneand-three',
      'twoand-only',
      'four-and-sparse',
      'two-threeand',
      'halfNotes',
      'quarterNotes',
      'quarter-comp',
      'two-and-four',
      'one-three',
      'wholeNotes',
      'montuno',
      'montuno-variant',
      'rest',
    ];
    for (const id of ids) {
      expect(COMP_PATTERNS[id]).toBeDefined();
    }
  });

  it('every profile id resolves', () => {
    const ids: CompingProfileId[] = [
      'swing-sparse',
      'swing-medium',
      'swing-dense',
      'basie-light',
      'offbeat-push',
      'beginner-safe',
      'latin-montuno',
    ];
    for (const id of ids) {
      expect(COMPING_PROFILES[id]).toBeDefined();
    }
  });

  it('all profile bars reference existing patterns', () => {
    for (const profile of Object.values(COMPING_PROFILES)) {
      for (const barPattern of profile.bars) {
        expect(COMP_PATTERNS[barPattern as CompPatternId]).toBeDefined();
      }
    }
  });
});
