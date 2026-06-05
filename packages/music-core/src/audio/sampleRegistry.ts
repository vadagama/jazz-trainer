import type { ClickSound } from '@jazz/shared';

// ─── Metronome ───────────────────────────────────────────────────────────────

export interface MetronomeSampleDef {
  id: ClickSound;
  label: string;
  url: string;
}

export const METRONOME_SAMPLES: readonly MetronomeSampleDef[] = [
  { id: 'analog-metronome', label: 'Analog Metronome', url: '/samples/metronome/analog-metronome.mp3' },
  { id: 'button-click',     label: 'Button Click',     url: '/samples/metronome/button-click.mp3' },
  { id: 'drum-stick',       label: 'Drum Stick',       url: '/samples/metronome/drum-stick.mp3' },
  { id: 'retro-stick',      label: 'Retro Stick',      url: '/samples/metronome/retro-stick.mp3' },
  { id: 'switch',           label: 'Switch',           url: '/samples/metronome/switch.mp3' },
];

export const METRONOME_SAMPLE_BY_ID: Record<ClickSound, MetronomeSampleDef> =
  Object.fromEntries(METRONOME_SAMPLES.map((s) => [s.id, s])) as Record<ClickSound, MetronomeSampleDef>;

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
      `pluck/sneakybass_${note.toLowerCase()}_pluck_rr${rr}.ogg`,
    ]),
  );
}

/** Build a NoteMap for the mute articulation at the given RR variant (1–4). */
export function buildBassMuteUrls(rr: 1 | 2 | 3 | 4): NoteMap {
  return Object.fromEntries(
    BASS_MUTE_ANCHOR_NOTES.map((note) => [
      note,
      `mute/sneakybass_${note.toLowerCase()}_mute_rr${rr}.ogg`,
    ]),
  );
}

export const BASS_SAMPLER: SamplerDef = {
  baseUrl: '/samples/bass/',
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
