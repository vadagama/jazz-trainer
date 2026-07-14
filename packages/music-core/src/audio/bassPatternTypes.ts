/**
 * Bass-specific type aliases over the generic pattern-engine model.
 *
 * Bass uses the same atom → molecule → cell → organism hierarchy as
 * drums/percussion/piano. Following the piano architecture, the "sound" of a
 * bass atom is **only an articulation** — *which* chord step to play is decided
 * by the {@link BassStepEngine} at runtime (style + tension + phrasing + bar
 * position), exactly like piano's VoiceRole → buildPianoVoicing. This means a
 * single molecule sounds correct over any chord, key, and tension setting.
 *
 * Two bass variants live in the same engine:
 *  - **upright** (swing/bossa/ballad): palette { regular, muted }
 *  - **electric** (funk/latin):        palette { regular, muted, rel, stac }
 *
 * @see docs/BASS.md
 */
import type { Style } from '@jazz/shared';
import type {
  Atom,
  Cell,
  Dynamics,
  DynamicsType,
  Hit,
  Lane,
  Molecule,
  MoleculeCategory,
  MoleculeConditions,
  Organism,
  OrganismSection,
} from './pattern/types.js';
import type { BassArticulation } from './instrument.js';

// ─── Style ───────────────────────────────────────────────────────────────────

/** Bass supports all 5 ensemble styles (each variant covers a subset). */
export type BassPatternStyle = Style;

// ─── Chord step (engine-internal — NOT stored in molecules) ──────────────────

/**
 * Which scale degree of the current chord a bass atom plays.
 *
 * This is **engine-internal**: molecules never store a step. The
 * {@link BassStepEngine} decides the step per atom from the current style,
 * tension, phrasing, and beat position, then {@link resolveBassStepPitch}
 * resolves it to a scientific pitch against the real chord.
 *
 * - `root` / `fifth` / `third` / `seventh` — chord tones (bass foundation)
 * - `octave` — root one octave above the anchor octave (montuno/latin)
 * - `approach` — chromatic/diatonic approach into the *next* chord's root
 *   (walking-bass last-beat motion); resolved via {@link BassRandomizer}
 */
export type BassStep = 'root' | 'fifth' | 'third' | 'seventh' | 'octave' | 'approach';

// ─── Variant ─────────────────────────────────────────────────────────────────

/** Which sample library / scheduling palette a bass instrument uses. */
export type BassVariant = 'upright' | 'electric';

// ─── Tension & Phrasing (mirror piano's user-facing knobs) ───────────────────

/**
 * Harmonic-color knob (mirrors {@link PianoTensionLevel}). Drives how
 * adventurous the {@link BassStepEngine} is with chord steps:
 *  - `clean`    — strictly root/fifth (foundation)
 *  - `moderate` — + third, approach on beat 4
 *  - `altered`  — + seventh, passing tones
 *  - `max`      — + chromaticism, octave jumps
 */
export type BassTensionLevel = 'clean' | 'moderate' | 'altered' | 'max';

/**
 * Phrase-level velocity curve over a 4-bar phrase (mirrors piano's `phrasing`
 * humanize param). Applied by {@link phrasingMultiplier}-style logic in
 * {@link BassInstrument}.
 *  - `flat`       — constant velocity
 *  - `gentle`     — mild long-phrase arc
 *  - `expressive` — strong downbeat/phrase-end shaping
 */
export type BassPhrasing = 'flat' | 'gentle' | 'expressive';

/**
 * Octave-range knob — how wide the bass roams across octaves.
 *  - `narrow` — stay in octave 2, no octave jumps (B1–B2)
 *  - `medium` — octave 2 centred, C4 ceiling (current default)
 *  - `wide`   — full B1–C4 range, octave leaps allowed
 */
export type BassRange = 'narrow' | 'medium' | 'wide';

// ─── Bass type aliases over the generic model ────────────────────────────────
//
// NOTE: `sound` is now a plain {@link BassArticulation} (not a step-articulation
// token). The generic pattern engine is parametric over `TSound`, so this change
// is type-level only — no engine code changes.

export type BassAtom = Atom<BassArticulation>;
export type BassHit = Hit<BassArticulation>;
export type BassMolecule = Molecule<BassPatternStyle, BassArticulation>;
export type BassCell = Cell<BassPatternStyle>;
export type BassOrganism = Organism<BassPatternStyle>;

// ─── Re-exported building blocks ─────────────────────────────────────────────

export type { MoleculeCategory, MoleculeConditions, DynamicsType, Dynamics, Lane, OrganismSection };
export type { Clip } from './pattern/types.js';

export type BassDynamicsType = DynamicsType;
export type BassDynamics = Dynamics;
export type BassClip = import('./pattern/types.js').Clip;
export type BassLane = Lane;
