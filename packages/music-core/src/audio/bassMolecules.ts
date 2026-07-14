/**
 * Bass molecules — pure rhythm skeletons over {@link BassArticulation}.
 *
 * Each atom says *when*, *how loud*, *how long*, and *which articulation* —
 * never a baked-in chord step or pitch. **Which** chord degree to play is
 * decided by the {@link BassStepEngine} at runtime (style + tension + phrasing
 * + beat position), exactly like piano's VoiceRole → buildPianoVoicing. This
 * is what lets one molecule sound correct over any chord, key, and tension.
 *
 * Articulation palette (mirrors {@link BassArticulation}):
 *  - **regular** — full sustained tone (walking quarters, half-notes, downbeats)
 *  - **muted**   — damped/ghost-muted percussive tone (syncopations, approaches,
 *                  funk chatter)
 *  - **rel**     — ultra-short release tail for fast accents / phrase endings
 *                  (electric only)
 *  - **stac**    — sharp staccato punches (offbeats, montuno stabs; electric only)
 *
 * Grid resolution reaches **32nd notes** (`PPQ/8`) and free offsets for funk
 * chatter, matching the drum molecule density.
 *
 * Complexity scale is 1–3 (low / medium / high), matching drums & piano.
 *
 * @see docs/BASS.md
 */
import type { BassArticulation } from './instrument.js';
import type { BassAtom, BassMolecule } from './bassPatternTypes.js';

const PPQ = 480;

// ─── Beat / subdivision offsets in a 4/4 bar (straight ticks) ────────────────
const B1 = 0;
const B2 = PPQ;
const B3 = PPQ * 2;
const B4 = PPQ * 3;
const _8 = PPQ / 2; // eighth
const _8off = _8;
const _16 = PPQ / 4; // sixteenth
const _32 = PPQ / 8; // thirty-second
const B1and = B1 + _8;
const B1e = B1 + _16;
const B1a = B1 + _16 * 3;
const B2e = B2 + _16;
const B2and = B2 + _8;
const B2a = B2 + _16 * 3;
const B3e = B3 + _16;
const B3and = B3 + _8;
const B3a = B3 + _16 * 3;
const B4e = B4 + _16;
const B4and = B4 + _8;
const B4a = B4 + _16 * 3;

// ─── Atom helper ─────────────────────────────────────────────────────────────

function atom(
  articulation: BassArticulation,
  tick: number,
  velocity: number,
  durationTicks = Math.floor(PPQ * 0.92),
): BassAtom {
  return { sound: articulation, atTick: tick, velocity, durationTicks };
}

/** Quarter-note duration (walking-bass slot). */
const Q = PPQ;
/** Half-note duration (two-feel / bossa slots). */
const H = PPQ * 2;

// ════════════════════════════════════════════════════════════════════════════
// UPRIGHT BASS MOLECULES — palette { regular, muted }
// Styles: swing (walking), bossa (root-5th), ballad (two-feel)
// ════════════════════════════════════════════════════════════════════════════

const UPRIGHT_MOLECULE_DRAFTS: Omit<BassMolecule, 'style'>[] = [
  // ── Swing: walking bass ──────────────────────────────────────────────────
  {
    id: 'bass-up-swing-walk-basic',
    label: 'Walking — 4 quarters (step engine picks degrees)',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.82, Q),
      atom('regular', B2, 0.68, Q),
      atom('regular', B3, 0.76, Q),
      atom('regular', B4, 0.7, Q),
    ],
    category: 'groove',
    tags: ['walking', 'beginner'],
    complexity: { min: 1, max: 1 },
  },
  {
    id: 'bass-up-swing-walk-135',
    label: 'Walking — quarters with muted approach on beat 4',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.82, Q),
      atom('regular', B2, 0.68, Q),
      atom('regular', B3, 0.76, Q),
      atom('muted', B4, 0.7, Q),
    ],
    category: 'groove',
    tags: ['walking', 'approach'],
    complexity: { min: 2, max: 2 },
    conditions: {},
  },
  {
    id: 'bass-up-swing-walk-5173',
    label: 'Walking — quarters, muted last beat',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.82, Q),
      atom('regular', B2, 0.68, Q),
      atom('regular', B3, 0.76, Q),
      atom('muted', B4, 0.66, Q),
    ],
    category: 'groove',
    tags: ['walking', 'inner'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'bass-up-swing-walk-approach',
    label: 'Walking — muted chromatic approach on beat 4',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.82, Q),
      atom('regular', B2, 0.68, Q),
      atom('regular', B3, 0.76, Q),
      atom('muted', B4, 0.66, Q),
    ],
    category: 'groove',
    tags: ['walking', 'approach', 'chromatic'],
    complexity: { min: 3, max: 3 },
  },
  {
    id: 'bass-up-swing-walk-half-note',
    label: 'Walking — sparse half-notes (2-chord bars)',
    bars: 1,
    atoms: [atom('regular', B1, 0.8, H), atom('regular', B3, 0.72, H)],
    category: 'groove',
    tags: ['walking', 'sparse', 'two-chord'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'bass-up-swing-turnaround',
    label: 'Turnaround — quarters with two muted approaches',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.84, Q),
      atom('regular', B2, 0.7, Q),
      atom('muted', B3, 0.72, Q),
      atom('muted', B4, 0.74, Q),
    ],
    category: 'fill',
    tags: ['turnaround', 'approach'],
    complexity: { min: 2, max: 3 },
    conditions: { barModulo: 3 },
  },

  // ── Swing: max-tension chromatic walking (melodic turns) ────────────────
  {
    id: 'bass-up-swing-walk-chromatic',
    label: 'Walking — 4 четверти, все regular (step engine даёт хроматику на max)',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.84, Q),
      atom('regular', B2, 0.7, Q),
      atom('regular', B3, 0.78, Q),
      atom('regular', B4, 0.72, Q),
    ],
    category: 'groove',
    tags: ['walking', 'chromatic', 'max-tension'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'bass-up-swing-walk-triplet',
    label: 'Walking — четверти + триольный bebop-заход на последней доле',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.84, Q),
      atom('regular', B2, 0.7, Q),
      atom('regular', B3, 0.76, PPQ / 3),
      atom('regular', B3 + PPQ / 3, 0.64, PPQ / 3),
      atom('regular', B3 + (PPQ * 2) / 3, 0.62, PPQ / 3),
      atom('regular', B4, 0.7, Q),
    ],
    category: 'groove',
    tags: ['walking', 'triplet', 'bebop', 'chromatic'],
    complexity: { min: 3, max: 3 },
  },
  {
    id: 'bass-up-swing-walk-octave-leap',
    label: 'Walking — четверти + октавный скачок на бите 3 (max-tension brosок)',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.86, Q),
      atom('regular', B2, 0.66, Q),
      atom('regular', B3, 0.8, Q),
      atom('regular', B4, 0.72, Q),
    ],
    category: 'groove',
    tags: ['walking', 'octave', 'leap', 'max-tension'],
    complexity: { min: 3, max: 3 },
  },

  // ── Swing: eighth-note walking bass (bebop / rhythmic variety) ───────────
  {
    id: 'bass-up-swing-walk-8th',
    label: 'Walking — 8 восьмых, непрерывный bebop-ход',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.82, _8),
      atom('regular', B1and, 0.6, _8),
      atom('regular', B2, 0.66, _8),
      atom('regular', B2and, 0.58, _8),
      atom('regular', B3, 0.74, _8),
      atom('regular', B3and, 0.62, _8),
      atom('regular', B4, 0.68, _8),
      atom('regular', B4and, 0.56, _8),
    ],
    category: 'groove',
    tags: ['walking', 'eighth', 'bebop', 'continuous'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'bass-up-swing-walk-8th-ghost',
    label: 'Walking — чередование regular/muted восьмых (ghost fill)',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.82, _8),
      atom('muted', B1and, 0.34, _8),
      atom('regular', B2, 0.66, _8),
      atom('muted', B2and, 0.32, _8),
      atom('regular', B3, 0.74, _8),
      atom('muted', B3and, 0.34, _8),
      atom('regular', B4, 0.68, _8),
      atom('muted', B4and, 0.44, _8),
    ],
    category: 'groove',
    tags: ['walking', 'eighth', 'ghost'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'bass-up-swing-walk-bebop',
    label: 'Walking — bebop-фигура: две восьмые на 3-й доле',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.82, Q),
      atom('regular', B2, 0.68, Q),
      atom('regular', B3, 0.74, _8),
      atom('regular', B3and, 0.62, _8),
      atom('regular', B4, 0.68, Q),
    ],
    category: 'groove',
    tags: ['walking', 'bebop', 'variation'],
    complexity: { min: 2, max: 2 },
  },
  {
    id: 'bass-up-swing-walk-pickup',
    label: 'Walking — четверти + ghost pickup на 4-and',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.82, Q),
      atom('regular', B2, 0.66, Q),
      atom('regular', B3, 0.74, Q),
      atom('regular', B4, 0.68, _8),
      atom('muted', B4and, 0.4, _8),
    ],
    category: 'groove',
    tags: ['walking', 'ghost', 'pickup'],
    complexity: { min: 2, max: 2 },
  },
  {
    id: 'bass-up-swing-walk-passing',
    label: 'Walking — четверти + восьмая проходящая на 2-and',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.82, Q),
      atom('regular', B2, 0.66, _8),
      atom('regular', B2and, 0.58, _8),
      atom('regular', B3, 0.74, Q),
      atom('regular', B4, 0.68, Q),
    ],
    category: 'groove',
    tags: ['walking', 'eighth', 'passing'],
    complexity: { min: 2, max: 2 },
  },
  {
    id: 'bass-up-swing-walk-2bar',
    label: 'Walking 2-такта — четверти → восьмые c ghost на второй такт',
    bars: 2,
    atoms: [
      // Bar 1: стандартные четверти
      atom('regular', B1, 0.82, Q),
      atom('regular', B2, 0.66, Q),
      atom('regular', B3, 0.74, Q),
      atom('regular', B4, 0.68, Q),
      // Bar 2: восьмые с ghost-сбивками
      atom('regular', B1 + PPQ * 4, 0.82, _8),
      atom('regular', B1and + PPQ * 4, 0.6, _8),
      atom('regular', B2 + PPQ * 4, 0.66, _8),
      atom('muted', B2and + PPQ * 4, 0.32, _8),
      atom('regular', B3 + PPQ * 4, 0.74, _8),
      atom('regular', B3and + PPQ * 4, 0.62, _8),
      atom('regular', B4 + PPQ * 4, 0.68, _8),
      atom('muted', B4and + PPQ * 4, 0.44, _8),
    ],
    category: 'groove',
    tags: ['walking', '2-bar', 'eighth', 'ghost'],
    complexity: { min: 3, max: 3 },
  },
  {
    id: 'bass-up-swing-walk-2bar-chromatic',
    label: 'Walking 2-такта — четверти → плотные восьмые с хроматикой на второй такт (max)',
    bars: 2,
    atoms: [
      // Bar 1: четверти с акцентами
      atom('regular', B1, 0.86, Q),
      atom('regular', B2, 0.68, Q),
      atom('regular', B3, 0.78, Q),
      atom('regular', B4, 0.72, Q),
      // Bar 2: плотный bebop-ход — восьмые с muted ghost на оффбитах
      atom('regular', B1 + PPQ * 4, 0.84, _8),
      atom('muted', B1and + PPQ * 4, 0.38, _8),
      atom('regular', B2 + PPQ * 4, 0.68, _8),
      atom('muted', B2and + PPQ * 4, 0.34, _8),
      atom('regular', B3 + PPQ * 4, 0.76, _8),
      atom('muted', B3and + PPQ * 4, 0.36, _8),
      atom('regular', B4 + PPQ * 4, 0.7, _8),
      atom('muted', B4and + PPQ * 4, 0.48, _8),
    ],
    category: 'groove',
    tags: ['walking', '2-bar', 'eighth', 'ghost', 'chromatic', 'max-tension'],
    complexity: { min: 3, max: 3 },
  },
  {
    id: 'bass-up-swing-bebop-turnaround',
    label: 'Turnaround — восьмые bebop на последних двух долях',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.84, Q),
      atom('regular', B2, 0.7, Q),
      atom('regular', B3, 0.74, _8),
      atom('regular', B3and, 0.62, _8),
      atom('regular', B4, 0.68, _8),
      atom('muted', B4and, 0.54, _8),
    ],
    category: 'fill',
    tags: ['walking', 'bebop', 'turnaround', 'eighth'],
    complexity: { min: 3, max: 3 },
    conditions: { barModulo: 3 },
  },

  // ── Bossa: root-5th half-notes ───────────────────────────────────────────
  {
    id: 'bass-up-bossa-1-5',
    label: 'Bossa — root (1), fifth (3) half-notes',
    bars: 1,
    atoms: [atom('regular', B1, 0.78, H), atom('regular', B3, 0.7, H)],
    category: 'groove',
    tags: ['bossa', 'root-5th'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'bass-up-bossa-1-5-octave',
    label: 'Bossa — root (1), fifth (3) with octave lift',
    bars: 1,
    atoms: [atom('regular', B1, 0.78, H), atom('regular', B3, 0.66, H)],
    category: 'groove',
    tags: ['bossa', 'root-5th', 'octave'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'bass-up-bossa-approach',
    label: 'Bossa — muted approach into beat 1 of next bar',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.78, Q),
      atom('regular', B2, 0.66, Q),
      atom('regular', B3, 0.72, Q),
      atom('muted', B4and, 0.62, _8),
    ],
    category: 'fill',
    tags: ['bossa', 'approach'],
    complexity: { min: 2, max: 3 },
    conditions: { barModulo: 3 },
  },

  // ── Ballad: two-feel ─────────────────────────────────────────────────────
  {
    id: 'bass-up-ballad-two-feel',
    label: 'Two-feel — root (1), root (3)',
    bars: 1,
    atoms: [atom('regular', B1, 0.74, H), atom('regular', B3, 0.68, H)],
    category: 'groove',
    tags: ['ballad', 'two-feel', 'sparse'],
    complexity: { min: 1, max: 1 },
  },
  {
    id: 'bass-up-ballad-two-feel-5',
    label: 'Two-feel — root (1), fifth (3)',
    bars: 1,
    atoms: [atom('regular', B1, 0.74, H), atom('regular', B3, 0.7, H)],
    category: 'groove',
    tags: ['ballad', 'two-feel'],
    complexity: { min: 2, max: 2 },
  },
  {
    id: 'bass-up-ballad-approach',
    label: 'Two-feel — root, fifth, muted approach',
    bars: 1,
    atoms: [atom('regular', B1, 0.74, H), atom('regular', B3, 0.7, Q), atom('muted', B4, 0.6, Q)],
    category: 'groove',
    tags: ['ballad', 'two-feel', 'approach'],
    complexity: { min: 3, max: 3 },
  },
  {
    id: 'bass-up-ballad-half-note-walk',
    label: 'Ballad — half-note walk with muted approach',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.74, H),
      atom('regular', B2 + _8, 0.66, Q),
      atom('regular', B3, 0.68, Q),
      atom('muted', B4, 0.6, Q),
    ],
    category: 'fill',
    tags: ['ballad', 'walk', 'approach'],
    complexity: { min: 3, max: 3 },
    conditions: { barModulo: 3 },
  },
];

// ════════════════════════════════════════════════════════════════════════════
// ELECTRIC BASS MOLECULES — palette { regular, muted, rel, stac }
// Styles: funk (syncopated), latin (montuno)
// Grid reaches 32nd notes for dense funk chatter.
// ════════════════════════════════════════════════════════════════════════════

const ELECTRIC_MOLECULE_DRAFTS: Omit<BassMolecule, 'style'>[] = [
  // ── Funk: syncopated — muted (ghost) notes are the heart of the groove ───
  {
    id: 'bass-el-funk-pocket',
    label: 'Funk pocket — regular on 1, muted on the &',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.64, Q),
      atom('muted', B1and, 0.26, _8),
      atom('regular', B3, 0.58, Q),
      atom('muted', B4and, 0.28, _8),
    ],
    category: 'groove',
    tags: ['funk', 'pocket', 'ghost'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'bass-el-funk-one-bar',
    label: 'Funk 1-bar — regular/muted/regular/stac',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.66, Q),
      atom('muted', B1and, 0.24, _8),
      atom('muted', B2and, 0.28, _8),
      atom('regular', B3, 0.58, Q),
      atom('stac', B3and, 0.42, _8),
      atom('muted', B4e, 0.22, _16),
      atom('regular', B4and, 0.56, _8),
    ],
    category: 'groove',
    tags: ['funk', 'syncopated', 'ghost'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'bass-el-funk-16th-chatter',
    label: 'Funk 16th — dense muted chatter with 32nd details',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.66, _8),
      atom('muted', B1and, 0.22, _16),
      atom('muted', B2e, 0.24, _16),
      atom('stac', B2and, 0.44, _8),
      atom('muted', B3, 0.22, _16),
      atom('regular', B3and, 0.56, _8),
      atom('muted', B3a, 0.2, _32),
      atom('muted', B4e, 0.22, _16),
      atom('stac', B4and, 0.42, _8),
    ],
    category: 'groove',
    tags: ['funk', '16th', '32nd', 'dense', 'ghost'],
    complexity: { min: 3, max: 3 },
  },
  {
    id: 'bass-el-funk-stab',
    label: 'Funk stab — staccato on the & of 1',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.64, _8),
      atom('stac', B1and, 0.46, _8),
      atom('muted', B2and, 0.24, _16),
      atom('regular', B3, 0.58, Q),
      atom('stac', B4and, 0.44, _8),
    ],
    category: 'groove',
    tags: ['funk', 'stab', 'staccato'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'bass-el-funk-release',
    label: 'Funk phrase end — rel tail into next bar',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.62, Q),
      atom('regular', B2, 0.54, Q),
      atom('regular', B3, 0.58, Q),
      atom('rel', B4, 0.5, Q),
    ],
    category: 'fill',
    tags: ['funk', 'release', 'phrase-end'],
    complexity: { min: 2, max: 3 },
    conditions: { barModulo: 3 },
  },
  {
    id: 'bass-el-funk-two-bar',
    label: 'Funk 2-bar — pocket then walk-up',
    bars: 2,
    atoms: [
      atom('regular', B1, 0.64, Q),
      atom('muted', B1and, 0.24, _8),
      atom('muted', B2and, 0.26, _8),
      atom('regular', B3, 0.58, Q),
      atom('muted', B4and, 0.26, _8),
      atom('stac', B1 + PPQ * 4, 0.46, _8),
      atom('muted', B1and + PPQ * 4, 0.22, _16),
      atom('stac', B2 + PPQ * 4, 0.44, _8),
      atom('regular', B3 + PPQ * 4, 0.6, Q),
      atom('rel', B4 + PPQ * 4, 0.5, Q),
    ],
    category: 'groove',
    tags: ['funk', '2-bar', 'walk-up'],
    complexity: { min: 3, max: 3 },
  },

  // ── Funk: 16th-note driven (бодрые) ──────────────────────────────────────
  {
    id: 'bass-el-funk-16th-groove',
    label: 'Funk 16th groove — 4 доли × 4 шестнадцатых, regular на downbeat',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.64, _16),
      atom('muted', B1e, 0.22, _16),
      atom('muted', B1and, 0.22, _16),
      atom('muted', B1a, 0.2, _16),
      atom('regular', B2, 0.56, _16),
      atom('muted', B2e, 0.2, _16),
      atom('stac', B2and, 0.42, _16),
      atom('muted', B2a, 0.2, _16),
      atom('regular', B3, 0.58, _16),
      atom('muted', B3e, 0.2, _16),
      atom('muted', B3and, 0.22, _16),
      atom('muted', B3a, 0.2, _16),
      atom('regular', B4, 0.54, _16),
      atom('muted', B4e, 0.2, _16),
      atom('stac', B4and, 0.4, _16),
      atom('muted', B4a, 0.2, _16),
    ],
    category: 'groove',
    tags: ['funk', '16th', 'groove', 'pocket'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'bass-el-funk-16th-slap',
    label: 'Funk 16th slap — stac на oﬀbeats, плотный грув',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.66, _8),
      atom('stac', B1and, 0.44, _8),
      atom('muted', B1a, 0.2, _16),
      atom('regular', B2, 0.58, _8),
      atom('stac', B2and, 0.42, _8),
      atom('muted', B2a, 0.2, _16),
      atom('regular', B3, 0.6, _8),
      atom('stac', B3and, 0.44, _8),
      atom('muted', B3a, 0.2, _16),
      atom('regular', B4, 0.56, _8),
      atom('stac', B4and, 0.42, _8),
      atom('rel', B4a, 0.48, _16),
    ],
    category: 'groove',
    tags: ['funk', '16th', 'slap', 'staccato'],
    complexity: { min: 3, max: 3 },
  },
  {
    id: 'bass-el-funk-16th-2bar',
    label: 'Funk 16th 2-bar — pocket → плотный 16th fill',
    bars: 2,
    atoms: [
      atom('regular', B1, 0.64, Q),
      atom('muted', B1and, 0.24, _8),
      atom('muted', B2and, 0.26, _8),
      atom('regular', B3, 0.58, Q),
      atom('muted', B4and, 0.26, _8),
      atom('regular', B1 + PPQ * 4, 0.64, _16),
      atom('muted', B1e + PPQ * 4, 0.22, _16),
      atom('stac', B1and + PPQ * 4, 0.42, _16),
      atom('muted', B1a + PPQ * 4, 0.2, _16),
      atom('regular', B2 + PPQ * 4, 0.58, _16),
      atom('muted', B2e + PPQ * 4, 0.2, _16),
      atom('stac', B2and + PPQ * 4, 0.4, _16),
      atom('muted', B2a + PPQ * 4, 0.2, _16),
      atom('regular', B3 + PPQ * 4, 0.6, _8),
      atom('stac', B3and + PPQ * 4, 0.42, _8),
      atom('regular', B4 + PPQ * 4, 0.58, _8),
      atom('rel', B4and + PPQ * 4, 0.48, _8),
    ],
    category: 'groove',
    tags: ['funk', '16th', '2-bar', 'fill'],
    complexity: { min: 3, max: 3 },
  },

  // ── Latin: montuno (tumbão) ──────────────────────────────────────────────
  {
    id: 'bass-el-latin-montuno',
    label: 'Montuno — root (1), stac fifth on the & of 2',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.62, Q + _8),
      atom('stac', B2and, 0.48, _8),
      atom('regular', B3, 0.56, Q),
    ],
    category: 'groove',
    tags: ['latin', 'montuno', 'tumbao'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'bass-el-latin-montuno-octave',
    label: 'Montuno — root (1), octave stac on 4',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.62, Q + _8),
      atom('stac', B2and, 0.48, _8),
      atom('regular', B3, 0.54, Q),
      atom('stac', B4, 0.44, _8),
    ],
    category: 'groove',
    tags: ['latin', 'montuno', 'octave'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'bass-el-latin-montuno-dense',
    label: 'Montuno dense — 16th montuno cell',
    bars: 1,
    atoms: [
      atom('regular', B1, 0.62, Q),
      atom('stac', B2and, 0.46, _8),
      atom('regular', B3, 0.56, Q),
      atom('stac', B3and, 0.4, _8),
      atom('stac', B4and, 0.44, _8),
    ],
    category: 'groove',
    tags: ['latin', 'montuno', 'dense'],
    complexity: { min: 3, max: 3 },
  },
  {
    id: 'bass-el-latin-2-3-clave',
    label: 'Latin 2-bar — 2-3 clave montuno',
    bars: 2,
    atoms: [
      atom('regular', B1, 0.62, Q + _8),
      atom('stac', B2and, 0.46, _8),
      atom('regular', B3, 0.56, Q),
      atom('regular', B1 + PPQ * 4, 0.62, Q),
      atom('stac', B2 + PPQ * 4, 0.48, _8),
      atom('regular', B2and + PPQ * 4, 0.54, _8),
      atom('stac', B4 + PPQ * 4, 0.44, _8),
    ],
    category: 'groove',
    tags: ['latin', '2-bar', 'clave'],
    complexity: { min: 2, max: 3 },
  },
];

// ─── Style → variant mapping for authoring ───────────────────────────────────

const UPRIGHT_STYLES: BassMolecule['style'][] = ['swing', 'bossa', 'ballad'];
const ELECTRIC_STYLES: BassMolecule['style'][] = ['funk', 'latin'];

function withStyle(draft: Omit<BassMolecule, 'style'>, style: BassMolecule['style']): BassMolecule {
  return { ...draft, style };
}

// ─── Registries ──────────────────────────────────────────────────────────────

export const UPRIGHT_BASS_MOLECULES: Record<string, BassMolecule> = {};
export const UPRIGHT_BASS_MOLECULE_LIST: BassMolecule[] = [];
for (const draft of UPRIGHT_MOLECULE_DRAFTS) {
  for (const style of UPRIGHT_STYLES) {
    const mol = withStyle(draft, style);
    const id = `${draft.id}__${style}`;
    UPRIGHT_BASS_MOLECULES[id] = { ...mol, id };
    UPRIGHT_BASS_MOLECULE_LIST.push({ ...mol, id });
  }
}

export const ELECTRIC_BASS_MOLECULES: Record<string, BassMolecule> = {};
export const ELECTRIC_BASS_MOLECULE_LIST: BassMolecule[] = [];
for (const draft of ELECTRIC_MOLECULE_DRAFTS) {
  for (const style of ELECTRIC_STYLES) {
    const mol = withStyle(draft, style);
    const id = `${draft.id}__${style}`;
    ELECTRIC_BASS_MOLECULES[id] = { ...mol, id };
    ELECTRIC_BASS_MOLECULE_LIST.push({ ...mol, id });
  }
}

// ─── Style-scoped lookups ────────────────────────────────────────────────────

export function getUprightBassMoleculesForStyle(style: string): BassMolecule[] {
  return UPRIGHT_BASS_MOLECULE_LIST.filter((m) => m.style === style);
}

export function getElectricBassMoleculesForStyle(style: string): BassMolecule[] {
  return ELECTRIC_BASS_MOLECULE_LIST.filter((m) => m.style === style);
}
