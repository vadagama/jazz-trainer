/**
 * Seed Rhodes organisms — per-style song-form arrangements.
 *
 * Each organism maps section types (intro/verseA/verseB/verseC/chorus/bridge/
 * solo/ending) to cell pools. The `solo` section always points at the
 * step-back `rhodes-solo-sparse` cell so Rhodes yields the foreground to the
 * soloist. See docs/MELODIC-PLUGIN.md §2.2 (all 8 section types covered).
 */
import type { RhodesOrganism, RhodesPatternStyle } from './rhodesPatternTypes.js';
import { GENERATED_RHODES_ORGANISMS } from './rhodesOrganismsGenerated.js';

interface OrganismSeed {
  id: string;
  label: string;
  style: RhodesPatternStyle;
  verseA: string[];
  chorus: string[];
  bridge: string[];
  /** Optional overrides for other section types (intro/ending/solo). */
  sections?: Partial<Record<'intro' | 'verseB' | 'verseC' | 'solo' | 'ending', string[]>>;
}

const SEED_ORGANISMS: OrganismSeed[] = [
  // ── Swing ────────────────────────────────────────────────────────────────
  {
    id: 'rhodes-swing-form',
    label: 'Swing Complement Form',
    style: 'swing',
    verseA: ['rhodes-swing-complement'],
    chorus: ['rhodes-swing-complement'],
    bridge: ['rhodes-swing-sparse'],
    sections: { solo: ['rhodes-solo-sparse'] },
  },
  {
    id: 'rhodes-swing-sparse-form',
    label: 'Swing Sparse Form',
    style: 'swing',
    verseA: ['rhodes-swing-sparse'],
    chorus: ['rhodes-swing-sparse'],
    bridge: ['rhodes-swing-sparse'],
    sections: { solo: ['rhodes-solo-sparse'] },
  },

  // ── Funk ─────────────────────────────────────────────────────────────────
  {
    id: 'rhodes-funk-form',
    label: 'Funk Mellow Form',
    style: 'funk',
    verseA: ['rhodes-funk-mellow'],
    chorus: ['rhodes-funk-mellow'],
    bridge: ['rhodes-funk-mellow'],
  },

  // ── Ballad ───────────────────────────────────────────────────────────────
  {
    id: 'rhodes-ballad-form',
    label: 'Ballad Gentle Form',
    style: 'ballad',
    verseA: ['rhodes-ballad-gentle'],
    chorus: ['rhodes-ballad-gentle'],
    bridge: ['rhodes-ballad-ambient'],
  },
  {
    id: 'rhodes-ballad-ambient-form',
    label: 'Ballad Ambient Form',
    style: 'ballad',
    verseA: ['rhodes-ballad-ambient'],
    chorus: ['rhodes-ballad-gentle'],
    bridge: ['rhodes-ballad-ambient'],
  },

  // ── Bossa ────────────────────────────────────────────────────────────────
  {
    id: 'rhodes-bossa-form',
    label: 'Bossa Gentle Form',
    style: 'bossa',
    verseA: ['rhodes-bossa-gentle'],
    chorus: ['rhodes-bossa-gentle'],
    bridge: ['rhodes-bossa-gentle'],
  },

  // ── Latin ────────────────────────────────────────────────────────────────
  {
    id: 'rhodes-latin-form',
    label: 'Latin Cascade Form',
    style: 'latin',
    verseA: ['rhodes-latin-sparse'],
    chorus: ['rhodes-latin-cascade'],
    bridge: ['rhodes-latin-sparse'],
  },
];

// ─── Build base registry from seeds ────────────────────────────────────────
const BASE_RHODES_ORGANISMS: Record<string, RhodesOrganism> = {};
const BASE_RHODES_ORGANISM_LIST: RhodesOrganism[] = [];

for (const seed of SEED_ORGANISMS) {
  const org: RhodesOrganism = {
    id: seed.id,
    style: seed.style,
    label: seed.label,
    sectionMap: {
      intro: seed.sections?.intro ?? seed.verseA,
      verseA: seed.verseA,
      verseB: seed.sections?.verseB ?? seed.verseA,
      verseC: seed.sections?.verseC ?? seed.verseA,
      chorus: seed.chorus,
      bridge: seed.bridge,
      solo: seed.sections?.solo ?? ['rhodes-solo-sparse'],
      ending: seed.sections?.ending ?? seed.verseA,
    },
    defaultForm: [
      { label: 'Verse', type: 'verseA', cellPool: seed.verseA, repeats: 1 },
      { label: 'Chorus', type: 'chorus', cellPool: seed.chorus, repeats: 1 },
      { label: 'Bridge', type: 'bridge', cellPool: seed.bridge, repeats: 1 },
      { label: 'Chorus', type: 'chorus', cellPool: seed.chorus, repeats: 1 },
    ],
  };
  BASE_RHODES_ORGANISMS[org.id] = org;
  BASE_RHODES_ORGANISM_LIST.push(org);
}

/**
 * Итоговый реестр организмов. Если сгенерированный реестр (из Конструктора
 * Rhodes) непуст — он ПОЛНОСТЬЮ замещает базовый.
 */
const GENERATED_ORGANISMS = GENERATED_RHODES_ORGANISMS as Record<string, RhodesOrganism>;

export const RHODES_ORGANISMS: Record<string, RhodesOrganism> =
  Object.keys(GENERATED_ORGANISMS).length > 0 ? GENERATED_ORGANISMS : BASE_RHODES_ORGANISMS;

export const RHODES_ORGANISM_LIST: RhodesOrganism[] = Object.values(RHODES_ORGANISMS);

export function getRhodesOrganismsForStyle(style: string): RhodesOrganism[] {
  return RHODES_ORGANISM_LIST.filter((o) => o.style === style);
}
