/**
 * Piano sampler URL builders + MIDI helpers (piano-специфичные).
 *
 * Извлечено из бывшего localModel.ts. Не дублируется в shared-пакете, т.к.
 * привязано к конкретным сэмплам upright/salamander.
 */
import type { VoiceRole } from '@jazz/music-core';

/** Piano comping register: C3 (48) to C6 (84). */
export const NOTE_MIN = 48;
export const NOTE_MAX = 84;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Voice roles available for adding new atoms in the molecule editor.
 *
 * A molecule atom no longer bakes in an interval or MIDI note — it names
 * which part of the *currently resolved* chord voicing to play (see
 * VoiceRole in @jazz/music-core). The engine resolves actual pitches from
 * the real chord + density + tension at playback time, so a single rhythm
 * works over any chord quality. See docs/PIANO-EXTENDED-ARRANGEMENT-2.md.
 */
export const VOICE_ROLES: readonly VoiceRole[] = ['chord', 'shell', 'top', 'bass', 'upper'];

/** Short labels — must fit the narrow piano-roll row-label column (single line). */
const ROLE_LABELS: Record<string, string> = {
  chord: 'Аккорд',
  shell: 'Shell',
  top: 'Верх',
  bass: 'Бас',
  upper: 'Надстр.',
};

/** Full description for tooltips — role labels are truncated in the grid itself. */
const ROLE_DESCRIPTIONS: Record<string, string> = {
  chord: 'Аккорд — весь текущий voicing',
  shell: 'Shell — 3 + 7 (нижние 2 ноты)',
  top: 'Верхний голос voicing’а',
  bass: 'Бас — самый нижний голос',
  upper: 'Надстройка / цветные тона выше shell (upper structure, если включена tension)',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function roleDescription(role: string): string {
  return ROLE_DESCRIPTIONS[role] ?? role;
}

export function midiToName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  return `${NOTE_NAMES[pc]}${Math.floor(midi / 12) - 1}`;
}

export function nameToMidi(name: string): number {
  const m = /^([A-G])(#?)(\d+)$/.exec(name);
  if (!m) return -1;
  const semitones: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = semitones[m[1]!]! + (m[2] === '#' ? 1 : 0);
  return (parseInt(m[3]!, 10) + 1) * 12 + base;
}

// ─── Sampler anchors ──────────────────────────────────────────────────────────

const UPRIGHT_ANCHORS: Record<string, string> = {
  C1: 'C0_vl2_rr1.m4a',
  C2: 'C1_vl2_rr1.m4a',
  C3: 'C2_vl2_rr1.m4a',
  C4: 'C3_vl2_rr1.m4a',
  C5: 'C4_vl2_rr1.m4a',
  C6: 'C5_vl2_rr1.m4a',
  C7: 'C6_vl2_rr1.m4a',
  G1: 'G0_vl2_rr1.m4a',
  G2: 'G1_vl2_rr1.m4a',
  G3: 'G2_vl2_rr1.m4a',
  G4: 'G3_vl2_rr1.m4a',
  G5: 'G4_vl2_rr1.m4a',
  G6: 'G5_vl2_rr1.m4a',
};

const SALAMANDER_ANCHORS: Record<string, string> = {
  A0: 'A0v12.m4a',
  A1: 'A1v12.m4a',
  A2: 'A2v12.m4a',
  A3: 'A3v12.m4a',
  A4: 'A4v12.m4a',
  A5: 'A5v12.m4a',
  A6: 'A6v12.m4a',
  A7: 'A7v12.m4a',
  C1: 'C1v12.m4a',
  C2: 'C2v12.m4a',
  C3: 'C3v12.m4a',
  C4: 'C4v12.m4a',
  C5: 'C5v12.m4a',
  C6: 'C6v12.m4a',
  C7: 'C7v12.m4a',
  C8: 'C8v12.m4a',
  'D#1': 'Ds1v12.m4a',
  'D#2': 'Ds2v12.m4a',
  'D#3': 'Ds3v12.m4a',
  'D#4': 'Ds4v12.m4a',
  'D#5': 'Ds5v12.m4a',
  'D#6': 'Ds6v12.m4a',
  'D#7': 'Ds7v12.m4a',
  'F#1': 'Fs1v12.m4a',
  'F#2': 'Fs2v12.m4a',
  'F#3': 'Fs3v12.m4a',
  'F#4': 'Fs4v12.m4a',
  'F#5': 'Fs5v12.m4a',
  'F#6': 'Fs6v12.m4a',
  'F#7': 'Fs7v12.m4a',
};

const ANCHOR_NOTE_NAMES: Record<string, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
};

function nearestAnchor(midi: number, anchors: Record<string, string>): string | undefined {
  let bestDist = Infinity;
  let bestNote: string | undefined;
  for (const key of Object.keys(anchors)) {
    const m = /^([A-G]#?)(\d+)$/.exec(key);
    if (!m) continue;
    const octave = parseInt(m[2]!, 10);
    const anchorMidi = (octave + 1) * 12 + (ANCHOR_NOTE_NAMES[m[1]!] ?? 0);
    const dist = Math.abs(midi - anchorMidi);
    if (dist < bestDist) {
      bestDist = dist;
      bestNote = key;
    }
  }
  return bestNote;
}

/** Build sampler URLs for upright piano (nearest C/G anchor ±2 semitones). */
export function buildUprightSamplerUrls(): Record<string, string> {
  const urls: Record<string, string> = {};
  const base = '/samples/aac/piano/upright/';
  for (let midi = NOTE_MIN; midi <= NOTE_MAX; midi++) {
    const anchor = nearestAnchor(midi, UPRIGHT_ANCHORS);
    if (anchor && UPRIGHT_ANCHORS[anchor]) {
      urls[midiToName(midi)] = base + UPRIGHT_ANCHORS[anchor];
    }
  }
  return urls;
}

/** Build sampler URLs for Salamander Grand Piano. */
export function buildSalamanderSamplerUrls(): Record<string, string> {
  const urls: Record<string, string> = {};
  const base = '/samples/aac/piano/salamander/';
  for (let midi = NOTE_MIN; midi <= NOTE_MAX; midi++) {
    const anchor = nearestAnchor(midi, SALAMANDER_ANCHORS);
    if (anchor && SALAMANDER_ANCHORS[anchor]) {
      urls[midiToName(midi)] = base + SALAMANDER_ANCHORS[anchor];
    }
  }
  return urls;
}

/**
 * Ключи должны совпадать с `instrumentId` вариантов инструмента
 * (`getInstrumentGroup('piano').variants` в styleProfile.ts) — Salamander там
 * зарегистрирован под id `'piano'` (тот же id, что и у реального плеера),
 * а не `'salamander'`.
 */
export const SAMPLER_URL_BUILDERS: Record<string, () => Record<string, string>> = {
  'upright-piano': buildUprightSamplerUrls,
  piano: buildSalamanderSamplerUrls,
};
