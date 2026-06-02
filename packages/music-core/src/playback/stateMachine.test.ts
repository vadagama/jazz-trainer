import { describe, it, expect } from 'vitest';
import {
  initialPlaybackState,
  playbackReducer,
  PlaybackStateMachine,
  type PlaybackState,
} from './stateMachine.js';

const start = (totalBars = 4): PlaybackState => initialPlaybackState(totalBars);

describe('playbackReducer', () => {
  it('starts idle at the beginning', () => {
    expect(start()).toMatchObject({ status: 'idle', currentBar: 0, selectedBar: 0 });
  });

  it('plays from the selected bar', () => {
    let s = start();
    s = playbackReducer(s, { type: 'selectBar', bar: 3 });
    expect(s.selectedBar).toBe(3);
    s = playbackReducer(s, { type: 'play' });
    expect(s).toMatchObject({ status: 'playing', currentBar: 3, currentBeat: 0 });
  });

  it('pause keeps the position, resume continues from it', () => {
    let s = start();
    s = playbackReducer(s, { type: 'play' });
    s = playbackReducer(s, { type: 'tick', bar: 2, beat: 3 });
    expect(s).toMatchObject({ currentBar: 2, currentBeat: 3 });
    s = playbackReducer(s, { type: 'pause' });
    expect(s).toMatchObject({ status: 'paused', currentBar: 2, currentBeat: 3 });
    s = playbackReducer(s, { type: 'play' });
    expect(s).toMatchObject({ status: 'playing', currentBar: 2 });
  });

  it('stop returns to the start of the form', () => {
    let s = start();
    s = playbackReducer(s, { type: 'play' });
    s = playbackReducer(s, { type: 'tick', bar: 2, beat: 1 });
    s = playbackReducer(s, { type: 'stop' });
    expect(s).toMatchObject({ status: 'idle', currentBar: 0, currentBeat: 0 });
  });

  it('next/prev bar clamp at the form boundaries', () => {
    let s = start(4);
    s = playbackReducer(s, { type: 'nextBar' }); // 1
    s = playbackReducer(s, { type: 'nextBar' }); // 2
    s = playbackReducer(s, { type: 'nextBar' }); // 3
    s = playbackReducer(s, { type: 'nextBar' }); // clamp at 3
    expect(s.currentBar).toBe(3);
    s = playbackReducer(s, { type: 'prevBar' }); // 2
    s = playbackReducer(s, { type: 'prevBar' }); // 1
    s = playbackReducer(s, { type: 'prevBar' }); // 0
    s = playbackReducer(s, { type: 'prevBar' }); // clamp at 0
    expect(s.currentBar).toBe(0);
  });

  it('selectBar clamps to the valid range', () => {
    let s = start(4);
    s = playbackReducer(s, { type: 'selectBar', bar: 99 });
    expect(s.selectedBar).toBe(3);
    s = playbackReducer(s, { type: 'selectBar', bar: -5 });
    expect(s.selectedBar).toBe(0);
  });

  it('ignores ticks while not playing', () => {
    let s = start();
    s = playbackReducer(s, { type: 'tick', bar: 2, beat: 1 });
    expect(s.currentBar).toBe(0);
  });

  it('setTotalBars clamps current and selected bars', () => {
    let s = start(8);
    s = playbackReducer(s, { type: 'selectBar', bar: 7 });
    s = playbackReducer(s, { type: 'play' });
    s = playbackReducer(s, { type: 'setTotalBars', totalBars: 4 });
    expect(s.currentBar).toBeLessThanOrEqual(3);
    expect(s.selectedBar).toBeLessThanOrEqual(3);
  });
});

describe('PlaybackStateMachine wrapper', () => {
  it('notifies subscribers on change and supports unsubscribe', () => {
    const machine = new PlaybackStateMachine(4);
    const seen: string[] = [];
    const unsub = machine.subscribe((s) => seen.push(s.status));
    machine.dispatch({ type: 'play' });
    machine.dispatch({ type: 'pause' });
    unsub();
    machine.dispatch({ type: 'stop' });
    expect(seen).toEqual(['playing', 'paused']);
    expect(machine.getState().status).toBe('idle');
  });
});
