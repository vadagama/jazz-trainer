import type { ClickSound } from '@jazz/shared';

// ─── Metronome ───────────────────────────────────────────────────────────────

export interface MetronomeSampleDef {
  id: ClickSound;
  label: string;
  url: string;
}

export const METRONOME_SAMPLES: readonly MetronomeSampleDef[] = [
  {
    id: 'analog-metronome',
    label: 'Analog Metronome',
    url: '/samples/aac/metronome/analog-metronome.m4a',
  },
  { id: 'button-click', label: 'Button Click', url: '/samples/aac/metronome/button-click.m4a' },
  { id: 'drum-stick', label: 'Drum Stick', url: '/samples/aac/metronome/drum-stick.m4a' },
  { id: 'retro-stick', label: 'Retro Stick', url: '/samples/aac/metronome/retro-stick.m4a' },
  { id: 'switch', label: 'Switch', url: '/samples/aac/metronome/switch.m4a' },
  {
    id: 'cross-stick',
    label: 'Cross-Stick (Rim Click)',
    url: '/samples/aac/metronome/cross-stick.m4a',
  },
  { id: 'hh-chick', label: 'Hi-Hat Foot Chick', url: '/samples/aac/metronome/hh-chick.m4a' },
  { id: 'hh-closed', label: 'Hi-Hat Closed', url: '/samples/aac/metronome/hh-closed.m4a' },
];

export const METRONOME_SAMPLE_BY_ID: Record<ClickSound, MetronomeSampleDef> = Object.fromEntries(
  METRONOME_SAMPLES.map((s) => [s.id, s]),
) as Record<ClickSound, MetronomeSampleDef>;

// ─── Pitched instruments — Tone.Sampler note→URL maps ────────────────────────

/** { [scientificNote]: filename-relative-to-baseUrl } for Tone.Sampler */
export type NoteMap = Record<string, string>;

export interface SamplerDef {
  baseUrl: string;
  notes: NoteMap;
}

/**
 * Anchor notes for pluck sampler: every 3 semitones across C2–C4.
 * Tone.js interpolates ≤ ±2 semitones from each anchor.
 * Filenames use lowercase with flats only (ab, bb, db, eb, gb).
 */
const BASS_PLUCK_ANCHOR_NOTES = ['C2', 'Eb2', 'Gb2', 'A2', 'C3', 'Eb3', 'Gb3', 'A3', 'C4'] as const;

/**
 * Anchor notes for mute sampler: every 3 semitones starting from Db2
 * (lowest available mute sample). Covers the full walking bass range Db2–Bb3.
 */
const BASS_MUTE_ANCHOR_NOTES = ['Db2', 'E2', 'G2', 'Bb2', 'Db3', 'E3', 'G3', 'Bb3'] as const;

/** Build a NoteMap for the pluck articulation at the given RR variant (1–4). */
export function buildBassPluckUrls(rr: 1 | 2 | 3 | 4): NoteMap {
  return Object.fromEntries(
    BASS_PLUCK_ANCHOR_NOTES.map((note) => [
      note,
      `pluck/sneakybass_${note.toLowerCase()}_pluck_rr${rr}.m4a`,
    ]),
  );
}

/** Build a NoteMap for the mute articulation at the given RR variant (1–4). */
export function buildBassMuteUrls(rr: 1 | 2 | 3 | 4): NoteMap {
  return Object.fromEntries(
    BASS_MUTE_ANCHOR_NOTES.map((note) => [
      note,
      `mute/sneakybass_${note.toLowerCase()}_mute_rr${rr}.m4a`,
    ]),
  );
}

export const BASS_SAMPLER: SamplerDef = {
  baseUrl: '/samples/aac/bass/',
  notes: buildBassPluckUrls(1),
};

export const PIANO_SAMPLER: SamplerDef = {
  baseUrl: '/samples/piano/',
  notes: {},
};

// ─── Drumkit — per-voice samples ─────────────────────────────────────────────

export type DrumVoice = 'kick' | 'snare' | 'hihat-closed' | 'hihat-open' | 'ride' | 'crash';

export interface DrumkitDef {
  baseUrl: string;
  voices: Partial<Record<DrumVoice, string>>;
}

export const DRUMS_DRUMKIT: DrumkitDef = {
  baseUrl: '/samples/drums/',
  voices: {},
};
