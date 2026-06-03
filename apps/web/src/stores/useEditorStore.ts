import { create } from 'zustand';
import type { Bar, ChordSlot, GridContent } from '@jazz/shared';
import { parseChord } from '@jazz/music-core';
import { nanoid } from 'nanoid';

interface EditorState {
  localContent: GridContent | null;
  selectedBarId: string | null;
  isDirty: boolean;

  setContent: (content: GridContent) => void;
  loadExternalContent: (content: GridContent) => void;
  markClean: () => void;
  selectBar: (barId: string | null) => void;

  addBar: () => void;
  removeBar: (barId: string) => void;

  addChordToBar: (barId: string, symbol: string) => void;
  removeChordFromBar: (barId: string, index: number) => void;
  updateChordInBar: (barId: string, index: number, symbol: string) => void;
  updateChordBeats: (barId: string, index: number, beats: number | null) => void;
}

function parseSlot(symbol: string): ChordSlot {
  const res = parseChord(symbol);
  return { symbol, parsed: res.value ?? null };
}

function updateBar(bars: Bar[], barId: string, updater: (bar: Bar) => Bar): Bar[] {
  return bars.map((b) => (b.id === barId ? updater(b) : b));
}

export const useEditorStore = create<EditorState>((set) => ({
  localContent: null,
  selectedBarId: null,
  isDirty: false,

  setContent: (content) => set({ localContent: content, isDirty: false }),

  /** Load external content (DSL import / generator) — marks dirty immediately. */
  loadExternalContent: (content) => set({ localContent: content, isDirty: true }),

  markClean: () => set({ isDirty: false }),

  selectBar: (barId) => set({ selectedBarId: barId }),

  addBar: () =>
    set((state) => {
      if (!state.localContent) return state;
      const newBar: Bar = { id: nanoid(8), chords: [] };
      return {
        localContent: { ...state.localContent, bars: [...state.localContent.bars, newBar] },
        isDirty: true,
      };
    }),

  removeBar: (barId) =>
    set((state) => {
      if (!state.localContent) return state;
      const bars = state.localContent.bars.filter((b) => b.id !== barId);
      return {
        localContent: { ...state.localContent, bars },
        isDirty: true,
        selectedBarId: state.selectedBarId === barId ? null : state.selectedBarId,
      };
    }),

  addChordToBar: (barId, symbol) =>
    set((state) => {
      if (!state.localContent) return state;
      return {
        localContent: {
          ...state.localContent,
          bars: updateBar(state.localContent.bars, barId, (bar) => ({
            ...bar,
            chords: [...bar.chords, parseSlot(symbol)],
          })),
        },
        isDirty: true,
      };
    }),

  removeChordFromBar: (barId, index) =>
    set((state) => {
      if (!state.localContent) return state;
      return {
        localContent: {
          ...state.localContent,
          bars: updateBar(state.localContent.bars, barId, (bar) => ({
            ...bar,
            chords: bar.chords.filter((_, i) => i !== index),
          })),
        },
        isDirty: true,
      };
    }),

  updateChordInBar: (barId, index, symbol) =>
    set((state) => {
      if (!state.localContent) return state;
      return {
        localContent: {
          ...state.localContent,
          bars: updateBar(state.localContent.bars, barId, (bar) => ({
            ...bar,
            chords: bar.chords.map((slot, i) => (i === index ? parseSlot(symbol) : slot)),
          })),
        },
        isDirty: true,
      };
    }),

  updateChordBeats: (barId, index, beats) =>
    set((state) => {
      if (!state.localContent) return state;
      return {
        localContent: {
          ...state.localContent,
          bars: updateBar(state.localContent.bars, barId, (bar) => ({
            ...bar,
            chords: bar.chords.map((slot, i) => (i === index ? { ...slot, beats } : slot)),
          })),
        },
        isDirty: true,
      };
    }),
}));
