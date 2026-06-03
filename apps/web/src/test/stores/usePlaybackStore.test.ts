import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaybackStore } from '@/stores/usePlaybackStore';

beforeEach(() => {
  usePlaybackStore.getState()._reset();
});

describe('usePlaybackStore', () => {
  it('has correct initial state', () => {
    const state = usePlaybackStore.getState();
    expect(state.status).toBe('idle');
    expect(state.currentBar).toBe(0);
    expect(state.currentBeat).toBe(0);
    expect(state.selectedBar).toBe(0);
    expect(state.totalBars).toBe(0);
  });

  it('_setState updates the entire state', () => {
    usePlaybackStore.getState()._setState({
      status: 'playing',
      currentBar: 2,
      currentBeat: 1,
      selectedBar: 2,
      totalBars: 8,
    });

    const state = usePlaybackStore.getState();
    expect(state.status).toBe('playing');
    expect(state.currentBar).toBe(2);
    expect(state.currentBeat).toBe(1);
    expect(state.totalBars).toBe(8);
  });

  it('_reset restores initial state after mutations', () => {
    usePlaybackStore.getState()._setState({
      status: 'paused',
      currentBar: 5,
      currentBeat: 3,
      selectedBar: 5,
      totalBars: 12,
    });

    usePlaybackStore.getState()._reset();
    const state = usePlaybackStore.getState();
    expect(state.status).toBe('idle');
    expect(state.currentBar).toBe(0);
    expect(state.totalBars).toBe(0);
  });
});
