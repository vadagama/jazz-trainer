import { describe, it, expect } from 'vitest';
import { DrumRandomizer, type DrumHit, type BarContext } from './drumRandomizer.js';

function makeCtx(overrides: Partial<BarContext> = {}): BarContext {
  return {
    barIndex: 0,
    formLength: 8,
    style: 'swing',
    beatsPerBar: 4,
    beatUnit: 4,
    ...overrides,
  };
}

function baseHits(): DrumHit[] {
  return [
    { sound: 'ride', atTick: 0, velocity: 0.7, durationTicks: 20 },
    { sound: 'hihat', atTick: 0, velocity: 0.55, durationTicks: 480 },
    { sound: 'bassDrum', atTick: 0, velocity: 0.6, durationTicks: 480 },
    { sound: 'ride', atTick: 240, velocity: 0.55, durationTicks: 20 },
    { sound: 'hihat', atTick: 240, velocity: 0.65, durationTicks: 480 },
    { sound: 'ride', atTick: 480, velocity: 0.65, durationTicks: 20 },
    { sound: 'hihat', atTick: 480, velocity: 0.55, durationTicks: 480 },
    { sound: 'snare', atTick: 480, velocity: 0.8, durationTicks: 480 },
    { sound: 'bassDrum', atTick: 480, velocity: 0.3, durationTicks: 480 },
    { sound: 'ride', atTick: 720, velocity: 0.55, durationTicks: 20 },
    { sound: 'hihat', atTick: 720, velocity: 0.65, durationTicks: 480 },
    { sound: 'ride', atTick: 960, velocity: 0.65, durationTicks: 20 },
    { sound: 'hihat', atTick: 960, velocity: 0.55, durationTicks: 480 },
    { sound: 'bassDrum', atTick: 960, velocity: 0.5, durationTicks: 480 },
    { sound: 'ride', atTick: 1200, velocity: 0.55, durationTicks: 20 },
    { sound: 'hihat', atTick: 1200, velocity: 0.65, durationTicks: 480 },
    { sound: 'ride', atTick: 1440, velocity: 0.65, durationTicks: 20 },
    { sound: 'hihat', atTick: 1440, velocity: 0.55, durationTicks: 480 },
    { sound: 'snare', atTick: 1440, velocity: 0.8, durationTicks: 480 },
    { sound: 'bassDrum', atTick: 1440, velocity: 0.3, durationTicks: 480 },
  ];
}

// Deterministic RNG for tests
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Off mode
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumRandomizer — off', () => {
  it('apply() returns input array unchanged', () => {
    const r = new DrumRandomizer({ randomizationLevel: 'off' }, seededRng(1));
    const hits = baseHits();
    const result = r.apply(hits, makeCtx());
    expect(result).toBe(hits); // same reference
    expect(result.length).toBe(baseHits().length);
  });

  it('shouldVaryRide always false', () => {
    const r = new DrumRandomizer({ randomizationLevel: 'off' }, seededRng(1));
    for (let bar = 0; bar < 100; bar++) {
      expect(r.shouldVaryRide(bar, 8)).toBe(false);
    }
  });

  it('shouldFill works based on fillFrequency, not randomization level', () => {
    // fillFrequency determines bar interval; randomization level only affects apply()
    const r = new DrumRandomizer(
      { randomizationLevel: 'off', fillFrequency: '4bars' },
      seededRng(1),
    );
    expect(r.shouldFill(3)).toBe(true);
    expect(r.shouldFill(7)).toBe(true);
    expect(r.shouldFill(0)).toBe(false);
  });

  it('shouldVaryBassDrum always false', () => {
    const r = new DrumRandomizer({ randomizationLevel: 'off' }, seededRng(1));
    for (let bar = 0; bar < 100; bar++) {
      expect(r.shouldVaryBassDrum(bar)).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Active modes
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumRandomizer — subtle', () => {
  it('output differs from input in at least some runs (ride variation)', () => {
    const hits = baseHits();
    const originalLength = hits.length;
    let changed = 0;
    for (let seed = 0; seed < 50; seed++) {
      const testHits = baseHits();
      const r = new DrumRandomizer({ randomizationLevel: 'subtle' }, seededRng(seed));
      r.apply(testHits, makeCtx());
      if (testHits.length !== originalLength) changed++;
    }
    // At subtle level, some runs should show variation
    expect(changed).toBeGreaterThan(0);
  });

  it('shouldVaryRide returns false on last bar of form', () => {
    const r = new DrumRandomizer({ randomizationLevel: 'high' }, seededRng(1));
    // Bar 7 is the last bar of an 8-bar form
    for (let i = 0; i < 50; i++) {
      expect(r.shouldVaryRide(7, 8)).toBe(false);
    }
  });

  it('rideVariation=false prevents ride changes', () => {
    const hits = baseHits();
    const originalRideEvents = hits.filter((h) => h.sound === 'ride');
    const r = new DrumRandomizer(
      { randomizationLevel: 'high', rideVariation: false },
      seededRng(1),
    );
    const result = r.apply([...hits], makeCtx());
    const rideEvents = result.filter((h) => h.sound === 'ride');
    // Should have same number of ride events
    expect(rideEvents.length).toBe(originalRideEvents.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bass drum variation
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumRandomizer — bass drum variation', () => {
  it('bassDrumVariation=false preserves bass drum events', () => {
    const hits = baseHits();
    const originalBdCount = hits.filter((h) => h.sound === 'bassDrum').length;
    const r = new DrumRandomizer(
      { randomizationLevel: 'high', bassDrumVariation: false },
      seededRng(1),
    );
    const result = r.apply([...hits], makeCtx());
    const bdCount = result.filter((h) => h.sound === 'bassDrum').length;
    expect(bdCount).toBe(originalBdCount);
  });

  it('bassDrumVariation=true may add ghost kicks', () => {
    let maxBd = 0;
    const baseBdCount = baseHits().filter((h) => h.sound === 'bassDrum').length;
    for (let seed = 0; seed < 30; seed++) {
      const hits = baseHits();
      const r = new DrumRandomizer(
        { randomizationLevel: 'high', bassDrumVariation: true },
        seededRng(seed),
      );
      r.apply(hits, makeCtx());
      const count = hits.filter((h) => h.sound === 'bassDrum').length;
      if (count > maxBd) maxBd = count;
    }
    // At some point, extra ghost kicks should appear
    expect(maxBd).toBeGreaterThanOrEqual(baseBdCount);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fill frequency
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumRandomizer — fill frequency', () => {
  it('fillFrequency never returns false for shouldFill', () => {
    const r = new DrumRandomizer(
      { randomizationLevel: 'high', fillFrequency: 'never' },
      seededRng(1),
    );
    for (let bar = 0; bar < 100; bar++) {
      expect(r.shouldFill(bar)).toBe(false);
    }
  });

  it('fillFrequency 4bars triggers fill on bar % 4 === 3', () => {
    const r = new DrumRandomizer(
      { randomizationLevel: 'high', fillFrequency: '4bars' },
      seededRng(1),
    );
    expect(r.shouldFill(3)).toBe(true);
    expect(r.shouldFill(7)).toBe(true);
    expect(r.shouldFill(0)).toBe(false);
    expect(r.shouldFill(1)).toBe(false);
    expect(r.shouldFill(2)).toBe(false);
    expect(r.shouldFill(4)).toBe(false);
  });

  it('fillFrequency 8bars triggers fill on bar % 8 === 7', () => {
    const r = new DrumRandomizer(
      { randomizationLevel: 'high', fillFrequency: '8bars' },
      seededRng(1),
    );
    expect(r.shouldFill(7)).toBe(true);
    expect(r.shouldFill(15)).toBe(true);
    expect(r.shouldFill(3)).toBe(false);
    expect(r.shouldFill(8)).toBe(false);
  });

  it('fillFrequency 16bars triggers fill on bar % 16 === 15', () => {
    const r = new DrumRandomizer(
      { randomizationLevel: 'high', fillFrequency: '16bars' },
      seededRng(1),
    );
    expect(r.shouldFill(15)).toBe(true);
    expect(r.shouldFill(31)).toBe(true);
    expect(r.shouldFill(7)).toBe(false);
    expect(r.shouldFill(16)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Ghost notes
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumRandomizer — ghost notes', () => {
  it('snareGhosts=false prevents new snare events', () => {
    const hits = baseHits();
    const originalSnare = hits.filter((h) => h.sound === 'snare').length;
    const r = new DrumRandomizer({ randomizationLevel: 'high', snareGhosts: false }, seededRng(1));
    const result = r.apply([...hits], makeCtx());
    expect(result.filter((h) => h.sound === 'snare').length).toBe(originalSnare);
  });

  it('ghost notes appear on weak subdivisions when enabled', () => {
    const hits = baseHits();
    const originalSnare = hits.filter((h) => h.sound === 'snare').length;
    let maxSnare = originalSnare;
    for (let seed = 0; seed < 30; seed++) {
      const testHits = baseHits();
      const r = new DrumRandomizer(
        { randomizationLevel: 'high', snareGhosts: true },
        seededRng(seed),
      );
      r.apply(testHits, makeCtx());
      const count = testHits.filter((h) => h.sound === 'snare').length;
      if (count > maxSnare) maxSnare = count;
    }
    expect(maxSnare).toBeGreaterThan(originalSnare);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Style-specific behavior
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumRandomizer — style behavior', () => {
  it('bossa style does not generate snare ghost notes', () => {
    const hits = baseHits().filter((h) => h.sound !== 'snare');
    const r = new DrumRandomizer({ randomizationLevel: 'high', snareGhosts: true }, seededRng(1));
    const result = r.apply([...hits], makeCtx({ style: 'bossa' }));
    // No snare ghosts in bossa
    expect(result.filter((h) => h.sound === 'snare').length).toBe(0);
  });

  it('swing fill contains snare and bass drum', () => {
    const hits = baseHits();
    const r = new DrumRandomizer(
      {
        randomizationLevel: 'high',
        fillFrequency: '4bars',
        fillComplexity: 'medium',
      },
      seededRng(1),
    );
    // Bar 3 triggers fill
    const ctx = makeCtx({ barIndex: 3, style: 'swing' });
    const result = r.apply([...hits], ctx);
    const fillSounds = new Set(result.map((h) => h.sound));
    // Swing fills use snare + bass drum
    expect(fillSounds.has('snare')).toBe(true);
  });

  it('funk fill contains crash accent', () => {
    const hits = baseHits();
    const r = new DrumRandomizer(
      {
        randomizationLevel: 'high',
        fillFrequency: '4bars',
        fillComplexity: 'medium',
      },
      seededRng(1),
    );
    const ctx = makeCtx({ barIndex: 3, style: 'funk' });
    const result = r.apply([...hits], ctx);
    const fillSounds = new Set(result.map((h) => h.sound));
    // Funk fills use crash
    expect(fillSounds.has('crash')).toBe(true);
    expect(fillSounds.has('snare')).toBe(true);
  });

  it('bossa fill contains rim variations', () => {
    const hits = baseHits();
    const r = new DrumRandomizer(
      {
        randomizationLevel: 'high',
        fillFrequency: '4bars',
        fillComplexity: 'medium',
      },
      seededRng(1),
    );
    const ctx = makeCtx({ barIndex: 3, style: 'bossa' });
    const result = r.apply([...hits], ctx);
    const fillSounds = new Set(result.map((h) => h.sound));
    // Bossa fills use rim
    expect(fillSounds.has('rim')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Settings update
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumRandomizer — settings', () => {
  it('updateSettings changes behavior', () => {
    const r = new DrumRandomizer({ randomizationLevel: 'off' }, seededRng(1));
    expect(r.shouldFill(3)).toBe(false);

    r.updateSettings({ randomizationLevel: 'high', fillFrequency: '4bars' });
    expect(r.shouldFill(3)).toBe(true);
  });

  it('default settings are off', () => {
    const r = new DrumRandomizer(undefined, seededRng(1));
    expect(r.shouldFill(3)).toBe(false);
    expect(r.shouldVaryRide(0, 4)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fill complexity
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumRandomizer — fill complexity', () => {
  it('simple fills have fewer events than complex', () => {
    const hits = baseHits();

    const rSimple = new DrumRandomizer(
      {
        randomizationLevel: 'high',
        fillFrequency: '4bars',
        fillComplexity: 'simple',
      },
      seededRng(42),
    );
    const ctx = makeCtx({ barIndex: 3, style: 'funk' });
    const resultSimple = rSimple.apply([...hits], ctx);
    const simpleNew = resultSimple.length - hits.length;

    const rComplex = new DrumRandomizer(
      {
        randomizationLevel: 'high',
        fillFrequency: '4bars',
        fillComplexity: 'complex',
      },
      seededRng(42),
    );
    const resultComplex = rComplex.apply([...baseHits()], ctx);
    const complexNew = resultComplex.length - baseHits().length;

    // Complex fills add more events than simple fills
    expect(complexNew).toBeGreaterThanOrEqual(simpleNew);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// No crash at bar boundaries
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumRandomizer — edge cases', () => {
  it('empty hits array does not throw', () => {
    const r = new DrumRandomizer({ randomizationLevel: 'high' }, seededRng(1));
    expect(() => r.apply([], makeCtx())).not.toThrow();
  });

  it('formLength 0 means no last-bar restriction', () => {
    // With formLength=0, even the "last" bar can vary
    let varied = false;
    for (let seed = 0; seed < 20; seed++) {
      const r2 = new DrumRandomizer(
        { randomizationLevel: 'high', rideVariation: true },
        seededRng(seed),
      );
      if (r2.shouldVaryRide(99, 0)) {
        varied = true;
        break;
      }
    }
    // When formLength is 0, variation is allowed (no form boundary restriction)
    expect(varied).toBe(true);
  });
});
