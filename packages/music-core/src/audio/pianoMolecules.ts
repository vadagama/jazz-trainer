/**
 * Seed piano molecules — pure rhythm skeletons over voice roles.
 *
 * Each molecule describes *when*, *how loud* and *which part of the current
 * voicing* (role: 'chord'|'shell'|'top'|'bass'|'upper') to play —
 * never a baked-in interval or chord quality. The actual pitches are resolved
 * at playback time from the real chord + density + tension level via
 * `buildPianoVoicing()` + `selectVoicingRole()` (see pianoVoicing.ts).
 *
 * This is what lets a single rhythm (e.g. Charleston) sound correct over any
 * chord quality and any tension setting, instead of requiring one molecule
 * per (rhythm × voicing × chord-quality) combination.
 * See docs/PIANO-EXTENDED-ARRANGEMENT-2.md.
 *
 // 45 base rhythms covering all jazz piano comping idioms, × 5 styles.
 */
import type { PianoMolecule, PianoAtom, PianoPatternStyle } from './pianoPatternTypes.js';
import { GENERATED_PIANO_MOLECULES } from './pianoMoleculesGenerated.js';

const PPQ = 480;

// Beat boundaries in 4/4
const B1 = 0;
const B2 = PPQ;
const B3 = PPQ * 2;
const B4 = PPQ * 3;

// Eighth-note subdivisions
const _8 = PPQ / 2;
const _8off = _8;

// Sixteenth-note subdivisions
const _16 = PPQ / 4;
const _16e = _16;
const _16and = _16 * 2;
const _16a = _16 * 3;

function atom(role: PianoAtom['sound'], tick: number, vel: number, dur = PPQ / 2): PianoAtom {
  return { sound: role, atTick: tick, velocity: vel, durationTicks: dur };
}

/** A single full-voicing chord hit — the engine resolves the actual notes. */
function voicingAtoms(tick: number, vel = 0.55, dur = PPQ / 2): PianoAtom[] {
  return [atom('chord', tick, vel, dur)];
}

// ─── Style-agnostic base molecules (45 patterns) ────────────────────────────

type MolDraft = Omit<PianoMolecule, 'style'>;

const BASE_MOLECULES: MolDraft[] = [
  // ── Sparse (beginner-friendly, 5 patterns) ──────────────────────────────
  {
    id: 'piano-whole-note',
    label: 'Whole Note — chord on beat 1, held',
    bars: 1,
    atoms: voicingAtoms(B1, 0.54, PPQ * 4),
    category: 'groove',
    tags: ['sparse', 'beginner', 'whole-note'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'piano-half-notes',
    label: 'Half Notes — chords on 1 and 3',
    bars: 1,
    atoms: [...voicingAtoms(B1, 0.55, PPQ * 2), ...voicingAtoms(B3, 0.49, PPQ * 2)],
    category: 'groove',
    tags: ['basic', 'sparse', 'two-feel'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'piano-one-three',
    label: '1 and 3 — sparse downbeats',
    bars: 1,
    atoms: [...voicingAtoms(B1, 0.54), ...voicingAtoms(B3, 0.48)],
    category: 'groove',
    tags: ['basic', 'sparse'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'piano-two-and-four',
    label: '2 and 4 — backbeat comping',
    bars: 1,
    atoms: [...voicingAtoms(B2, 0.52), ...voicingAtoms(B4, 0.5)],
    category: 'groove',
    tags: ['basic'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'piano-basie-2-4',
    label: 'Basie 2 & 4 — sparse, punchy',
    bars: 1,
    atoms: [...voicingAtoms(B2, 0.45, PPQ / 3), ...voicingAtoms(B4, 0.48, PPQ / 3)],
    category: 'groove',
    tags: ['swing', 'sparse', 'basie'],
    complexity: { min: 1, max: 2 },
  },

  // ── Charleston family (3 patterns) ──────────────────────────────────────
  {
    id: 'piano-charleston',
    label: 'Charleston — 1, 2&',
    bars: 1,
    atoms: [...voicingAtoms(B1, 0.55), ...voicingAtoms(B2 + _8off, 0.48)],
    category: 'groove',
    tags: ['swing', 'charleston', 'basic'],
    complexity: { min: 1, max: 3 },
  },
  {
    id: 'piano-reverse-charleston',
    label: 'Reverse Charleston — 1&, 3',
    bars: 1,
    atoms: [...voicingAtoms(B1 + _8off, 0.48), ...voicingAtoms(B3, 0.54)],
    category: 'groove',
    tags: ['swing', 'syncopated'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-charleston-sparse',
    label: 'Charleston Sparse — 1, 2&, 3',
    bars: 1,
    atoms: [...voicingAtoms(B1, 0.54), ...voicingAtoms(B2 + _8off, 0.46), ...voicingAtoms(B3, 0.5)],
    category: 'groove',
    tags: ['swing', 'charleston', 'sparse'],
    complexity: { min: 1, max: 3 },
  },

  // ── Medium comping (5 patterns) ─────────────────────────────────────────
  {
    id: 'piano-quarter-notes',
    label: 'Quarter Notes — all 4 beats',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.53),
      ...voicingAtoms(B2, 0.42),
      ...voicingAtoms(B3, 0.5),
      ...voicingAtoms(B4, 0.44),
    ],
    category: 'groove',
    tags: ['basic', 'dense', 'four-beat'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'piano-quarter-comp',
    label: 'Quarter Comp — staccato quarters',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.53, PPQ / 3),
      ...voicingAtoms(B2, 0.45, PPQ / 3),
      ...voicingAtoms(B3, 0.5, PPQ / 3),
      ...voicingAtoms(B4, 0.48, PPQ / 3),
    ],
    category: 'groove',
    tags: ['basic', 'dense'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'piano-bossa-top',
    label: 'Bossa Top — 1, 2&, 3, 4',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.55),
      ...voicingAtoms(B2 + _8off, 0.5),
      ...voicingAtoms(B3, 0.52),
      ...voicingAtoms(B4, 0.46),
    ],
    category: 'groove',
    tags: ['swing', 'syncopated', 'medium'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-anticipation-push',
    label: 'Anticipation Push — 1, 2, 3, 4&',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.54),
      ...voicingAtoms(B2, 0.5),
      ...voicingAtoms(B3, 0.52),
      ...voicingAtoms(B4 + _8off, 0.46),
    ],
    category: 'groove',
    tags: ['swing', 'medium', 'anticipation'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-garland',
    label: 'Red Garland — 1, 2&, 3, 3&',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.54),
      ...voicingAtoms(B2 + _8off, 0.46),
      ...voicingAtoms(B3, 0.52),
      ...voicingAtoms(B3 + _8off, 0.44),
    ],
    category: 'groove',
    tags: ['swing', 'garland', 'syncopated'],
    complexity: { min: 2, max: 3 },
  },

  // ── Dense comping (4 patterns) ──────────────────────────────────────────
  {
    id: 'piano-walking-comp',
    label: 'Walking Comp — beat + offbeat 1–3',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.53),
      // Connective offbeat pickups — ghosted well below the downbeats they
      // lead into, unlike a genuine syncopated accent (Charleston/Kelly Push).
      ...voicingAtoms(B1 + _8off, 0.22),
      ...voicingAtoms(B2, 0.46),
      ...voicingAtoms(B2 + _8off, 0.2),
      ...voicingAtoms(B3, 0.5),
      ...voicingAtoms(B3 + _8off, 0.22),
      ...voicingAtoms(B4, 0.44),
    ],
    category: 'groove',
    tags: ['swing', 'dense', 'walking'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-full-comp',
    label: 'Full 8th Comp — all 8th notes except beat 4',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.53),
      // Ghosted connective pickups (see piano-walking-comp).
      ...voicingAtoms(B1 + _8off, 0.2),
      ...voicingAtoms(B2, 0.46),
      ...voicingAtoms(B2 + _8off, 0.2),
      ...voicingAtoms(B3, 0.5),
      ...voicingAtoms(B3 + _8off, 0.22),
      // Not ghosted: this is the bar's beat-4 substitute (pattern has no
      // downbeat-4 hit), not a pickup between two downbeats.
      ...voicingAtoms(B4 + _8off, 0.44),
    ],
    category: 'groove',
    tags: ['swing', 'dense', 'full-comping'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-shout',
    label: 'Shout Chorus — all 4 beats, loud',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.68),
      ...voicingAtoms(B2, 0.6),
      ...voicingAtoms(B3, 0.65),
      ...voicingAtoms(B4, 0.58),
    ],
    category: 'groove',
    tags: ['swing', 'dense', 'shout'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-kelly-push',
    label: 'Wynton Kelly — 1&, 2, 3&, 4',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1 + _8off, 0.44),
      ...voicingAtoms(B2, 0.52),
      ...voicingAtoms(B3 + _8off, 0.46),
      ...voicingAtoms(B4, 0.5),
    ],
    category: 'groove',
    tags: ['swing', 'kelly', 'push'],
    complexity: { min: 2, max: 3 },
  },

  // ── Offbeat/syncopated (4 patterns) ─────────────────────────────────────
  {
    id: 'piano-offbeat-2-4',
    label: 'Offbeat 2 & 4 — 2&, 4&',
    bars: 1,
    atoms: [...voicingAtoms(B2 + _8off, 0.47), ...voicingAtoms(B4 + _8off, 0.44)],
    category: 'groove',
    tags: ['swing', 'syncopated', 'offbeat'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-one-twoand-four',
    label: '1, 2&, 4',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.52),
      ...voicingAtoms(B2 + _8off, 0.45),
      ...voicingAtoms(B4, 0.46),
    ],
    category: 'groove',
    tags: ['swing', 'medium'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-oneand-three',
    label: '1&, 3',
    bars: 1,
    atoms: [...voicingAtoms(B1 + _8off, 0.45), ...voicingAtoms(B3, 0.52)],
    category: 'groove',
    tags: ['swing', 'syncopated'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-two-threeand',
    label: '2, 3&',
    bars: 1,
    atoms: [...voicingAtoms(B2, 0.46), ...voicingAtoms(B3 + _8off, 0.44)],
    category: 'groove',
    tags: ['swing', 'syncopated'],
    complexity: { min: 2, max: 3 },
  },

  // ── Bossa nova (3 patterns) ─────────────────────────────────────────────
  {
    id: 'piano-bossa-gilberto',
    label: 'Bossa Gilberto — 1, 2&, 4&',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.54),
      ...voicingAtoms(B2 + _8off, 0.5),
      ...voicingAtoms(B4 + _8off, 0.46),
    ],
    category: 'groove',
    tags: ['bossa', 'classic', 'gilberto'],
    complexity: { min: 1, max: 3 },
  },
  {
    id: 'piano-bossa-full',
    label: 'Bossa Full — 1, 2, 3&, 4&',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.54),
      ...voicingAtoms(B2, 0.46),
      ...voicingAtoms(B3 + _8off, 0.5),
      ...voicingAtoms(B4 + _8off, 0.46),
    ],
    category: 'groove',
    tags: ['bossa', 'classic'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-bossa-sync',
    label: 'Bossa Sync — 1&, 2, 3&, 4',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1 + _8off, 0.48),
      ...voicingAtoms(B2, 0.52),
      ...voicingAtoms(B3 + _8off, 0.48),
      ...voicingAtoms(B4, 0.5),
    ],
    category: 'groove',
    tags: ['bossa', 'syncopated'],
    complexity: { min: 2, max: 3 },
  },

  // ── Funk (3 patterns) ───────────────────────────────────────────────────
  {
    id: 'piano-funk-sync',
    label: 'Funk Sync — 1, 2&, 3&, 4',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.58, PPQ / 3),
      ...voicingAtoms(B2 + _8off, 0.48, PPQ / 3),
      ...voicingAtoms(B3 + _8off, 0.5, PPQ / 3),
      ...voicingAtoms(B4, 0.48, PPQ / 3),
    ],
    category: 'groove',
    tags: ['funk', 'syncopated'],
    complexity: { min: 1, max: 3 },
  },
  {
    id: 'piano-funk-tight',
    label: 'Funk Tight — 1, 1&, 3, 3&',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.58, PPQ / 3),
      ...voicingAtoms(B1 + _8off, 0.45, PPQ / 3),
      ...voicingAtoms(B3, 0.52, PPQ / 3),
      ...voicingAtoms(B3 + _8off, 0.45, PPQ / 3),
    ],
    category: 'groove',
    tags: ['funk', 'tight'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-funk-sixteenths',
    label: 'Funk 16ths — 1, 1a, 2&, 3, 3a, 4',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.58, PPQ / 4),
      ...voicingAtoms(B1 + _16a, 0.38, PPQ / 4),
      ...voicingAtoms(B2 + _16and, 0.45, PPQ / 4),
      ...voicingAtoms(B3, 0.52, PPQ / 4),
      ...voicingAtoms(B3 + _16a, 0.4, PPQ / 4),
      ...voicingAtoms(B4, 0.48, PPQ / 4),
    ],
    category: 'groove',
    tags: ['funk', '16th', 'stabs'],
    complexity: { min: 2, max: 3 },
  },

  // ── Latin montuno (3 patterns) ──────────────────────────────────────────
  {
    id: 'piano-montuno',
    label: 'Montuno — 1, 2&, 3, 4&',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.55),
      ...voicingAtoms(B2 + _8off, 0.5),
      ...voicingAtoms(B3, 0.52),
      ...voicingAtoms(B4 + _8off, 0.48),
    ],
    category: 'groove',
    tags: ['latin', 'montuno', 'syncopated'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-montuno-variant',
    label: 'Montuno Variant — 1&, 2, 3&, 4',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1 + _8off, 0.5),
      ...voicingAtoms(B2, 0.53),
      ...voicingAtoms(B3 + _8off, 0.5),
      ...voicingAtoms(B4, 0.52),
    ],
    category: 'groove',
    tags: ['latin', 'montuno'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-montuno-dense',
    label: 'Montuno Dense — 1, 1&, 2&, 3, 3&, 4&',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.54),
      ...voicingAtoms(B1 + _8off, 0.42),
      ...voicingAtoms(B2 + _8off, 0.46),
      ...voicingAtoms(B3, 0.52),
      ...voicingAtoms(B3 + _8off, 0.44),
      ...voicingAtoms(B4 + _8off, 0.42),
    ],
    category: 'groove',
    tags: ['latin', 'montuno', 'dense'],
    complexity: { min: 2, max: 3 },
  },

  // ── Ballad (3 patterns) ─────────────────────────────────────────────────
  {
    id: 'piano-ballad-whole',
    label: 'Ballad Whole — held chord on beat 1',
    bars: 1,
    atoms: voicingAtoms(B1, 0.5, PPQ * 3),
    category: 'groove',
    tags: ['ballad', 'sustained', 'pad'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'piano-ballad-half',
    label: 'Ballad Half — held chords on 1 and 3',
    bars: 1,
    atoms: [...voicingAtoms(B1, 0.5, PPQ * 2), ...voicingAtoms(B3, 0.44, PPQ * 2)],
    category: 'groove',
    tags: ['ballad', 'sustained', 'two-feel'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'piano-ballad-push',
    label: 'Ballad Push — 1, 2&, 3, 4& (gentle)',
    bars: 1,
    atoms: [
      ...voicingAtoms(B1, 0.48, PPQ),
      ...voicingAtoms(B2 + _8off, 0.36, PPQ / 2),
      ...voicingAtoms(B3, 0.44, PPQ),
      ...voicingAtoms(B4 + _8off, 0.36, PPQ / 2),
    ],
    category: 'groove',
    tags: ['ballad', 'syncopated', 'push'],
    complexity: { min: 2, max: 3 },
  },

  // ── Accents & anticipations (3 patterns) ────────────────────────────────
  {
    id: 'piano-anticipation-4and',
    label: 'Anticipation 4& — push to next chord',
    bars: 1,
    atoms: voicingAtoms(B4 + _8off, 0.46),
    category: 'accent',
    tags: ['anticipation', 'accent'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-twoand-only',
    label: '2& only — single syncopated stab',
    bars: 1,
    atoms: voicingAtoms(B2 + _8off, 0.45),
    category: 'accent',
    tags: ['sparse', 'accent'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'piano-four-and-sparse',
    label: '4& Sparse — anticipation hint',
    bars: 1,
    atoms: voicingAtoms(B4 + _8off, 0.43),
    category: 'accent',
    tags: ['anticipation', 'sparse'],
    complexity: { min: 1, max: 2 },
  },

  // ── Rest (1 pattern) ────────────────────────────────────────────────────
  {
    id: 'piano-rest',
    label: 'Rest — silence',
    bars: 1,
    atoms: [],
    category: 'texture',
    tags: ['sparse'],
    complexity: { min: 1, max: 1 },
  },

  // No dedicated "upper accent" molecules: the 'chord' role already carries
  // upper-structure color whenever `tension` engages (buildPianoVoicing merges
  // it into the same voicing array that 'chord' reads in full), so a separate
  // 'upper'-role hit firing alongside 'chord' would just re-trigger the same
  // notes. The 'upper' role stays available in VoiceRole for future
  // hand-authored molecules that want an isolated color-tones-only texture
  // (used instead of 'chord', not layered on top of it).

  // ── Passing / fill rhythms (10 patterns) ─────────────────────────────────
  // Rhythm skeleton only, tagged by the approach idiom they represent. The
  // engine resolves the actual pitches by pre-echoing the *next* chord's
  // voicing on these hits (see PianoInstrument.scheduleWithPatternEngine) —
  // no interval baked in, so any chord-to-chord move works.
  {
    id: 'piano-pass-chromatic-above',
    label: 'Chromatic Above — approach on beat 4',
    bars: 1,
    atoms: [atom('chord', B4, 0.42, PPQ / 2)],
    category: 'fill',
    tags: ['passing', 'chromatic-above', 'fill'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-pass-chromatic-below',
    label: 'Chromatic Below — approach on beat 4&',
    bars: 1,
    atoms: [atom('chord', B4 + _8off, 0.42, PPQ / 3)],
    category: 'fill',
    tags: ['passing', 'chromatic-below', 'fill'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-pass-dim-approach',
    label: 'Diminished Approach — on 4&',
    bars: 1,
    atoms: [atom('chord', B4 + _8off, 0.44, PPQ / 3)],
    category: 'fill',
    tags: ['passing', 'diminished', 'fill'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-pass-secondary-dom',
    label: 'Secondary Dominant — V7 of next chord on beat 4',
    bars: 1,
    atoms: [atom('chord', B4, 0.46, PPQ / 2)],
    category: 'fill',
    tags: ['passing', 'secondary-dominant', 'fill'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-pass-diatonic-ii-v',
    label: 'Diatonic ii-V — two hits on beats 4 and 4&',
    bars: 1,
    atoms: [atom('chord', B4, 0.42, PPQ / 3), atom('chord', B4 + _8off, 0.44, PPQ / 3)],
    category: 'fill',
    tags: ['passing', 'ii-V', 'fill'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-pass-tritone-sub',
    label: 'Tritone Sub — shell before next chord',
    bars: 1,
    atoms: [atom('chord', B4 + _8off, 0.44, PPQ / 2)],
    category: 'fill',
    tags: ['passing', 'tritone', 'fill'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-pass-dim-7',
    label: 'Dim7 Passing — between chords on 4&',
    bars: 1,
    atoms: [atom('chord', B4 + _8off, 0.45, PPQ / 3)],
    category: 'fill',
    tags: ['passing', 'diminished', 'fill'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-pass-backdoor',
    label: 'Backdoor — ♭VII7 approach on beat 4',
    bars: 1,
    atoms: [atom('chord', B4, 0.45, PPQ / 2)],
    category: 'fill',
    tags: ['passing', 'backdoor', 'fill'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'piano-pass-single-chromatic',
    label: 'Single Chromatic — sparse lead-in on 4&',
    bars: 1,
    atoms: [atom('chord', B4 + _8off, 0.4, PPQ / 3)],
    category: 'fill',
    tags: ['passing', 'chromatic', 'sparse', 'fill'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'piano-pass-enclosure',
    label: 'Enclosure — around target on beat 4',
    bars: 1,
    atoms: [
      atom('chord', B4 + _8off, 0.38, PPQ / 4),
      atom('chord', B4 + _8off + _16, 0.46, PPQ / 2),
    ],
    category: 'fill',
    tags: ['passing', 'chromatic', 'enclosure', 'fill'],
    complexity: { min: 2, max: 3 },
  },
];

// ─── Generate molecules for all styles ────────────────────────────────────

const STYLES: PianoPatternStyle[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

/** Triplet tick-step for swing/ballad (3 subdivisions per beat). */
const SWING_TICK_STEP = PPQ / 3;
/** One bar in ticks (4/4), used to clamp durations at bar boundary. */
const BAR_TICKS = PPQ * 4;

/** Snap a tick to the nearest swing-grid column so visual and audio align. */
function snapSwingTick(tick: number): number {
  return Math.round(tick / SWING_TICK_STEP) * SWING_TICK_STEP;
}

function generateMolecules(): PianoMolecule[] {
  const result: PianoMolecule[] = [];

  for (const style of STYLES) {
    const isSwing = style === 'swing' || style === 'ballad';
    for (const base of BASE_MOLECULES) {
      result.push({
        ...base,
        id: `${base.id}-${style}`,
        style,
        atoms: base.atoms.map((a) => {
          if (!isSwing) return { ...a };
          const atTick = snapSwingTick(a.atTick);
          const endTick = atTick + a.durationTicks;
          const durationTicks = endTick > BAR_TICKS ? BAR_TICKS - atTick : a.durationTicks;
          return { ...a, atTick, durationTicks };
        }),
      });
    }
  }

  return result;
}

// ─── Build base registry from generator ─────────────────────────────────────
const BASE_PIANO_MOLECULES: Record<string, PianoMolecule> = {};
const BASE_PIANO_MOLECULE_LIST: PianoMolecule[] = [];

for (const mol of generateMolecules()) {
  BASE_PIANO_MOLECULES[mol.id] = mol;
  BASE_PIANO_MOLECULE_LIST.push(mol);
}

/**
 * Итоговый реестр молекул. Если сгенерированный реестр (из Конструктора
 * фортепиано) непуст — он ПОЛНОСТЬЮ замещает базовый.
 */
const GENERATED_MOLECULES = GENERATED_PIANO_MOLECULES as Record<string, PianoMolecule>;

export const PIANO_MOLECULES: Record<string, PianoMolecule> =
  Object.keys(GENERATED_MOLECULES).length > 0 ? GENERATED_MOLECULES : BASE_PIANO_MOLECULES;

export const PIANO_MOLECULE_LIST: PianoMolecule[] = Object.values(PIANO_MOLECULES);

export function getPianoMoleculesForStyle(style: string): PianoMolecule[] {
  return PIANO_MOLECULE_LIST.filter((m) => m.style === style);
}
