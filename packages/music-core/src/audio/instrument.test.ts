import { describe, it, expect } from 'vitest';
import { MetronomeInstrument, type ScheduleContext } from './instrument.js';
import { parseTimeSignature } from '../time/timeSignature.js';

import type { BeatType } from './transportEngine.js';

function collect(
  instrument: MetronomeInstrument,
  window: { fromTicks: number; toTicks: number },
  timeSignature: ReturnType<typeof parseTimeSignature>,
  bpm = 120,
): Array<{ at: number; beatType: BeatType }> {
  const clicks: Array<{ at: number; beatType: BeatType }> = [];
  const ctx: ScheduleContext = {
    bpm,
    timeSignature,
    scheduleClick: (at, beatType) => clicks.push({ at, beatType }),
  };
  instrument.schedule(window, ctx);
  return clicks;
}

describe('MetronomeInstrument', () => {
  it('clicks every beat in 4/4, accenting downbeat and beat 3', () => {
    const clicks = collect(
      new MetronomeInstrument(),
      { fromTicks: 0, toTicks: 1920 },
      parseTimeSignature('4/4'),
    );
    expect(clicks).toEqual([
      { at: 0, beatType: 'strong' },
      { at: 480, beatType: 'weak' },
      { at: 960, beatType: 'strong2' },
      { at: 1440, beatType: 'weak' },
    ]);
  });

  it('respects the active-beats mask', () => {
    const clicks = collect(
      new MetronomeInstrument({ activeBeats: [true, false, true, false] }),
      { fromTicks: 0, toTicks: 1920 },
      parseTimeSignature('4/4'),
    );
    expect(clicks.map((c) => c.at)).toEqual([0, 960]);
  });

  it('accents beat 0 as strong and beat 3 as strong2 in 6/8 (3+3 grouping)', () => {
    const clicks = collect(
      new MetronomeInstrument(),
      { fromTicks: 0, toTicks: 1440 },
      parseTimeSignature('6/8'),
    );
    expect(clicks).toEqual([
      { at: 0, beatType: 'strong' },
      { at: 240, beatType: 'weak' },
      { at: 480, beatType: 'weak' },
      { at: 720, beatType: 'strong2' },
      { at: 960, beatType: 'weak' },
      { at: 1200, beatType: 'weak' },
    ]);
  });

  it('only schedules beats inside the window', () => {
    const clicks = collect(
      new MetronomeInstrument(),
      { fromTicks: 500, toTicks: 1000 },
      parseTimeSignature('4/4'),
    );
    expect(clicks.map((c) => c.at)).toEqual([960]);
  });
});
