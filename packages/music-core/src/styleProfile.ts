import type { Style, TimeSignatureString } from '@jazz/shared';

// ─── Instrument identifiers ──────────────────────────────────────────────────

/**
 * Instrument IDs across all InstrumentManifest entries.
 *
 * Open union: the listed literals document the built-in instruments (and give
 * editor autocomplete), while `(string & {})` keeps the type OPEN so a new
 * instrument plugin can be referenced by id without editing this union. Adding
 * a kit no longer requires touching styleProfile — unknown ids resolve through
 * {@link instrumentDefaultsFor} (falls back to OFF).
 */
export type InstrumentId =
  | 'drums'
  | 'jazz-drum-kit'
  | 'funk-drum-kit'
  | 'upright-bass'
  | 'electric-bass'
  | 'piano'
  | 'upright-piano'
  | 'rhodes'
  | 'guitar'
  | 'electric-guitar'
  | 'vibraphone'
  | 'organ'
  | 'clarinet'
  | 'percussion'
  | 'trumpet-muted'
  | 'flute'
  | (string & {});

// ─── Instrument groups (UI-layer) ────────────────────────────────────────────

/** Display group identifier — groups related instruments for UI rendering. */
export type InstrumentGroupId =
  | 'drums'
  | 'bass'
  | 'piano'
  | 'rhodes'
  | 'guitar'
  | 'winds'
  | 'percussion'
  | 'synth';

/** A variant within an instrument group. */
export interface InstrumentVariantDef {
  /** The actual InstrumentId this variant maps to. */
  instrumentId: InstrumentId;
  /** Display name. */
  name: string;
}

/** Definition of an instrument group for UI rendering. */
export interface InstrumentGroupDef {
  id: InstrumentGroupId;
  name: string;
  /** Display order (1-based). */
  order: number;
  /** Settings key prefix shared by all variants in this group. */
  settingsPrefix: string;
  /** Available variants for this group. */
  variants: InstrumentVariantDef[];
}

/** All instrument groups in display order. */
export const INSTRUMENT_GROUPS: InstrumentGroupDef[] = [
  {
    id: 'drums',
    name: 'Drum Kit',
    order: 1,
    settingsPrefix: 'drums',
    variants: [
      { instrumentId: 'jazz-drum-kit', name: 'Jazz Drum Kit' },
      { instrumentId: 'funk-drum-kit', name: 'Funk Drum Kit' },
    ],
  },
  {
    id: 'bass',
    name: 'Bass',
    order: 2,
    settingsPrefix: 'bass',
    variants: [
      { instrumentId: 'upright-bass', name: 'Upright' },
      { instrumentId: 'electric-bass', name: 'Electric' },
    ],
  },
  {
    id: 'piano',
    name: 'Piano',
    order: 3,
    settingsPrefix: 'piano',
    variants: [
      { instrumentId: 'piano', name: 'Salamander' },
      { instrumentId: 'upright-piano', name: 'Upright' },
    ],
  },
  {
    id: 'rhodes',
    name: 'Rhodes',
    order: 4,
    settingsPrefix: 'rhodes',
    variants: [{ instrumentId: 'rhodes', name: 'Rhodes' }],
  },
  {
    id: 'guitar',
    name: 'Guitar',
    order: 5,
    settingsPrefix: 'guitar',
    variants: [
      { instrumentId: 'guitar', name: 'Acoustic' },
      { instrumentId: 'electric-guitar', name: 'Electric' },
    ],
  },
  {
    id: 'winds',
    name: 'Winds',
    order: 6,
    settingsPrefix: 'solo',
    variants: [
      { instrumentId: 'trumpet-muted', name: 'Trumpet' },
      { instrumentId: 'flute', name: 'Flute' },
      { instrumentId: 'clarinet', name: 'Clarinet' },
    ],
  },
  {
    id: 'percussion',
    name: 'Percussion',
    order: 7,
    settingsPrefix: 'percussion',
    variants: [{ instrumentId: 'percussion', name: 'Latin' }],
  },
  {
    id: 'synth',
    name: 'Synth',
    order: 8,
    settingsPrefix: 'rhodes',
    variants: [{ instrumentId: 'organ', name: 'Organ' }],
  },
];

// ─── Roster ───────────────────────────────────────────────────────────────────

/**
 * Style-specific instrument roster.
 *
 * - `required` — groups essential to the style (auto-enabled, shown first).
 * - `recommended` — suggested additions (disabled by default, easy to toggle on).
 * - `optional` — available but hidden behind "advanced" / manual toggle.
 * - `hidden` — irrelevant to this style, not shown in UI.
 */
export interface InstrumentRoster {
  required: InstrumentGroupId[];
  recommended: InstrumentGroupId[];
  optional: InstrumentGroupId[];
  hidden: InstrumentGroupId[];
}

// ─── Per-instrument style defaults ────────────────────────────────────────────

/** Style-specific defaults applied to a single instrument. */
export interface InstrumentStyleDefaults {
  enabled: boolean;
  volume: number;
  /** Style-specific comping pattern / profile. */
  pattern?: string;
  /** Style-specific voicing density (PianoVoicingDensity | RhodesVoicingDensity). */
  voicing?: string;
  /** Style-specific harmonic tension level (piano TensionLevel: clean|moderate|altered|max). */
  tension?: string;
  /** Style-specific mode (e.g. RhodesLayerMode, GuitarMode). */
  mode?: string;
  /** Style-specific humanization overrides (HumanizeParams subset). */
  humanize?: Record<string, unknown>;
}

// ─── Ensemble presets ─────────────────────────────────────────────────────────

export type EnsembleType = 'duet' | 'trio' | 'quartet' | 'quintet' | 'full';

/** Compact snapshot of instrument enable/volume state for a preconfigured ensemble.
 *  Only lists enabled instruments; all others are implicitly disabled. */
export interface EnsembleSettings {
  instruments: Partial<Record<InstrumentId, { enabled: boolean; volume: number }>>;
}

/** Full ensemble preset with id, name, and explicit settings for every instrument.
 *  Every known InstrumentId is present — disabled instruments have `enabled: false`. */
export interface EnsemblePreset {
  id: EnsembleType;
  name: string;
  instrumentSettings: Record<InstrumentId, InstrumentStyleDefaults>;
}

// ─── StyleProfile ─────────────────────────────────────────────────────────────

/**
 * Complete profile of a musical style.
 *
 * Central entity in the style-driven architecture: the style defines the
 * instrument roster, defaults, tempo, and swing — not the other way around.
 *
 * `instrumentDefaults` contains entries for every known instrument.
 * Instruments that are irrelevant to the style still have an entry
 * (with `enabled: false`) so that `setStyleProfile()` always sees a
 * defined object and can reset state without branching.
 */
export interface StyleProfile {
  id: Style;
  name: string;
  description: string;
  instrumentRoster: InstrumentRoster;
  /** Default variant InstrumentId for each group — which sub-instrument is active by default. */
  defaultVariants: Partial<Record<InstrumentGroupId, InstrumentId>>;
  defaultTempo: number;
  swingRatio: number;
  timeSignaturePresets: TimeSignatureString[];
  instrumentDefaults: Record<InstrumentId, InstrumentStyleDefaults>;
}

// ─── Shared defaults (kept DRY) ──────────────────────────────────────────────

/** Fallback for instruments that are irrelevant / hidden in a given style. */
const OFF: InstrumentStyleDefaults = { enabled: false, volume: 0 };

/**
 * Resolve per-style defaults for an instrument id, tolerating ids not present
 * in the profile (e.g. a newly added kit plugin) by falling back to OFF.
 *
 * Use this instead of indexing `profile.instrumentDefaults[id]` directly: with
 * the open {@link InstrumentId} union that index is `… | undefined`, and this
 * helper centralises the fallback so callers stay clean.
 */
export function instrumentDefaultsFor(
  profile: StyleProfile,
  id: InstrumentId,
): InstrumentStyleDefaults {
  return profile.instrumentDefaults[id] ?? OFF;
}

// ─── Registry data ────────────────────────────────────────────────────────────
// Source: ARANGEMENT_VISION.md §3.2 (Style-specific rosters)

const SWING_PROFILE: StyleProfile = {
  id: 'swing',
  name: 'Swing',
  description:
    'Классический мейнстрим-джаз: ride-heavy свинг, walking bass, rootless voicing на фортепиано.',
  defaultTempo: 140,
  swingRatio: 0.67,
  timeSignaturePresets: ['4/4', '3/4'],
  defaultVariants: {
    drums: 'jazz-drum-kit',
    bass: 'upright-bass',
    piano: 'piano',
    rhodes: 'rhodes',
    guitar: 'guitar',
    winds: 'trumpet-muted',
    percussion: 'percussion',
    synth: 'organ',
  },
  instrumentRoster: {
    required: ['drums', 'bass', 'piano'],
    recommended: ['rhodes'],
    optional: ['winds', 'percussion'],
    hidden: ['guitar', 'synth'],
  },
  instrumentDefaults: {
    drums: { enabled: true, volume: 0.7, pattern: 'swing' },
    'jazz-drum-kit': { enabled: true, volume: 0.7, pattern: 'swing' },
    'funk-drum-kit': { ...OFF },
    'upright-bass': {
      enabled: true,
      volume: 0.75,
      pattern: 'walking',
      tension: 'moderate',
      humanize: { phrasing: 'expressive' },
    },
    'electric-bass': { ...OFF },
    piano: {
      enabled: true,
      volume: 0.7,
      pattern: 'swing-sparse',
      voicing: 'rootless3',
      tension: 'moderate',
      humanize: {
        timingJitterMs: 'low',
        velocityVariation: 'medium',
        chordSpreadMs: 'low',
        phrasing: 'expressive',
        humanizeTiming: 'slight-lag',
      },
    },
    'upright-piano': { ...OFF },
    rhodes: { enabled: false, volume: 0.55, pattern: 'rhodes-swing-form', voicing: 'rootless3' },
    guitar: { enabled: false, volume: 0.65, pattern: 'freddie-green', mode: 'steel' },
    'electric-guitar': { ...OFF },
    vibraphone: { enabled: false, volume: 0.6, pattern: 'pads' },
    organ: { ...OFF },
    clarinet: { enabled: false, volume: 0.6, pattern: 'counterpoint' },
    percussion: { ...OFF },
    'trumpet-muted': { enabled: false, volume: 0.65, pattern: 'melodic' },
    flute: { ...OFF },
  },
};

const BOSSA_PROFILE: StyleProfile = {
  id: 'bossa',
  name: 'Bossa Nova',
  description:
    'Бразильская босса-нова: straight ритм, nylon-гитара, root-5th бас, воздушные voicing.',
  defaultTempo: 120,
  swingRatio: 0.5,
  timeSignaturePresets: ['2/4', '4/4'],
  defaultVariants: {
    drums: 'funk-drum-kit',
    bass: 'upright-bass',
    piano: 'piano',
    rhodes: 'rhodes',
    guitar: 'guitar',
    winds: 'flute',
    percussion: 'percussion',
    synth: 'organ',
  },
  instrumentRoster: {
    required: ['drums', 'bass', 'piano'],
    recommended: ['guitar', 'percussion'],
    optional: ['rhodes', 'winds'],
    hidden: ['synth'],
  },
  instrumentDefaults: {
    drums: { enabled: true, volume: 0.6, pattern: 'bossa' },
    'jazz-drum-kit': { ...OFF },
    'funk-drum-kit': { enabled: true, volume: 0.6, pattern: 'bossa' },
    'upright-bass': {
      enabled: true,
      volume: 0.7,
      pattern: 'root-5th',
      tension: 'clean',
      humanize: { phrasing: 'gentle' },
    },
    'electric-bass': { ...OFF },
    piano: {
      enabled: true,
      volume: 0.65,
      pattern: 'swing-sparse',
      voicing: 'shell2',
      humanize: {
        timingJitterMs: 'low',
        velocityVariation: 'medium',
        chordSpreadMs: 'low',
        phrasing: 'gentle',
        humanizeTiming: 'slight-rush',
      },
    },
    'upright-piano': { ...OFF },
    rhodes: { enabled: false, volume: 0.5, pattern: 'rhodes-bossa-form', voicing: 'shell2' },
    guitar: { enabled: false, volume: 0.7, pattern: 'bossa-comping', mode: 'nylon' },
    'electric-guitar': { ...OFF },
    vibraphone: { ...OFF },
    organ: { ...OFF },
    clarinet: { ...OFF },
    percussion: { enabled: true, volume: 0.6 },
    'trumpet-muted': { ...OFF },
    flute: { enabled: false, volume: 0.55, pattern: 'airy' },
  },
};

const FUNK_PROFILE: StyleProfile = {
  id: 'funk',
  name: 'Funk',
  description: 'Фанк: синкопированный грув, electric bass, offbeat-гитара, плотные voicing.',
  defaultTempo: 100,
  swingRatio: 0.5,
  timeSignaturePresets: ['4/4'],
  defaultVariants: {
    drums: 'funk-drum-kit',
    bass: 'electric-bass',
    piano: 'piano',
    rhodes: 'rhodes',
    guitar: 'electric-guitar',
    winds: 'trumpet-muted',
    percussion: 'percussion',
    synth: 'organ',
  },
  instrumentRoster: {
    required: ['drums', 'bass', 'piano'],
    recommended: ['rhodes', 'guitar', 'percussion'],
    optional: ['synth', 'winds'],
    hidden: [],
  },
  instrumentDefaults: {
    drums: { ...OFF },
    'jazz-drum-kit': { ...OFF },
    'funk-drum-kit': { enabled: true, volume: 0.75, pattern: 'funk' },
    'upright-bass': { ...OFF },
    'electric-bass': {
      enabled: true,
      volume: 0.75,
      pattern: 'syncopated',
      tension: 'altered',
      humanize: { phrasing: 'expressive' },
    },
    piano: {
      enabled: true,
      volume: 0.7,
      pattern: 'offbeat-push',
      voicing: 'rootless4',
      humanize: {
        timingJitterMs: 'low',
        velocityVariation: 'strong',
        chordSpreadMs: 'low',
        phrasing: 'expressive',
        humanizeTiming: 'slight-lag',
      },
    },
    'upright-piano': { ...OFF },
    rhodes: { enabled: false, volume: 0.6, pattern: 'rhodes-funk-form', voicing: 'rootless4' },
    guitar: { ...OFF },
    'electric-guitar': { enabled: false, volume: 0.7, pattern: 'funk-chops' },
    vibraphone: { ...OFF },
    organ: { enabled: false, volume: 0.65, pattern: 'pads-stabs' },
    clarinet: { ...OFF },
    percussion: { enabled: true, volume: 0.65 },
    'trumpet-muted': { enabled: false, volume: 0.65, pattern: 'syncopated-accents' },
    flute: { ...OFF },
  },
};

const LATIN_PROFILE: StyleProfile = {
  id: 'latin',
  name: 'Latin',
  description:
    'Латиноамериканский стиль (salsa/montuno): cascara/clave ритм, montuno-бас, квартовые voicing.',
  defaultTempo: 160,
  swingRatio: 0.5,
  timeSignaturePresets: ['4/4', '6/8'],
  defaultVariants: {
    drums: 'funk-drum-kit',
    bass: 'electric-bass',
    piano: 'piano',
    rhodes: 'rhodes',
    guitar: 'guitar',
    winds: 'trumpet-muted',
    percussion: 'percussion',
    synth: 'organ',
  },
  instrumentRoster: {
    required: ['drums', 'percussion', 'bass', 'piano'],
    recommended: ['winds'],
    optional: ['rhodes'],
    hidden: ['guitar', 'synth'],
  },
  instrumentDefaults: {
    drums: { enabled: true, volume: 0.7, pattern: 'latin' },
    'jazz-drum-kit': { ...OFF },
    'funk-drum-kit': { enabled: true, volume: 0.7, pattern: 'latin' },
    'upright-bass': { ...OFF },
    'electric-bass': {
      enabled: true,
      volume: 0.7,
      pattern: 'montuno',
      tension: 'moderate',
      humanize: { phrasing: 'gentle' },
    },
    piano: {
      enabled: true,
      volume: 0.7,
      pattern: 'latin-montuno',
      voicing: 'quartal',
      humanize: {
        timingJitterMs: 'low',
        velocityVariation: 'medium',
        chordSpreadMs: 'low',
        phrasing: 'flat',
        humanizeTiming: 'slight-lag',
      },
    },
    'upright-piano': { ...OFF },
    rhodes: { enabled: false, volume: 0.55, pattern: 'rhodes-latin-form', voicing: 'rootless3' },
    guitar: { ...OFF },
    'electric-guitar': { ...OFF },
    vibraphone: { enabled: false, volume: 0.6, pattern: 'inserts' },
    organ: { ...OFF },
    clarinet: { ...OFF },
    percussion: { enabled: true, volume: 0.7, pattern: 'latin' },
    'trumpet-muted': { enabled: false, volume: 0.65, pattern: 'melodic' },
    flute: { enabled: false, volume: 0.6, pattern: 'latin' },
  },
};

const BALLAD_PROFILE: StyleProfile = {
  id: 'ballad',
  name: 'Ballad',
  description: 'Медленная баллада: brushes на барабанах, two-feel бас, мягкие piano voicing.',
  defaultTempo: 60,
  swingRatio: 0.58,
  timeSignaturePresets: ['4/4', '3/4'],
  defaultVariants: {
    drums: 'jazz-drum-kit',
    bass: 'upright-bass',
    piano: 'piano',
    rhodes: 'rhodes',
    guitar: 'guitar',
    winds: 'flute',
    percussion: 'percussion',
    synth: 'organ',
  },
  instrumentRoster: {
    required: ['drums', 'bass', 'piano'],
    recommended: ['rhodes'],
    optional: ['winds', 'percussion'],
    hidden: ['guitar', 'synth'],
  },
  instrumentDefaults: {
    drums: { enabled: true, volume: 0.5, pattern: 'ballad' },
    'jazz-drum-kit': { enabled: true, volume: 0.5, pattern: 'ballad' },
    'funk-drum-kit': { ...OFF },
    'upright-bass': {
      enabled: true,
      volume: 0.7,
      pattern: 'two-feel',
      tension: 'clean',
      humanize: { phrasing: 'flat' },
    },
    'electric-bass': { ...OFF },
    piano: {
      enabled: true,
      volume: 0.65,
      pattern: 'beginner-safe',
      voicing: 'rootless4',
      humanize: {
        timingJitterMs: 'low',
        velocityVariation: 'medium',
        chordSpreadMs: 'low',
        phrasing: 'expressive',
        humanizeTiming: 'medium-lag',
      },
    },
    'upright-piano': { ...OFF },
    rhodes: { enabled: false, volume: 0.5, pattern: 'rhodes-ballad-form', voicing: 'shell2' },
    guitar: { ...OFF },
    'electric-guitar': { ...OFF },
    vibraphone: { enabled: false, volume: 0.55, pattern: 'pads' },
    organ: { ...OFF },
    clarinet: { ...OFF },
    percussion: { ...OFF },
    'trumpet-muted': { ...OFF },
    flute: { enabled: false, volume: 0.55, pattern: 'airy' },
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const STYLE_PROFILES: Record<Style, StyleProfile> = {
  swing: SWING_PROFILE,
  bossa: BOSSA_PROFILE,
  funk: FUNK_PROFILE,
  latin: LATIN_PROFILE,
  ballad: BALLAD_PROFILE,
};

// ─── Ensemble presets ─────────────────────────────────────────────────────────

type StyleEnsembles = Record<EnsembleType, EnsembleSettings>;

const SWING_ENSEMBLES: StyleEnsembles = {
  duet: {
    instruments: {
      piano: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.75 },
    },
  },
  trio: {
    instruments: {
      drums: { enabled: true, volume: 0.7 },
      piano: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.75 },
    },
  },
  quartet: {
    instruments: {
      drums: { enabled: true, volume: 0.7 },
      piano: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.75 },
      rhodes: { enabled: true, volume: 0.55 },
    },
  },
  quintet: {
    instruments: {
      drums: { enabled: true, volume: 0.7 },
      piano: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.75 },
      rhodes: { enabled: true, volume: 0.55 },
      guitar: { enabled: true, volume: 0.65 },
    },
  },
  full: {
    instruments: {
      drums: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.75 },
      piano: { enabled: true, volume: 0.7 },
      rhodes: { enabled: true, volume: 0.55 },
      guitar: { enabled: true, volume: 0.65 },
      'trumpet-muted': { enabled: true, volume: 0.65 },
      vibraphone: { enabled: true, volume: 0.6 },
      clarinet: { enabled: true, volume: 0.6 },
    },
  },
};

const BOSSA_ENSEMBLES: StyleEnsembles = {
  duet: {
    instruments: {
      guitar: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.7 },
    },
  },
  trio: {
    instruments: {
      drums: { enabled: true, volume: 0.6 },
      piano: { enabled: true, volume: 0.65 },
      'upright-bass': { enabled: true, volume: 0.7 },
    },
  },
  quartet: {
    instruments: {
      drums: { enabled: true, volume: 0.6 },
      piano: { enabled: true, volume: 0.65 },
      'upright-bass': { enabled: true, volume: 0.7 },
      rhodes: { enabled: true, volume: 0.5 },
    },
  },
  quintet: {
    instruments: {
      drums: { enabled: true, volume: 0.6 },
      piano: { enabled: true, volume: 0.65 },
      'upright-bass': { enabled: true, volume: 0.7 },
      guitar: { enabled: true, volume: 0.7 },
      percussion: { enabled: true, volume: 0.6 },
    },
  },
  full: {
    instruments: {
      drums: { enabled: true, volume: 0.6 },
      'upright-bass': { enabled: true, volume: 0.7 },
      piano: { enabled: true, volume: 0.65 },
      guitar: { enabled: true, volume: 0.7 },
      rhodes: { enabled: true, volume: 0.5 },
      flute: { enabled: true, volume: 0.55 },
      percussion: { enabled: true, volume: 0.6 },
    },
  },
};

const FUNK_ENSEMBLES: StyleEnsembles = {
  duet: {
    instruments: {
      'electric-bass': { enabled: true, volume: 0.75 },
      'funk-drum-kit': { enabled: true, volume: 0.75 },
    },
  },
  trio: {
    instruments: {
      'funk-drum-kit': { enabled: true, volume: 0.75 },
      'electric-bass': { enabled: true, volume: 0.75 },
      piano: { enabled: true, volume: 0.7 },
    },
  },
  quartet: {
    instruments: {
      'funk-drum-kit': { enabled: true, volume: 0.75 },
      'electric-bass': { enabled: true, volume: 0.75 },
      piano: { enabled: true, volume: 0.7 },
      rhodes: { enabled: true, volume: 0.6 },
    },
  },
  quintet: {
    instruments: {
      'funk-drum-kit': { enabled: true, volume: 0.75 },
      'electric-bass': { enabled: true, volume: 0.75 },
      piano: { enabled: true, volume: 0.7 },
      'electric-guitar': { enabled: true, volume: 0.7 },
      organ: { enabled: true, volume: 0.65 },
      percussion: { enabled: true, volume: 0.65 },
    },
  },
  full: {
    instruments: {
      'funk-drum-kit': { enabled: true, volume: 0.75 },
      'electric-bass': { enabled: true, volume: 0.75 },
      piano: { enabled: true, volume: 0.7 },
      rhodes: { enabled: true, volume: 0.6 },
      'electric-guitar': { enabled: true, volume: 0.7 },
      organ: { enabled: true, volume: 0.65 },
      'trumpet-muted': { enabled: true, volume: 0.65 },
      percussion: { enabled: true, volume: 0.65 },
    },
  },
};

const LATIN_ENSEMBLES: StyleEnsembles = {
  duet: {
    instruments: {
      percussion: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.7 },
    },
  },
  trio: {
    instruments: {
      drums: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.7 },
      piano: { enabled: true, volume: 0.7 },
    },
  },
  quartet: {
    instruments: {
      drums: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.7 },
      piano: { enabled: true, volume: 0.7 },
      rhodes: { enabled: true, volume: 0.55 },
    },
  },
  quintet: {
    instruments: {
      drums: { enabled: true, volume: 0.7 },
      percussion: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.7 },
      piano: { enabled: true, volume: 0.7 },
      'trumpet-muted': { enabled: true, volume: 0.65 },
    },
  },
  full: {
    instruments: {
      drums: { enabled: true, volume: 0.7 },
      percussion: { enabled: true, volume: 0.7 },
      'upright-bass': { enabled: true, volume: 0.7 },
      piano: { enabled: true, volume: 0.7 },
      'trumpet-muted': { enabled: true, volume: 0.65 },
      flute: { enabled: true, volume: 0.6 },
      vibraphone: { enabled: true, volume: 0.6 },
      rhodes: { enabled: true, volume: 0.55 },
    },
  },
};

const BALLAD_ENSEMBLES: StyleEnsembles = {
  duet: {
    instruments: {
      piano: { enabled: true, volume: 0.65 },
      'upright-bass': { enabled: true, volume: 0.7 },
    },
  },
  trio: {
    instruments: {
      drums: { enabled: true, volume: 0.5 },
      piano: { enabled: true, volume: 0.65 },
      'upright-bass': { enabled: true, volume: 0.7 },
    },
  },
  quartet: {
    instruments: {
      drums: { enabled: true, volume: 0.5 },
      piano: { enabled: true, volume: 0.65 },
      'upright-bass': { enabled: true, volume: 0.7 },
      rhodes: { enabled: true, volume: 0.5 },
    },
  },
  quintet: {
    instruments: {
      drums: { enabled: true, volume: 0.5 },
      piano: { enabled: true, volume: 0.65 },
      'upright-bass': { enabled: true, volume: 0.7 },
      rhodes: { enabled: true, volume: 0.5 },
      vibraphone: { enabled: true, volume: 0.55 },
    },
  },
  full: {
    instruments: {
      drums: { enabled: true, volume: 0.5 },
      'upright-bass': { enabled: true, volume: 0.7 },
      piano: { enabled: true, volume: 0.65 },
      rhodes: { enabled: true, volume: 0.5 },
      flute: { enabled: true, volume: 0.55 },
      vibraphone: { enabled: true, volume: 0.55 },
    },
  },
};

const ENSEMBLE_PRESETS: Record<Style, StyleEnsembles> = {
  swing: SWING_ENSEMBLES,
  bossa: BOSSA_ENSEMBLES,
  funk: FUNK_ENSEMBLES,
  latin: LATIN_ENSEMBLES,
  ballad: BALLAD_ENSEMBLES,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Retrieve the full StyleProfile for a given style. */
export function getStyleProfile(style: Style): StyleProfile {
  return STYLE_PROFILES[style];
}

/** Retrieve all registered style profiles. */
export function getAllStyleProfiles(): StyleProfile[] {
  return Object.values(STYLE_PROFILES);
}

/** Retrieve the instrument roster for a given style. */
export function getRoster(style: Style): InstrumentRoster {
  return STYLE_PROFILES[style].instrumentRoster;
}

// ─── Instrument group helpers ───────────────────────────────────────────────

/** Find a group definition by id. */
export function getInstrumentGroup(id: InstrumentGroupId): InstrumentGroupDef {
  const g = INSTRUMENT_GROUPS.find((x) => x.id === id);
  if (!g) throw new Error(`Unknown instrument group: ${id}`);
  return g;
}

/** Get the default variant InstrumentId for a group in a given style. */
export function getDefaultVariant(groupId: InstrumentGroupId, style: Style): InstrumentId {
  const profile = STYLE_PROFILES[style];
  const defs = profile.defaultVariants;
  return defs[groupId] ?? getInstrumentGroup(groupId).variants[0]!.instrumentId;
}

/** Resolve which InstrumentId is active for a group, considering user override. */
export function resolveGroupInstrumentId(
  groupId: InstrumentGroupId,
  style: Style,
  userVariant?: InstrumentId | null,
): InstrumentId {
  if (userVariant) {
    const group = getInstrumentGroup(groupId);
    if (group.variants.some((v) => v.instrumentId === userVariant)) {
      return userVariant;
    }
  }
  return getDefaultVariant(groupId, style);
}

/** Display-ready group info for UI rendering. */
export interface DisplayGroup {
  groupId: InstrumentGroupId;
  name: string;
  order: number;
  settingsPrefix: string;
  variants: InstrumentVariantDef[];
  activeInstrumentId: InstrumentId;
  activeVariantName: string;
}

/**
 * Compute the ordered list of instrument groups visible for a style.
 * Groups from required/recommended/optional (if enabled) are included.
 */
export function getVisibleInstrumentGroups(
  style: Style,
  userOverrides?: Partial<Record<InstrumentGroupId, boolean>>,
): DisplayGroup[] {
  const roster = getRoster(style);
  const visibleIds = new Set<InstrumentGroupId>([...roster.required, ...roster.recommended]);

  for (const id of roster.optional) {
    if (userOverrides?.[id] === true) visibleIds.add(id);
  }
  for (const id of roster.hidden) {
    if (userOverrides?.[id] === true) visibleIds.add(id);
  }

  return INSTRUMENT_GROUPS.filter((g) => visibleIds.has(g.id))
    .map((g) => {
      const activeId = getDefaultVariant(g.id, style);
      const variant = g.variants.find((v) => v.instrumentId === activeId) ?? g.variants[0]!;
      return {
        groupId: g.id,
        name: g.name,
        order: g.order,
        settingsPrefix: g.settingsPrefix,
        variants: g.variants,
        activeInstrumentId: activeId,
        activeVariantName: variant.name,
      };
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * @deprecated Use getVisibleInstrumentGroups instead.
 * Compute the set of instruments visible in the UI for a given style.
 */
export function getVisibleInstruments(
  style: Style,
  userOverrides?: Partial<Record<InstrumentId, boolean>>,
): InstrumentId[] {
  const roster = STYLE_PROFILES[style].instrumentRoster;

  // Build InstrumentId → group order lookup for sorting
  const idOrder = new Map<InstrumentId, number>();
  for (const g of INSTRUMENT_GROUPS) {
    for (const v of g.variants) {
      idOrder.set(v.instrumentId, g.order);
    }
  }

  const toIds = (groupIds: InstrumentGroupId[]): InstrumentId[] =>
    groupIds.flatMap((gid) => {
      return [getDefaultVariant(gid, style)];
    });

  const requiredIds = toIds(roster.required);
  const recommendedIds = toIds(roster.recommended);
  const visible = new Set<InstrumentId>([...requiredIds, ...recommendedIds]);

  for (const gid of roster.optional) {
    const group = getInstrumentGroup(gid);
    for (const v of group.variants) {
      if (userOverrides?.[v.instrumentId] === true) visible.add(v.instrumentId);
    }
  }
  for (const gid of roster.hidden) {
    const group = getInstrumentGroup(gid);
    for (const v of group.variants) {
      if (userOverrides?.[v.instrumentId] === true) visible.add(v.instrumentId);
    }
  }

  return [...visible].sort((a, b) => (idOrder.get(a) ?? 99) - (idOrder.get(b) ?? 99));
}

/**
 * Return a preconfigured ensemble (instrument enable/volume map) for a
 * style and ensemble size.
 */
export function getDefaultEnsemble(style: Style, ensembleType: EnsembleType): EnsembleSettings {
  return ENSEMBLE_PRESETS[style][ensembleType];
}

// ─── Ensemble preset helpers (T-022) ──────────────────────────────────────────

const ENSEMBLE_NAMES: Record<EnsembleType, string> = {
  duet: 'Дуэт',
  trio: 'Трио',
  quartet: 'Квартет',
  quintet: 'Квинтет',
  full: 'Полный состав',
};

/** Resolve an ensemble preset into full instrument settings by merging the
 *  ensemble's compact settings with the style's instrument defaults.
 *  Every known InstrumentId receives an explicit entry. */
export function getEnsemblePreset(style: Style, ensembleId: EnsembleType): EnsemblePreset {
  const profile = STYLE_PROFILES[style];
  const compact = ENSEMBLE_PRESETS[style][ensembleId];
  const defaults = profile.instrumentDefaults;

  const instrumentSettings = {} as Record<InstrumentId, InstrumentStyleDefaults>;
  for (const id of Object.keys(defaults) as InstrumentId[]) {
    const ensembleEntry = compact.instruments[id];
    if (ensembleEntry && ensembleEntry.enabled) {
      instrumentSettings[id] = {
        ...defaults[id],
        volume: ensembleEntry.volume,
        enabled: true,
      };
    } else {
      instrumentSettings[id] = { ...OFF };
    }
  }

  return {
    id: ensembleId,
    name: ENSEMBLE_NAMES[ensembleId],
    instrumentSettings,
  };
}

/** Return all 5 ensemble presets for a given style. */
export function getEnsemblePresets(style: Style): EnsemblePreset[] {
  const ENSEMBLE_IDS: EnsembleType[] = ['duet', 'trio', 'quartet', 'quintet', 'full'];
  return ENSEMBLE_IDS.map((id) => getEnsemblePreset(style, id));
}

/** Apply an ensemble preset to current instrument settings, returning a complete
 *  state where every known instrument is explicitly enabled or disabled.
 *  `currentOverrides` are merged on top of the ensemble defaults. */
export function applyEnsemble(
  style: Style,
  ensembleId: EnsembleType,
  currentOverrides?: Partial<Record<InstrumentId, Partial<InstrumentStyleDefaults>>>,
): Record<InstrumentId, InstrumentStyleDefaults> {
  const preset = getEnsemblePreset(style, ensembleId);
  const result = { ...preset.instrumentSettings };

  if (currentOverrides) {
    for (const [id, overrides] of Object.entries(currentOverrides)) {
      if (overrides && id in result) {
        result[id] = { ...(result[id] ?? OFF), ...overrides };
      }
    }
  }

  return result;
}
