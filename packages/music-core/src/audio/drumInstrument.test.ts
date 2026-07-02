import { describe, it, expect } from 'vitest';
import { DrumInstrument, type DrumInstrumentSettings } from './drumInstrument.js';
import { parseTimeSignature, ticksPerBeat, ticksPerBar } from '../time/timeSignature.js';
import type { ScheduleContext, ScheduleWindow, DrumEvent } from './instrument.js';
import type { DrumSound } from './drumSampleRegistry.js';

interface Hit {
  sound: DrumSound;
  atTicks: number;
}

function makeCtx(
  sig: ReturnType<typeof parseTimeSignature>,
  hits: Hit[],
  swingRatio = 0.5,
): ScheduleContext {
  return {
    bpm: 120,
    timeSignature: sig,
    swingRatio,
    scheduleClick: () => {},
    scheduleEvent: (_instrumentId, payload, atTicks) => {
      if (_instrumentId === 'drums') {
        const p = payload as DrumEvent;
        hits.push({ sound: p.sound, atTicks });
      }
    },
  };
}

function oneBar(sig: ReturnType<typeof parseTimeSignature>): ScheduleWindow {
  return { fromTicks: 0, toTicks: ticksPerBar(sig) };
}

function makeDefaultSettings(
  overrides: Partial<DrumInstrumentSettings> = {},
): DrumInstrumentSettings {
  return {
    enabled: true,
    volume: 0.7,
    bassDrumEnabled: true,
    bassDrumVolume: 0.7,
    snareEnabled: true,
    snareVolume: 0.8,
    hihatEnabled: true,
    hihatVolume: 0.65,
    hihatOpenness: 0,
    rideEnabled: true,
    rideVolume: 0.7,
    crashEnabled: true,
    crashVolume: 0.8,
    crashFrequency: 4,
    rimEnabled: false,
    rimVolume: 0.6,
    tomEnabled: true,
    tomVolume: 0.7,
    humanizeIntensity: 'off',
    funkComplexity: 'medium',
    randomizationLevel: 'off',
    fillFrequency: '8bars',
    fillComplexity: 'medium',
    rideVariation: true,
    snareGhosts: true,
    bassDrumVariation: true,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4/4 Swing
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumInstrument — 4/4 swing', () => {
  const sig = parseTimeSignature('4/4');

  it('ride plays on all 4 beats + 2 skip-beat offbeats (1&, 3&)', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings());
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const rideHits = hits.filter((h) => h.sound === 'ride');
    expect(rideHits.length).toBe(6);
  });

  it('snare fires on beats 2 and 4 (backbeat)', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings());
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const snareHits = hits.filter((h) => h.sound === 'snare').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(snareHits).toEqual([1 * tpBeat, 3 * tpBeat]);
  });

  it('bass drum feathering on all 4 beats', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings());
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const bdHits = hits.filter((h) => h.sound === 'bassDrum').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(bdHits).toEqual([0 * tpBeat, 1 * tpBeat, 2 * tpBeat, 3 * tpBeat]);
  });

  it('hihat fires 2 foot chicks per bar (beats 2 & 4)', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings());
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const hhHits = hits.filter(
      (h) => h.sound === 'hihat' || h.sound === 'hihatHalf' || h.sound === 'hihatOpen',
    );
    expect(hhHits.length).toBe(2);
    const tpBeat = ticksPerBeat(sig);
    // On beats 2 and 4 (beat indices 1 and 3)
    expect(hhHits.map((h) => h.atTicks)).toEqual([1 * tpBeat, 3 * tpBeat]);
  });

  it('crash fires on beat 1 of bar 0', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings({ crashFrequency: 4 }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const crashHits = hits.filter((h) => h.sound === 'crash');
    expect(crashHits.length).toBe(1);
    expect(crashHits[0]!.atTicks).toBe(0);
  });

  it('disabled sound does not appear in hits', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings({ snareEnabled: false }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'snare')).toHaveLength(0);
  });

  it('master enabled=false produces no hits', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings({ enabled: false }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.length).toBe(0);
  });

  it('rim fires on backbeats when enabled', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings({ rimEnabled: true }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const rimHits = hits.filter((h) => h.sound === 'rim').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(rimHits).toEqual([1 * tpBeat, 3 * tpBeat]);
  });

  it('swing ratio affects offbeat timing', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings());
    const tpBeat = ticksPerBeat(sig);

    const straightHits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, straightHits, 0.5));
    const straightOffbeats = straightHits
      .filter((h) => h.sound === 'ride')
      .filter((h) => h.atTicks % tpBeat !== 0)
      .map((h) => h.atTicks);

    const swingHits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, swingHits, 0.66));
    const swingOffbeats = swingHits
      .filter((h) => h.sound === 'ride')
      .filter((h) => h.atTicks % tpBeat !== 0)
      .map((h) => h.atTicks);

    expect(swingOffbeats[0]!).toBeGreaterThan(straightOffbeats[0]!);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3/4 Jazz Waltz (degraded swing)
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumInstrument — 3/4 jazz waltz', () => {
  const sig = parseTimeSignature('3/4');

  it('ride plays on all 3 beats (degraded to quarters)', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings());
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'ride')).toHaveLength(3);
  });

  it('snare fires on non-strong beats (2 and 3)', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings());
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const snareHits = hits.filter((h) => h.sound === 'snare').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(snareHits).toEqual([1 * tpBeat, 2 * tpBeat]);
  });

  it('bass drum on beat 1', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings());
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const bdHits = hits.filter((h) => h.sound === 'bassDrum').map((h) => h.atTicks);
    expect(bdHits).toContain(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Humanization
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumInstrument — humanization', () => {
  const sig = parseTimeSignature('4/4');

  it('no jitter when humanizeIntensity is off', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off' }));
    const tpBeat = ticksPerBeat(sig);

    for (let run = 0; run < 20; run++) {
      const hits: Hit[] = [];
      drum.schedule(oneBar(sig), makeCtx(sig, hits));
      const rideTicks = hits.filter((h) => h.sound === 'ride').map((h) => h.atTicks);
      const onBeats = rideTicks.filter((t) => t % tpBeat === 0);
      expect(onBeats.length).toBeGreaterThanOrEqual(4);
      for (const t of onBeats) {
        expect(t % tpBeat).toBe(0);
      }
    }
  });

  it('jitter stays within bounds for med intensity', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings({ humanizeIntensity: 'med' }));
    const tpBeat = ticksPerBeat(sig);
    const maxJitter = Math.round(0.004 * (120 / 60) * 480);

    for (let run = 0; run < 50; run++) {
      const hits: Hit[] = [];
      drum.schedule(oneBar(sig), makeCtx(sig, hits));
      const rideTicks = hits.filter((h) => h.sound === 'ride').map((h) => h.atTicks);
      for (const t of rideTicks) {
        const nearestBeat = Math.round(t / tpBeat) * tpBeat;
        const diff = Math.abs(t - nearestBeat);
        if (diff < tpBeat * 0.3) {
          expect(diff).toBeLessThanOrEqual(maxJitter + 1);
        }
      }
    }
  });

  it('no hit is scheduled before fromTicks', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings({ humanizeIntensity: 'med' }));
    const window: ScheduleWindow = { fromTicks: 480, toTicks: 480 * 5 };
    for (let i = 0; i < 50; i++) {
      const hits: Hit[] = [];
      drum.schedule(window, makeCtx(sig, hits));
      expect(hits.every((h) => h.atTicks >= window.fromTicks)).toBe(true);
    }
  });

  it('different intensities produce different jitter ranges', () => {
    const drum = new DrumInstrument();

    const collectOffsets = (intensity: 'low' | 'med' | 'high'): number[] => {
      drum.updateSettings(makeDefaultSettings({ humanizeIntensity: intensity }));
      const tpBeat = ticksPerBeat(sig);
      const offsets: number[] = [];
      for (let run = 0; run < 20; run++) {
        const hits: Hit[] = [];
        drum.schedule(oneBar(sig), makeCtx(sig, hits));
        const rideTicks = hits.filter((h) => h.sound === 'ride').map((h) => h.atTicks);
        for (const t of rideTicks) {
          const nearestBeat = Math.round(t / tpBeat) * tpBeat;
          const diff = Math.abs(t - nearestBeat);
          if (diff < tpBeat * 0.3) offsets.push(diff);
        }
      }
      return offsets;
    };

    const lowMax = Math.max(...collectOffsets('low'));
    const highMax = Math.max(...collectOffsets('high'));
    expect(highMax).toBeGreaterThanOrEqual(lowMax);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Backward compatibility
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumInstrument — backward compatibility', () => {
  const sig = parseTimeSignature('4/4');

  it('setHumanize(true) enables med intensity', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off' }));
    drum.setHumanize(true);
    const tpBeat = ticksPerBeat(sig);
    let hasJitter = false;
    for (let run = 0; run < 10; run++) {
      const hits: Hit[] = [];
      drum.schedule(oneBar(sig), makeCtx(sig, hits));
      const rideTicks = hits.filter((h) => h.sound === 'ride').map((h) => h.atTicks);
      for (const t of rideTicks) {
        if (t % tpBeat !== 0) hasJitter = true;
      }
    }
    expect(hasJitter).toBe(true);
  });

  it('setHumanize(false) disables humanization', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings({ humanizeIntensity: 'med' }));
    drum.setHumanize(false);
    const tpBeat = ticksPerBeat(sig);
    for (let run = 0; run < 10; run++) {
      const hits: Hit[] = [];
      drum.schedule(oneBar(sig), makeCtx(sig, hits));
      const rideTicks = hits.filter((h) => h.sound === 'ride').map((h) => h.atTicks);
      const onBeatTicks = rideTicks.filter((t) => t % tpBeat === 0);
      expect(onBeatTicks.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bossa nova
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumInstrument — bossa nova', () => {
  const sig = parseTimeSignature('4/4');

  it('bass drum on beat 1 and offbeat of beat 2 (3&)', () => {
    const drum = new DrumInstrument();
    drum.setStyle('bossa');
    drum.updateSettings(makeDefaultSettings({ rimEnabled: true }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const bdHits = hits.filter((h) => h.sound === 'bassDrum').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(bdHits).toEqual([0, tpBeat + Math.round(0.5 * tpBeat)]);
  });

  it('rim cross-stick clave pattern on beats 1, 2, 3', () => {
    const drum = new DrumInstrument();
    drum.setStyle('bossa');
    drum.updateSettings(makeDefaultSettings({ rimEnabled: true }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const rimHits = hits.filter((h) => h.sound === 'rim').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(rimHits).toEqual([0, 1 * tpBeat, 2 * tpBeat]);
  });

  it('hihat fires eighth notes', () => {
    const drum = new DrumInstrument();
    drum.setStyle('bossa');
    drum.updateSettings(makeDefaultSettings({ rimEnabled: true }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const hhHits = hits.filter(
      (h) => h.sound === 'hihat' || h.sound === 'hihatHalf' || h.sound === 'hihatOpen',
    );
    expect(hhHits.length).toBe(8);
  });

  it('ride does not fire regardless of rideEnabled', () => {
    const drum = new DrumInstrument();
    drum.setStyle('bossa');
    drum.updateSettings(makeDefaultSettings({ rimEnabled: true, rideEnabled: true }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'ride')).toHaveLength(0);
  });

  it('snare does not fire regardless of snareEnabled', () => {
    const drum = new DrumInstrument();
    drum.setStyle('bossa');
    drum.updateSettings(makeDefaultSettings({ rimEnabled: true, snareEnabled: true }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'snare')).toHaveLength(0);
  });

  it('crash fires on first beat of crashFrequency-th bar', () => {
    const drum = new DrumInstrument();
    drum.setStyle('bossa');
    drum.updateSettings(makeDefaultSettings({ rimEnabled: true, crashFrequency: 4 }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const crashHits = hits.filter((h) => h.sound === 'crash');
    expect(crashHits.length).toBe(1);
    expect(crashHits[0]!.atTicks).toBe(0);
  });

  it('degraded to scheduleDegradedSwing for non-4/4', () => {
    const sig34 = parseTimeSignature('3/4');
    const drum = new DrumInstrument();
    drum.setStyle('bossa');
    drum.updateSettings(makeDefaultSettings({ rimEnabled: true }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig34), makeCtx(sig34, hits));
    expect(hits.filter((h) => h.sound === 'ride').length).toBe(3);
    expect(hits.filter((h) => h.sound === 'rim')).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Funk
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumInstrument — funk', () => {
  const sig = parseTimeSignature('4/4');

  it('hihat plays 16th notes (16 per bar)', () => {
    const drum = new DrumInstrument();
    drum.setStyle('funk');
    drum.updateSettings(makeDefaultSettings({}));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const hhHits = hits.filter(
      (h) => h.sound === 'hihat' || h.sound === 'hihatHalf' || h.sound === 'hihatOpen',
    );
    expect(hhHits.length).toBe(16);
  });

  it('snare plays backbeat on beats 2 and 4', () => {
    const drum = new DrumInstrument();
    drum.setStyle('funk');
    drum.updateSettings(makeDefaultSettings({}));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const snareHits = hits.filter((h) => h.sound === 'snare').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(snareHits).toEqual([1 * tpBeat, 3 * tpBeat]);
  });

  it('bass drum simple plays on beats 1 and 3', () => {
    const drum = new DrumInstrument();
    drum.setStyle('funk');
    drum.updateSettings(makeDefaultSettings({ funkComplexity: 'simple' }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const bdHits = hits.filter((h) => h.sound === 'bassDrum').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(bdHits).toEqual([0, 2 * tpBeat]);
  });

  it('bass drum medium adds offbeat on beat 1 and beat 4', () => {
    const drum = new DrumInstrument();
    drum.setStyle('funk');
    drum.updateSettings(makeDefaultSettings({ funkComplexity: 'medium' }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const bdTicks = new Set(hits.filter((h) => h.sound === 'bassDrum').map((h) => h.atTicks));
    const tpBeat = ticksPerBeat(sig);
    expect(bdTicks.has(0)).toBe(true);
    expect(bdTicks.has(3 * tpBeat)).toBe(true);
    expect(bdTicks.has(Math.round(0.5 * tpBeat))).toBe(true);
  });

  it('bass drum complex has 5 hits', () => {
    const drum = new DrumInstrument();
    drum.setStyle('funk');
    drum.updateSettings(makeDefaultSettings({ funkComplexity: 'complex' }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'bassDrum').length).toBe(5);
  });

  it('fill frequency never has no fills (just backbeat snare)', () => {
    const drum = new DrumInstrument();
    drum.setStyle('funk');
    drum.updateSettings(makeDefaultSettings({ fillFrequency: 'never', randomizationLevel: 'off' }));
    const hits: Hit[] = [];
    const window: ScheduleWindow = { fromTicks: 0, toTicks: ticksPerBar(sig) * 16 };
    drum.schedule(window, makeCtx(sig, hits));
    // 16 bars × 2 backbeats = 32 snare hits (no fills)
    expect(hits.filter((h) => h.sound === 'snare').length).toBe(32);
  });

  it('fill frequency 4bars generates fills with randomization', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(
      makeDefaultSettings({
        fillFrequency: '4bars',
        randomizationLevel: 'high',
      }),
    );
    const tpBar = ticksPerBar(sig);
    const window: ScheduleWindow = { fromTicks: 3 * tpBar, toTicks: 5 * tpBar };
    const hits: Hit[] = [];
    drum.schedule(window, makeCtx(sig, hits));
    const snareInBar3 = hits.filter(
      (h) => h.sound === 'snare' && h.atTicks >= 3 * tpBar && h.atTicks < 4 * tpBar,
    );
    expect(snareInBar3.length).toBeGreaterThan(2);
  });

  it('ride does not fire regardless of rideEnabled', () => {
    const drum = new DrumInstrument();
    drum.setStyle('funk');
    drum.updateSettings(makeDefaultSettings({ rideEnabled: true }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'ride')).toHaveLength(0);
  });

  it('degraded to scheduleDegradedSwing for non-4/4', () => {
    const sig34 = parseTimeSignature('3/4');
    const drum = new DrumInstrument();
    drum.setStyle('funk');
    drum.updateSettings(makeDefaultSettings({}));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig34), makeCtx(sig34, hits));
    expect(hits.filter((h) => h.sound === 'ride').length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Randomization: off = no changes
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumInstrument — randomization off (zero-cost)', () => {
  const sig = parseTimeSignature('4/4');

  it('swing with randomization off produces same as base pattern', () => {
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings({ randomizationLevel: 'off' }));
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));

    // Ride: 6 hits (ding ding-a-ding)
    expect(hits.filter((h) => h.sound === 'ride').length).toBe(6);
    // Snare: 2 hits
    expect(hits.filter((h) => h.sound === 'snare').length).toBe(2);
    // BD: 4 hits
    expect(hits.filter((h) => h.sound === 'bassDrum').length).toBe(4);
    // HH: 2 hits (foot chicks on 2 & 4)
    const hhCount = hits.filter(
      (h) => h.sound === 'hihat' || h.sound === 'hihatHalf' || h.sound === 'hihatOpen',
    ).length;
    expect(hhCount).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sink absent
// ═══════════════════════════════════════════════════════════════════════════════

describe('DrumInstrument — sink absent', () => {
  it('does not throw when no drums sink is registered', () => {
    const sig = parseTimeSignature('4/4');
    const drum = new DrumInstrument();
    drum.updateSettings(makeDefaultSettings());
    const ctx: ScheduleContext = {
      bpm: 120,
      timeSignature: sig,
      swingRatio: 0.5,
      scheduleClick: () => {},
      scheduleEvent: () => {},
    };
    expect(() => drum.schedule(oneBar(sig), ctx)).not.toThrow();
  });
});
