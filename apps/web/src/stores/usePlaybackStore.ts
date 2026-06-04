import { create } from 'zustand';
import type { PlaybackState } from '@jazz/music-core';

interface PlaybackStore extends PlaybackState {
  _setState: (state: PlaybackState) => void;
  _reset: () => void;
  countInActive: boolean;
  countInBeat: number;
  _setCountIn: (active: boolean, beat: number) => void;
}

const INITIAL: PlaybackState = {
  status: 'idle',
  currentBar: 0,
  currentBeat: 0,
  selectedBar: 0,
  totalBars: 0,
};

export const usePlaybackStore = create<PlaybackStore>((set) => ({
  ...INITIAL,
  _setState: (state) => set(state),
  _reset: () => set(INITIAL),
  countInActive: false,
  countInBeat: 0,
  _setCountIn: (active, beat) => set({ countInActive: active, countInBeat: beat }),
}));
