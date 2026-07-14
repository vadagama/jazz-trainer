import type { PianoOrganism, PianoPatternStyle } from './pianoPatternTypes.js';
import { GENERATED_PIANO_ORGANISMS } from './pianoOrganismsGenerated.js';

interface OrganismSeed {
  id: string;
  label: string;
  style: PianoPatternStyle;
  verseA: string[];
  chorus: string[];
  bridge: string[];
}

const SEED_ORGANISMS: OrganismSeed[] = [
  // ── Swing organisms (3) ─────────────────────────────────────────────────
  {
    id: 'piano-swing-sparse-org',
    label: 'Swing Sparse Form',
    style: 'swing',
    verseA: ['piano-swing-sparse'],
    chorus: ['piano-swing-medium'],
    bridge: ['piano-basie-light-swing'],
  },
  {
    id: 'piano-swing-medium-org',
    label: 'Swing Medium Form',
    style: 'swing',
    verseA: ['piano-swing-medium'],
    chorus: ['piano-swing-dense'],
    bridge: ['piano-swing-sparse'],
  },
  {
    id: 'piano-beginner-form',
    label: 'Beginner Form',
    style: 'swing',
    verseA: ['piano-beginner-safe-swing'],
    chorus: ['piano-beginner-safe-swing'],
    bridge: ['piano-swing-sparse'],
  },

  // ── Bossa organisms (2) ─────────────────────────────────────────────────
  {
    id: 'piano-bossa-sparse-form',
    label: 'Bossa Sparse Form',
    style: 'bossa',
    verseA: ['piano-bossa-sparse'],
    chorus: ['piano-bossa-medium'],
    bridge: ['piano-bossa-sparse'],
  },
  {
    id: 'piano-bossa-dense-form',
    label: 'Bossa Dense Form',
    style: 'bossa',
    verseA: ['piano-bossa-medium'],
    chorus: ['piano-bossa-dense'],
    bridge: ['piano-bossa-sparse'],
  },

  // ── Funk organisms (2) ──────────────────────────────────────────────────
  {
    id: 'piano-funk-sparse-form',
    label: 'Funk Sparse Form',
    style: 'funk',
    verseA: ['piano-funk-sparse'],
    chorus: ['piano-funk-medium'],
    bridge: ['piano-funk-sparse'],
  },
  {
    id: 'piano-funk-dense-form',
    label: 'Funk Dense Form',
    style: 'funk',
    verseA: ['piano-funk-medium'],
    chorus: ['piano-funk-dense'],
    bridge: ['piano-funk-sparse'],
  },

  // ── Latin organisms (2) ─────────────────────────────────────────────────
  {
    id: 'piano-latin-montuno-form',
    label: 'Latin Montuno Form',
    style: 'latin',
    verseA: ['piano-latin-sparse'],
    chorus: ['piano-latin-montuno'],
    bridge: ['piano-latin-sparse'],
  },
  {
    id: 'piano-latin-dense-form',
    label: 'Latin Dense Form',
    style: 'latin',
    verseA: ['piano-latin-montuno'],
    chorus: ['piano-latin-dense'],
    bridge: ['piano-latin-sparse'],
  },

  // ── Ballad organisms (2) ────────────────────────────────────────────────
  {
    id: 'piano-ballad-sparse-form',
    label: 'Ballad Sparse Form',
    style: 'ballad',
    verseA: ['piano-ballad-sparse'],
    chorus: ['piano-ballad-medium'],
    bridge: ['piano-ballad-sparse'],
  },
  {
    id: 'piano-ballad-intro-form',
    label: 'Ballad Intro Form',
    style: 'ballad',
    verseA: ['piano-ballad-intro'],
    chorus: ['piano-ballad-medium'],
    bridge: ['piano-ballad-sparse'],
  },

  // ── Extended organisms: verse/chorus/bridge with upper + fill ────────────────
  {
    id: 'piano-swing-extended-form',
    label: 'Swing Extended Form',
    style: 'swing',
    verseA: ['piano-swing-extended'],
    chorus: ['piano-swing-dense'],
    bridge: ['piano-swing-extended'],
  },
  {
    id: 'piano-bossa-extended-form',
    label: 'Bossa Extended Form',
    style: 'bossa',
    verseA: ['piano-bossa-sparse'],
    chorus: ['piano-bossa-extended'],
    bridge: ['piano-bossa-sparse'],
  },
  {
    id: 'piano-funk-extended-form',
    label: 'Funk Extended Form',
    style: 'funk',
    verseA: ['piano-funk-sparse'],
    chorus: ['piano-funk-extended'],
    bridge: ['piano-funk-sparse'],
  },
  {
    id: 'piano-latin-extended-form',
    label: 'Latin Extended Form',
    style: 'latin',
    verseA: ['piano-latin-sparse'],
    chorus: ['piano-latin-extended'],
    bridge: ['piano-latin-sparse'],
  },
  {
    id: 'piano-ballad-extended-form',
    label: 'Ballad Extended Form',
    style: 'ballad',
    verseA: ['piano-ballad-extended'],
    chorus: ['piano-ballad-medium'],
    bridge: ['piano-ballad-sparse'],
  },
];

// ─── Build base registry from seeds ────────────────────────────────────────
const BASE_PIANO_ORGANISMS: Record<string, PianoOrganism> = {};
const BASE_PIANO_ORGANISM_LIST: PianoOrganism[] = [];

for (const seed of SEED_ORGANISMS) {
  const org: PianoOrganism = {
    id: seed.id,
    style: seed.style,
    label: seed.label,
    sectionMap: {
      verseA: seed.verseA,
      verseB: seed.verseA,
      chorus: seed.chorus,
      bridge: seed.bridge,
    },
    defaultForm: [
      { label: 'Verse', type: 'verseA', cellPool: seed.verseA, repeats: 1 },
      { label: 'Chorus', type: 'chorus', cellPool: seed.chorus, repeats: 1 },
      { label: 'Bridge', type: 'bridge', cellPool: seed.bridge, repeats: 1 },
      { label: 'Chorus', type: 'chorus', cellPool: seed.chorus, repeats: 1 },
    ],
  };
  BASE_PIANO_ORGANISMS[seed.id] = org;
  BASE_PIANO_ORGANISM_LIST.push(org);
}

/**
 * Итоговый реестр организмов. Если сгенерированный реестр (из Конструктора
 * фортепиано) непуст — он ПОЛНОСТЬЮ замещает базовый.
 */
const GENERATED_ORGANISMS = GENERATED_PIANO_ORGANISMS as Record<string, PianoOrganism>;

export const PIANO_ORGANISMS: Record<string, PianoOrganism> =
  Object.keys(GENERATED_ORGANISMS).length > 0 ? GENERATED_ORGANISMS : BASE_PIANO_ORGANISMS;

export const PIANO_ORGANISM_LIST: PianoOrganism[] = Object.values(PIANO_ORGANISMS);

export function getPianoOrganismsForStyle(style: string): PianoOrganism[] {
  return PIANO_ORGANISM_LIST.filter((o) => o.style === style);
}
