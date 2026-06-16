/**
 * Built-in harmony patterns described as **data** (degree-in-semitones + quality
 * token), not hard-coded logic. Adding a pattern is a new entry here.
 * See docs/features/03-harmony-generator.md.
 */

/** One chord of a pattern: scale degree in semitones above the tonic + quality suffix. */
export interface PatternStep {
  degree: number;
  quality: string;
}

export interface PatternContext {
  bars: number;
  random: () => number;
}

export interface PatternDef {
  id: string;
  name: string;
  description: string;
  defaultBars: number;
  variableLength: boolean;
  /** Fixed sequence (one chord per bar), tiled/truncated to the requested length. */
  steps?: PatternStep[];
  /** Generated sequence of exactly `ctx.bars` steps (for parametric/random patterns). */
  build?: (ctx: PatternContext) => PatternStep[];
}

/** Diatonic seventh chords of a major key, by degree (used by the random pattern). */
const DIATONIC_MAJOR: PatternStep[] = [
  { degree: 0, quality: 'maj7' },
  { degree: 2, quality: 'm7' },
  { degree: 4, quality: 'm7' },
  { degree: 5, quality: 'maj7' },
  { degree: 7, quality: '7' },
  { degree: 9, quality: 'm7' },
  { degree: 11, quality: 'm7b5' },
];

export const PATTERNS: PatternDef[] = [
  {
    id: 'ii-V-I-major',
    name: 'ii–V–I (major)',
    description: 'The defining major cadence: ii7 – V7 – Imaj7 (tonic held for two bars).',
    defaultBars: 4,
    variableLength: false,
    steps: [
      { degree: 2, quality: 'm7' },
      { degree: 7, quality: '7' },
      { degree: 0, quality: 'maj7' },
      { degree: 0, quality: 'maj7' },
    ],
  },
  {
    id: 'ii-V-I-minor',
    name: 'ii–V–i (minor)',
    description: 'Minor cadence: iiø7 – V7♭9 – i7 (tonic held for two bars).',
    defaultBars: 4,
    variableLength: false,
    steps: [
      { degree: 2, quality: 'm7b5' },
      { degree: 7, quality: '7b9' },
      { degree: 0, quality: 'm7' },
      { degree: 0, quality: 'm7' },
    ],
  },
  {
    id: 'circle-of-fifths',
    name: 'Circle of fifths',
    description: 'Dominant 7ths cycling down by perfect fifths from the tonic.',
    defaultBars: 8,
    variableLength: true,
    build: ({ bars }) =>
      Array.from({ length: bars }, (_, i) => ({ degree: (i * 5) % 12, quality: '7' })),
  },
  {
    id: 'rhythm-changes-a',
    name: 'Rhythm changes (A fragment)',
    description: 'First phrase of the “Rhythm changes” A-section: I – VI7 – ii – V.',
    defaultBars: 4,
    variableLength: false,
    steps: [
      { degree: 0, quality: 'maj7' },
      { degree: 9, quality: '7' },
      { degree: 2, quality: 'm7' },
      { degree: 7, quality: '7' },
    ],
  },
  {
    id: 'modal-vamp',
    name: 'Modal vamp (Dorian)',
    description: 'Two-chord dorian vamp: i7 – IV7, repeated.',
    defaultBars: 4,
    variableLength: true,
    build: ({ bars }) =>
      Array.from({ length: bars }, (_, i) =>
        i % 2 === 0 ? { degree: 0, quality: 'm7' } : { degree: 5, quality: '7' },
      ),
  },
  {
    id: 'dominant-chain',
    name: 'Dominant chain',
    description: 'A chain of dominant 7ths a fifth apart resolving toward the tonic.',
    defaultBars: 4,
    variableLength: true,
    build: ({ bars }) =>
      Array.from({ length: bars }, (_, i) => ({
        degree: ((bars - i) * 7) % 12,
        quality: '7',
      })),
  },
  {
    id: 'random-diatonic',
    name: 'Random diatonic',
    description: 'Random diatonic 7th chords of the major key (deterministic with a seed).',
    defaultBars: 8,
    variableLength: true,
    build: ({ bars, random }) =>
      Array.from({ length: bars }, () => {
        const idx = Math.floor(random() * DIATONIC_MAJOR.length);
        return DIATONIC_MAJOR[idx]!;
      }),
  },
  {
    id: 'diatonic',
    name: 'Diatonic',
    description: 'All diatonic 7th chords of the major key in order: Imaj7 – ii7 – … – viiø7.',
    defaultBars: 7,
    variableLength: false,
    steps: DIATONIC_MAJOR,
  },
  {
    id: 'chromatic',
    name: 'Chromatic',
    description: 'Dominant 7th chords ascending through all twelve chromatic degrees.',
    defaultBars: 12,
    variableLength: false,
    steps: Array.from({ length: 12 }, (_, i) => ({ degree: i, quality: '7' })),
  },
  {
    id: 'turnaround',
    name: 'Jazz turnaround (I–vi–ii–V)',
    description: 'Classic turnaround back to the top of the form: Imaj7 – vi7 – ii7 – V7.',
    defaultBars: 4,
    variableLength: false,
    steps: [
      { degree: 0, quality: 'maj7' },
      { degree: 9, quality: 'm7' },
      { degree: 2, quality: 'm7' },
      { degree: 7, quality: '7' },
    ],
  },
];

export const PATTERNS_BY_ID = new Map(PATTERNS.map((p) => [p.id, p]));
