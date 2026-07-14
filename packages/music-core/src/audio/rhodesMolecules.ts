/**
 * Seed Rhodes molecules — pure rhythm skeletons over voicing roles.
 *
 * Rhodes is a *complementary* layer sitting behind the Grand Piano. These
 * molecules are intentionally calm: low velocity (0.3–0.45), long durations,
 * sparse syncopation. They fill texture (pads), provide gentle motion
 * (arpeggios), or sit out of the piano's way (subtle inserts). See
 * docs/RHODES.md and docs/MELODIC-PLUGIN.md.
 *
 * Each atom's `sound` is a {@link RhodesVoicingRole} resolved at playback time
 * from the real chord + density via `buildVoicing()` + `selectRhodesVoicingRole()`.
 * The same rhythm therefore sounds correct over any chord quality.
 */
import type { RhodesMolecule, RhodesAtom, RhodesPatternStyle } from './rhodesPatternTypes.js';
import { GENERATED_RHODES_MOLECULES } from './rhodesMoleculesGenerated.js';

const PPQ = 480;

// Beat boundaries in 4/4
const B1 = 0;
const B2 = PPQ;
const B3 = PPQ * 2;
const B4 = PPQ * 3;

// Eighth-note offsets (straight; swing applied by the engine)
const _8 = PPQ / 2;
const _8off = _8;

function atom(role: RhodesAtom['sound'], tick: number, vel: number, dur = PPQ / 2): RhodesAtom {
  return { sound: role, atTick: tick, velocity: vel, durationTicks: dur };
}

// ─── Style-agnostic base molecules ──────────────────────────────────────────

type MolDraft = Omit<RhodesMolecule, 'style'>;

const BASE_MOLECULES: MolDraft[] = [
  // ── Pads / textures (sustained chords, very calm) ──────────────────────
  {
    id: 'rhodes-pad-whole',
    label: 'Pad Whole — held chord on beat 1',
    bars: 1,
    atoms: [atom('chord', B1, 0.38, PPQ * 4)],
    category: 'texture',
    tags: ['pad', 'sustained', 'sparse'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'rhodes-pad-half',
    label: 'Pad Half — chords on 1 and 3',
    bars: 1,
    atoms: [atom('chord', B1, 0.4, PPQ * 2), atom('chord', B3, 0.36, PPQ * 2)],
    category: 'texture',
    tags: ['pad', 'two-feel'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'rhodes-pad-dotted',
    label: 'Pad Dotted — dotted half + beat 4 release',
    bars: 1,
    atoms: [atom('chord', B1, 0.38, PPQ * 3), atom('shell', B4, 0.32, PPQ)],
    category: 'texture',
    tags: ['pad', 'ballad', 'release'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'rhodes-shell-sparse',
    label: 'Shell Sparse — guide tones only',
    bars: 1,
    atoms: [atom('shell', B1, 0.34, PPQ * 4)],
    category: 'texture',
    tags: ['shell', 'sparse', 'thin'],
    complexity: { min: 1, max: 1 },
  },
  {
    id: 'rhodes-pad-swell',
    label: 'Pad Swell — 2-bar crescendo pad',
    bars: 2,
    atoms: [
      atom('chord', B1, 0.3, PPQ * 4),
      atom('chord', B1 + PPQ * 4, 0.4, PPQ * 4),
    ],
    category: 'texture',
    tags: ['pad', 'swell', 'ambient'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'rhodes-upper-shimmer',
    label: 'Upper Shimmer — color tones held',
    bars: 1,
    atoms: [atom('upper', B1, 0.32, PPQ * 4)],
    category: 'texture',
    tags: ['upper', 'shimmer', 'color'],
    complexity: { min: 2, max: 3 },
  },

  // ── Arpeggios (gentle, ascending/descending) ───────────────────────────
  {
    id: 'rhodes-arp-up-quarter',
    label: 'Arp Up Quarter — ascending quarter notes',
    bars: 1,
    atoms: [
      atom('arp1', B1, 0.36, PPQ),
      atom('arp2', B2, 0.34, PPQ),
      atom('arp3', B3, 0.36, PPQ),
      atom('arp4', B4, 0.34, PPQ),
    ],
    category: 'groove',
    tags: ['arpeggio', 'ascending', 'quarter'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'rhodes-arp-up-eighths',
    label: 'Arp Up Eighths — flowing eighth-note ascent',
    bars: 1,
    atoms: [
      atom('arp1', B1, 0.34, _8),
      atom('arp2', B1 + _8, 0.32, _8),
      atom('arp3', B2, 0.34, _8),
      atom('arp4', B2 + _8, 0.32, _8),
      atom('arp1', B3, 0.34, _8),
      atom('arp2', B3 + _8, 0.32, _8),
      atom('arp3', B4, 0.34, _8),
      atom('arp4', B4 + _8, 0.32, _8),
    ],
    category: 'groove',
    tags: ['arpeggio', 'ascending', 'eighth', 'flowing'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'rhodes-arp-down-quarter',
    label: 'Arp Down Quarter — descending quarter notes',
    bars: 1,
    atoms: [
      atom('arp4', B1, 0.36, PPQ),
      atom('arp3', B2, 0.34, PPQ),
      atom('arp2', B3, 0.36, PPQ),
      atom('arp1', B4, 0.34, PPQ),
    ],
    category: 'groove',
    tags: ['arpeggio', 'descending', 'quarter'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'rhodes-arp-roll',
    label: 'Arp Roll — quick rolled chord (harp-like)',
    bars: 1,
    atoms: [
      atom('arp1', B1, 0.34, PPQ * 2),
      atom('arp2', B1 + PPQ / 4, 0.34, PPQ * 2),
      atom('arp3', B1 + PPQ / 2, 0.34, PPQ * 2),
      atom('arp4', B1 + (PPQ * 3) / 4, 0.36, PPQ * 2),
    ],
    category: 'groove',
    tags: ['arpeggio', 'roll', 'harp', 'ballad'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'rhodes-arp-pedal-top',
    label: 'Arp Pedal Top — pedal point on the melody note',
    bars: 1,
    atoms: [
      atom('top', B1, 0.32, PPQ),
      atom('top', B2, 0.32, PPQ),
      atom('top', B3, 0.32, PPQ),
      atom('top', B4, 0.32, PPQ),
    ],
    category: 'groove',
    tags: ['arpeggio', 'pedal', 'top', 'sustain'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'rhodes-arp-bounce',
    label: 'Arp Bounce — low-high-low alternation',
    bars: 1,
    atoms: [
      atom('arp1', B1, 0.34, _8),
      atom('arp4', B1 + _8, 0.32, _8),
      atom('arp2', B2, 0.34, _8),
      atom('arp4', B2 + _8, 0.32, _8),
      atom('arp1', B3, 0.34, _8),
      atom('arp3', B3 + _8, 0.32, _8),
      atom('arp2', B4, 0.34, _8),
      atom('arp4', B4 + _8, 0.32, _8),
    ],
    category: 'groove',
    tags: ['arpeggio', 'bounce', 'eighth'],
    complexity: { min: 2, max: 3 },
  },

  // ── Inserts / comping (sparse, out-of-the-way) ─────────────────────────
  {
    id: 'rhodes-insert-charleston',
    label: 'Insert Charleston — thin 1, 2&',
    bars: 1,
    atoms: [atom('chord', B1, 0.4, PPQ / 2), atom('chord', B2 + _8off, 0.35, PPQ / 2)],
    category: 'groove',
    tags: ['insert', 'charleston', 'thin'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'rhodes-insert-offbeats',
    label: 'Insert Offbeats — subtle 2&, 4&',
    bars: 1,
    atoms: [
      atom('shell', B2 + _8off, 0.35, _8),
      atom('shell', B4 + _8off, 0.32, _8),
    ],
    category: 'groove',
    tags: ['insert', 'offbeat', 'subtle'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'rhodes-insert-anticipation',
    label: 'Insert Anticipation — push on 4& (next chord)',
    bars: 1,
    atoms: [atom('chord', B4 + _8off, 0.34, PPQ / 2)],
    category: 'accent',
    tags: ['insert', 'anticipation', 'push'],
    complexity: { min: 2, max: 3 },
  },
  {
    id: 'rhodes-stab-2-4',
    label: 'Stab 2 & 4 — short backbeat accents',
    bars: 1,
    atoms: [
      atom('chord', B2, 0.42, PPQ / 3),
      atom('chord', B4, 0.4, PPQ / 3),
    ],
    category: 'accent',
    tags: ['stab', 'backbeat', 'funk'],
    complexity: { min: 1, max: 2 },
  },
  {
    id: 'rhodes-insert-one-three',
    label: 'Insert 1 & 3 — sparse downbeat support',
    bars: 1,
    atoms: [atom('shell', B1, 0.36, PPQ / 2), atom('shell', B3, 0.34, PPQ / 2)],
    category: 'groove',
    tags: ['insert', 'downbeat', 'sparse'],
    complexity: { min: 1, max: 1 },
  },

  // ── Rest (silence — gives the piano room) ──────────────────────────────
  {
    id: 'rhodes-rest',
    label: 'Rest — silence (give piano room)',
    bars: 1,
    atoms: [],
    category: 'texture',
    tags: ['rest', 'sparse'],
    complexity: { min: 1, max: 1 },
  },
];

// ─── Generate molecules for all 5 styles ────────────────────────────────────

const STYLES: RhodesPatternStyle[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

/** Triplet tick-step for swing/ballad (3 subdivisions per beat). */
const SWING_TICK_STEP = PPQ / 3;
/** One bar in ticks (4/4), used to clamp durations at bar boundary. */
const BAR_TICKS = PPQ * 4;

/** Snap a tick to the nearest swing-grid column so visual and audio align. */
function snapSwingTick(tick: number): number {
  return Math.round(tick / SWING_TICK_STEP) * SWING_TICK_STEP;
}

function generateMolecules(): RhodesMolecule[] {
  const result: RhodesMolecule[] = [];

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
const BASE_RHODES_MOLECULES: Record<string, RhodesMolecule> = {};
const BASE_RHODES_MOLECULE_LIST: RhodesMolecule[] = [];

for (const mol of generateMolecules()) {
  BASE_RHODES_MOLECULES[mol.id] = mol;
  BASE_RHODES_MOLECULE_LIST.push(mol);
}

/**
 * Итоговый реестр молекул. Если сгенерированный реестр (из Конструктора
 * Rhodes) непуст — он ПОЛНОСТЬЮ замещает базовый.
 */
const GENERATED_MOLECULES = GENERATED_RHODES_MOLECULES as Record<string, RhodesMolecule>;

export const RHODES_MOLECULES: Record<string, RhodesMolecule> =
  Object.keys(GENERATED_MOLECULES).length > 0 ? GENERATED_MOLECULES : BASE_RHODES_MOLECULES;

export const RHODES_MOLECULE_LIST: RhodesMolecule[] = Object.values(RHODES_MOLECULES);

export function getRhodesMoleculesForStyle(style: string): RhodesMolecule[] {
  return RHODES_MOLECULE_LIST.filter((m) => m.style === style);
}
