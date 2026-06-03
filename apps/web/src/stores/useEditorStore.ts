import { create } from 'zustand';
import type { Bar, ChordSlot, GridContent, Section, RepeatEnd, TimeSignatureString } from '@jazz/shared';
import { parseChord } from '@jazz/music-core';
import { nanoid } from 'nanoid';

interface EditorState {
  localContent: GridContent | null;
  selectedBarId: string | null;
  isDirty: boolean;

  setContent: (content: GridContent, defaultTimeSignature: TimeSignatureString) => void;
  loadExternalContent: (content: GridContent) => void;
  markClean: () => void;
  selectBar: (barId: string | null) => void;

  addBar: () => void;
  addBarToSection: (sectionId: string) => void;
  removeBar: (barId: string) => void;

  addChordToBar: (barId: string, symbol: string) => void;
  removeChordFromBar: (barId: string, index: number) => void;
  updateChordInBar: (barId: string, index: number, symbol: string) => void;
  updateChordBeats: (barId: string, index: number, beats: number | null) => void;
  setBarRepeatEnd: (barId: string, repeatEnd: RepeatEnd | undefined) => void;

  addSection: (timeSignature: TimeSignatureString) => void;
  renameSection: (sectionId: string, name: string) => void;
  setSectionTimeSignature: (sectionId: string, ts: TimeSignatureString) => void;
}

function parseSlot(symbol: string): ChordSlot {
  const res = parseChord(symbol);
  return { symbol, parsed: res.value ?? null };
}

function updateBar(bars: Bar[], barId: string, updater: (bar: Bar) => Bar): Bar[] {
  return bars.map((b) => (b.id === barId ? updater(b) : b));
}

function updateBarInSections(sections: Section[], barId: string, updater: (bar: Bar) => Bar): Section[] {
  return sections.map((s) => ({
    ...s,
    bars: updateBar(s.bars, barId, updater),
  }));
}

function syncBars(content: GridContent): GridContent {
  if (!content.sections) return content;
  return { ...content, bars: content.sections.flatMap((s) => s.bars) };
}

function migrateToSections(content: GridContent, defaultTs: TimeSignatureString): GridContent {
  if (content.sections && content.sections.length > 0) return content;
  const section: Section = {
    id: nanoid(8),
    name: 'Section A',
    timeSignature: defaultTs,
    bars: content.bars,
  };
  return syncBars({ ...content, sections: [section] });
}

const SECTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function nextSectionName(sections: Section[]): string {
  const letter = SECTION_LETTERS[sections.length % SECTION_LETTERS.length] ?? 'A';
  return `Section ${letter}`;
}

export const useEditorStore = create<EditorState>((set) => ({
  localContent: null,
  selectedBarId: null,
  isDirty: false,

  setContent: (content, defaultTimeSignature) =>
    set({ localContent: migrateToSections(content, defaultTimeSignature), isDirty: false }),

  loadExternalContent: (content) =>
    set((state) => ({
      localContent: content.sections
        ? syncBars(content)
        : migrateToSections(content, state.localContent?.sections?.[0]?.timeSignature ?? '4/4'),
      isDirty: true,
    })),

  markClean: () => set({ isDirty: false }),

  selectBar: (barId) => set({ selectedBarId: barId }),

  addBar: () =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const sections = state.localContent.sections;
      const lastSection = sections[sections.length - 1];
      if (!lastSection) return state;
      const newBar: Bar = { id: nanoid(8), chords: [] };
      const newSections = sections.map((s) =>
        s.id === lastSection.id ? { ...s, bars: [...s.bars, newBar] } : s,
      );
      return {
        localContent: syncBars({ ...state.localContent, sections: newSections }),
        isDirty: true,
        selectedBarId: newBar.id,
      };
    }),

  addBarToSection: (sectionId) =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const newBar: Bar = { id: nanoid(8), chords: [] };
      const newSections = state.localContent.sections.map((s) =>
        s.id === sectionId ? { ...s, bars: [...s.bars, newBar] } : s,
      );
      return {
        localContent: syncBars({ ...state.localContent, sections: newSections }),
        isDirty: true,
        selectedBarId: newBar.id,
      };
    }),

  removeBar: (barId) =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const newSections = state.localContent.sections.map((s) => ({
        ...s,
        bars: s.bars.filter((b) => b.id !== barId),
      }));
      return {
        localContent: syncBars({ ...state.localContent, sections: newSections }),
        isDirty: true,
        selectedBarId: state.selectedBarId === barId ? null : state.selectedBarId,
      };
    }),

  addChordToBar: (barId, symbol) =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const newSections = updateBarInSections(state.localContent.sections, barId, (bar) => ({
        ...bar,
        chords: [...bar.chords, parseSlot(symbol)],
      }));
      return { localContent: syncBars({ ...state.localContent, sections: newSections }), isDirty: true };
    }),

  removeChordFromBar: (barId, index) =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const newSections = updateBarInSections(state.localContent.sections, barId, (bar) => ({
        ...bar,
        chords: bar.chords.filter((_, i) => i !== index),
      }));
      return { localContent: syncBars({ ...state.localContent, sections: newSections }), isDirty: true };
    }),

  updateChordInBar: (barId, index, symbol) =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const newSections = updateBarInSections(state.localContent.sections, barId, (bar) => ({
        ...bar,
        chords: bar.chords.map((slot, i) => (i === index ? parseSlot(symbol) : slot)),
      }));
      return { localContent: syncBars({ ...state.localContent, sections: newSections }), isDirty: true };
    }),

  updateChordBeats: (barId, index, beats) =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const newSections = updateBarInSections(state.localContent.sections, barId, (bar) => ({
        ...bar,
        chords: bar.chords.map((slot, i) => (i === index ? { ...slot, beats } : slot)),
      }));
      return { localContent: syncBars({ ...state.localContent, sections: newSections }), isDirty: true };
    }),

  setBarRepeatEnd: (barId, repeatEnd) =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const newSections = updateBarInSections(state.localContent.sections, barId, (bar) => ({
        ...bar,
        repeatEnd,
      }));
      return { localContent: syncBars({ ...state.localContent, sections: newSections }), isDirty: true };
    }),

  addSection: (timeSignature) =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const sections = state.localContent.sections;
      const newSection: Section = {
        id: nanoid(8),
        name: nextSectionName(sections),
        timeSignature,
        bars: [],
      };
      const newSections = [...sections, newSection];
      return {
        localContent: syncBars({ ...state.localContent, sections: newSections }),
        isDirty: true,
      };
    }),

  renameSection: (sectionId, name) =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const newSections = state.localContent.sections.map((s) =>
        s.id === sectionId ? { ...s, name } : s,
      );
      return { localContent: { ...state.localContent, sections: newSections }, isDirty: true };
    }),

  setSectionTimeSignature: (sectionId, ts) =>
    set((state) => {
      if (!state.localContent?.sections) return state;
      const newSections = state.localContent.sections.map((s) =>
        s.id === sectionId ? { ...s, timeSignature: ts } : s,
      );
      return { localContent: { ...state.localContent, sections: newSections }, isDirty: true };
    }),
}));
