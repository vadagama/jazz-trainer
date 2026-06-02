import { describe, it, expect } from 'vitest';
import { MetronomeInstrument, type ScheduleContext } from './instrument.js';
import { parseTimeSignature } from '../time/timeSignature.js';

function collect(
  instrument: MetronomeInstrument,
  window: { fromTicks: number; toTicks: number },
  timeSignature: ReturnType<typeof parseTimeSignature>,
  bpm = 120,
): Array<{ at: number; strong: boolean }> {
  const clicks: Array<{ at: number; strong: boolean }> = [];
  const ctx: ScheduleContext = {
    bpm,
    timeSignature,
    scheduleClick: (at, strong) => clicks.push({ at, strong }),
  };
  instrument.schedule(window, ctx);
  return clicks;
}

describe('MetronomeInstrument', () => {
  it('clicks every beat in 4/4, accenting the downbeat', () => {
    const clicks = collect(
      new MetronomeInstrument(),
      { fromTicks: 0, toTicks: 1920 },
      parseTimeSignature('4/4'),
    );
    expect(clicks).toEqual([
      { at: 0, strong: true },
      { at: 480, strong: false },
      { at: 960, strong: false },
      { at: 1440, strong: false },
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

  it('accents beats 0 and 3 in 6/8 (3+3 grouping)', () => {
    const clicks = collect(
      new MetronomeInstrument(),
      { fromTicks: 0, toTicks: 1440 },
      parseTimeSignature('6/8'),
    );
    expect(clicks).toEqual([
      { at: 0, strong: true },
      { at: 240, strong: false },
      { at: 480, strong: false },
      { at: 720, strong: true },
      { at: 960, strong: false },
      { at: 1200, strong: false },
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
