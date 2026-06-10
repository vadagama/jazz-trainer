import { describe, it, expect } from 'vitest';
import { DrumInstrument } from './drumInstrument.js';
import { parseTimeSignature, ticksPerBeat, ticksPerBar } from '../time/timeSignature.js';
import type { ScheduleContext, ScheduleWindow } from './instrument.js';
import type { DrumSound } from './drumSampleRegistry.js';

interface Hit { sound: DrumSound; atTicks: number }

function makeCtx(sig: ReturnType<typeof parseTimeSignature>, hits: Hit[]): ScheduleContext {
  return {
    bpm: 120,
    timeSignature: sig,
    scheduleClick: () => {},
    scheduleDrum: (atTicks, sound) => { hits.push({ sound, atTicks }); },
  };
}

function oneBar(sig: ReturnType<typeof parseTimeSignature>): ScheduleWindow {
  return { fromTicks: 0, toTicks: ticksPerBar(sig) };
}

function beatTicks(sig: ReturnType<typeof parseTimeSignature>): number[] {
  const tpBeat = ticksPerBeat(sig);
  return Array.from({ length: sig.beatsPerBar }, (_, i) => i * tpBeat);
}

describe('DrumInstrument — 4/4', () => {
  const sig = parseTimeSignature('4/4');

  it('stir fires on all 4 beats', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const stirHits = hits.filter((h) => h.sound === 'stir').map((h) => h.atTicks);
    expect(stirHits).toEqual(beatTicks(sig));
  });

  it('hihat fires only on beats 2 and 4 (idx 1 and 3)', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const hhHits = hits.filter((h) => h.sound === 'hihatFoot').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(hhHits).toEqual([1 * tpBeat, 3 * tpBeat]);
  });

  it('swingRide produces 6 hits per bar (4 beats + 2 upstrokes)', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    drum.setRidePattern('swingRide');
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'ride')).toHaveLength(6);
  });

  it('quarters ride produces exactly 4 hits per bar', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    drum.setRidePattern('quarters');
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'ride')).toHaveLength(4);
  });
});

describe('DrumInstrument — 3/4', () => {
  const sig = parseTimeSignature('3/4');

  it('stir fires on all 3 beats', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'stir')).toHaveLength(3);
  });

  it('hihat fires on beats 2 and 3 (idx 1 and 2)', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const hhHits = hits.filter((h) => h.sound === 'hihatFoot').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(hhHits).toEqual([1 * tpBeat, 2 * tpBeat]);
  });

  it('swingRide degrades to quarters in 3/4', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    drum.setRidePattern('swingRide');
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'ride')).toHaveLength(3);
  });
});

describe('DrumInstrument — 2/4', () => {
  const sig = parseTimeSignature('2/4');

  it('stir fires on both beats', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'stir')).toHaveLength(2);
  });

  it('hihat fires only on beat 2 (idx 1)', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const hhHits = hits.filter((h) => h.sound === 'hihatFoot').map((h) => h.atTicks);
    expect(hhHits).toEqual([ticksPerBeat(sig)]);
  });
});

describe('DrumInstrument — 5/4', () => {
  const sig = parseTimeSignature('5/4');

  it('stir fires on all 5 beats', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'stir')).toHaveLength(5);
  });

  it('hihat does not fire on beat 1 (idx 0) or beat 4 (idx 3, secondStrong)', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const hhTicks = new Set(hits.filter((h) => h.sound === 'hihatFoot').map((h) => h.atTicks));
    const tpBeat = ticksPerBeat(sig);
    expect(hhTicks.has(0)).toBe(false);          // beat 1 — strong
    expect(hhTicks.has(3 * tpBeat)).toBe(false); // beat 4 — second strong
  });
});

describe('DrumInstrument — 6/8', () => {
  const sig = parseTimeSignature('6/8');

  it('stir fires only on even eighth indices (0, 2, 4)', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const stirHits = hits.filter((h) => h.sound === 'stir').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig); // PPQ/2 = 240
    expect(stirHits).toEqual([0, 2 * tpBeat, 4 * tpBeat]);
  });

  it('hihat fires only on eighth index 3', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    const hhHits = hits.filter((h) => h.sound === 'hihatFoot').map((h) => h.atTicks);
    expect(hhHits).toEqual([3 * ticksPerBeat(sig)]);
  });

  it('swingRide degrades to quarters in 6/8', () => {
    const drum = new DrumInstrument();
    drum.setHumanize(false);
    drum.setRidePattern('swingRide');
    const hits: Hit[] = [];
    drum.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'ride')).toHaveLength(6);
  });
});

describe('DrumInstrument — sink absent / no crash', () => {
  it('does not throw when scheduleDrum is absent', () => {
    const sig = parseTimeSignature('4/4');
    const drum = new DrumInstrument();
    const ctx: ScheduleContext = { bpm: 120, timeSignature: sig, scheduleClick: () => {} };
    expect(() => drum.schedule(oneBar(sig), ctx)).not.toThrow();
  });
});

describe('DrumInstrument — humanize jitter stays within window', () => {
  it('no hit is scheduled before fromTicks', () => {
    const sig = parseTimeSignature('4/4');
    const drum = new DrumInstrument();
    drum.setHumanize(true);
    const window: ScheduleWindow = { fromTicks: 480, toTicks: 480 * 5 };
    const hits: Hit[] = [];
    for (let i = 0; i < 50; i++) {
      drum.schedule(window, makeCtx(sig, hits));
    }
    expect(hits.every((h) => h.atTicks >= window.fromTicks)).toBe(true);
  });
});
