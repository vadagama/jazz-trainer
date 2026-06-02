/**
 * Pure playback state machine (docs/02-audio-engine.md §4). No Tone.js, no DOM —
 * a deterministic reducer over transport commands and tick events, so the UI
 * state is fully unit-testable.
 *
 * Indices are 0-based bar indices into the grid. `currentBar` is the playhead;
 * `selectedBar` is the user's selection (where Play starts from).
 */

export type PlaybackStatus = 'idle' | 'playing' | 'paused';

export interface PlaybackState {
  status: PlaybackStatus;
  currentBar: number;
  currentBeat: number;
  selectedBar: number;
  totalBars: number;
}

export type PlaybackAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'stop' }
  | { type: 'nextBar' }
  | { type: 'prevBar' }
  | { type: 'selectBar'; bar: number }
  | { type: 'tick'; bar: number; beat: number }
  | { type: 'setTotalBars'; totalBars: number };

export function initialPlaybackState(totalBars: number): PlaybackState {
  return {
    status: 'idle',
    currentBar: 0,
    currentBeat: 0,
    selectedBar: 0,
    totalBars: Math.max(0, totalBars),
  };
}

function clampBar(bar: number, totalBars: number): number {
  if (totalBars <= 0) return 0;
  return Math.min(Math.max(bar, 0), totalBars - 1);
}

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'play': {
      // Resume from the current playhead when paused; otherwise start from the
      // selected bar (or the beginning of the form).
      if (state.status === 'paused') {
        return { ...state, status: 'playing' };
      }
      return {
        ...state,
        status: 'playing',
        currentBar: state.selectedBar,
        currentBeat: 0,
      };
    }

    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state;

    case 'stop':
      return { ...state, status: 'idle', currentBar: 0, currentBeat: 0 };

    case 'nextBar': {
      const currentBar = clampBar(state.currentBar + 1, state.totalBars);
      return { ...state, currentBar, currentBeat: 0, selectedBar: currentBar };
    }

    case 'prevBar': {
      const currentBar = clampBar(state.currentBar - 1, state.totalBars);
      return { ...state, currentBar, currentBeat: 0, selectedBar: currentBar };
    }

    case 'selectBar':
      return { ...state, selectedBar: clampBar(action.bar, state.totalBars) };

    case 'tick': {
      if (state.status !== 'playing') return state;
      return {
        ...state,
        currentBar: clampBar(action.bar, state.totalBars),
        currentBeat: Math.max(0, action.beat),
      };
    }

    case 'setTotalBars': {
      const totalBars = Math.max(0, action.totalBars);
      return {
        ...state,
        totalBars,
        currentBar: clampBar(state.currentBar, totalBars),
        selectedBar: clampBar(state.selectedBar, totalBars),
      };
    }
  }
}

/**
 * Thin stateful wrapper around {@link playbackReducer} for the UI bridge:
 * dispatch commands, read state, subscribe to changes.
 */
export class PlaybackStateMachine {
  private state: PlaybackState;
  private listeners = new Set<(state: PlaybackState) => void>();

  constructor(totalBars: number) {
    this.state = initialPlaybackState(totalBars);
  }

  getState(): PlaybackState {
    return this.state;
  }

  dispatch(action: PlaybackAction): PlaybackState {
    const next = playbackReducer(this.state, action);
    if (next !== this.state) {
      this.state = next;
      for (const listener of this.listeners) listener(next);
    }
    return this.state;
  }

  subscribe(listener: (state: PlaybackState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
