/**
 * Bass organisms — section-driven form (organism → cell pool per section).
 *
 * One organism per variant×style. Each organism maps all 8 section types
 * (intro / verseA / verseB / verseC / chorus / bridge / solo / ending) onto
 * a cell pool, plus a `defaultForm` fallback used when no grid sections are
 * available. Mirrors the piano/drum organism model.
 *
 * @see docs/BASS.md
 */
import type { BassOrganism, BassPatternStyle } from './bassPatternTypes.js';
import type { SectionType } from '@jazz/shared';

interface OrganismSeed {
  id: string;
  label: string;
  style: BassPatternStyle;
  verseA: string[];
  chorus: string[];
  bridge: string[];
}

// ─── Upright organisms (swing / bossa / ballad) ──────────────────────────────

const UPRIGHT_SEED_ORGANISMS: OrganismSeed[] = [
  // ── Swing: 4 режима (первый = Авто) ────────────────────────────────────
  {
    id: 'bass-up-swing-slow-org',
    label: 'Swing Slow (половинки)',
    style: 'swing',
    verseA: ['bass-up-swing-slow'],
    chorus: ['bass-up-swing-slow'],
    bridge: ['bass-up-swing-slow'],
  },
  {
    id: 'bass-up-swing-walking-org',
    label: 'Swing Walking (четверти)',
    style: 'swing',
    verseA: ['bass-up-swing-walking'],
    chorus: ['bass-up-swing-walking'],
    bridge: ['bass-up-swing-walking'],
  },
  {
    id: 'bass-up-swing-dense-org',
    label: 'Swing Dense (восьмые)',
    style: 'swing',
    verseA: ['bass-up-swing-dense'],
    chorus: ['bass-up-swing-dense'],
    bridge: ['bass-up-swing-dense'],
  },
  {
    id: 'bass-up-swing-max-org',
    label: 'Swing Max (триоли + bebop)',
    style: 'swing',
    verseA: ['bass-up-swing-max'],
    chorus: ['bass-up-swing-max'],
    bridge: ['bass-up-swing-max'],
  },
  {
    id: 'bass-up-bossa-org',
    label: 'Upright Bossa Root-5th',
    style: 'bossa',
    verseA: ['bass-up-bossa-sparse'],
    chorus: ['bass-up-bossa-medium'],
    bridge: ['bass-up-bossa-sparse'],
  },
  {
    id: 'bass-up-ballad-org',
    label: 'Upright Ballad Two-Feel',
    style: 'ballad',
    verseA: ['bass-up-ballad-sparse'],
    chorus: ['bass-up-ballad-medium'],
    bridge: ['bass-up-ballad-sparse'],
  },
];

// ─── Electric organisms (funk / latin) ───────────────────────────────────────

const ELECTRIC_SEED_ORGANISMS: OrganismSeed[] = [
  {
    id: 'bass-el-funk-org',
    label: 'Electric Funk Pocket',
    style: 'funk',
    verseA: ['bass-el-funk-sparse'],
    chorus: ['bass-el-funk-medium'],
    bridge: ['bass-el-funk-sparse'],
  },
  {
    id: 'bass-el-funk-dense-org',
    label: 'Electric Funk Dense',
    style: 'funk',
    verseA: ['bass-el-funk-medium'],
    chorus: ['bass-el-funk-dense'],
    bridge: ['bass-el-funk-medium'],
  },
  {
    id: 'bass-el-funk-16th-org',
    label: 'Electric Funk 16th (бодрый)',
    style: 'funk',
    verseA: ['bass-el-funk-16th'],
    chorus: ['bass-el-funk-16th'],
    bridge: ['bass-el-funk-16th'],
  },
  {
    id: 'bass-el-latin-org',
    label: 'Electric Latin Montuno',
    style: 'latin',
    verseA: ['bass-el-latin-sparse'],
    chorus: ['bass-el-latin-medium'],
    bridge: ['bass-el-latin-sparse'],
  },
  {
    id: 'bass-el-latin-dense-org',
    label: 'Electric Latin Dense',
    style: 'latin',
    verseA: ['bass-el-latin-medium'],
    chorus: ['bass-el-latin-dense'],
    bridge: ['bass-el-latin-medium'],
  },
];

// ─── Build registries ────────────────────────────────────────────────────────

function buildOrganism(seed: OrganismSeed): BassOrganism {
  const verseAPool = seed.verseA;
  const chorusPool = seed.chorus;
  const bridgePool = seed.bridge;
  // Cover all 8 section types: intros/endings use the sparsest (verseA) pool,
  // solos use chorus density, verses use verseA, bridge uses bridge pool.
  const sectionMap: Partial<Record<SectionType, string[]>> = {
    intro: verseAPool,
    verseA: verseAPool,
    verseB: verseAPool,
    verseC: verseAPool,
    chorus: chorusPool,
    bridge: bridgePool,
    solo: chorusPool,
    ending: verseAPool,
  };
  return {
    id: seed.id,
    style: seed.style,
    label: seed.label,
    sectionMap,
    defaultForm: [
      { label: 'Verse', type: 'verseA', cellPool: verseAPool, repeats: 1 },
      { label: 'Chorus', type: 'chorus', cellPool: chorusPool, repeats: 1 },
      { label: 'Bridge', type: 'bridge', cellPool: bridgePool, repeats: 1 },
      { label: 'Chorus', type: 'chorus', cellPool: chorusPool, repeats: 1 },
    ],
  };
}

export const UPRIGHT_BASS_ORGANISMS: Record<string, BassOrganism> = {};
export const UPRIGHT_BASS_ORGANISM_LIST: BassOrganism[] = [];
for (const seed of UPRIGHT_SEED_ORGANISMS) {
  const org = buildOrganism(seed);
  UPRIGHT_BASS_ORGANISMS[org.id] = org;
  UPRIGHT_BASS_ORGANISM_LIST.push(org);
}

export const ELECTRIC_BASS_ORGANISMS: Record<string, BassOrganism> = {};
export const ELECTRIC_BASS_ORGANISM_LIST: BassOrganism[] = [];
for (const seed of ELECTRIC_SEED_ORGANISMS) {
  const org = buildOrganism(seed);
  ELECTRIC_BASS_ORGANISMS[org.id] = org;
  ELECTRIC_BASS_ORGANISM_LIST.push(org);
}

export function getUprightBassOrganismsForStyle(style: string): BassOrganism[] {
  return UPRIGHT_BASS_ORGANISM_LIST.filter((o) => o.style === style);
}

export function getElectricBassOrganismsForStyle(style: string): BassOrganism[] {
  return ELECTRIC_BASS_ORGANISM_LIST.filter((o) => o.style === style);
}

/** All bass organisms for a style (both upright + electric variants merged). */
export function getBassOrganismsForStyle(style: string): BassOrganism[] {
  return [...getUprightBassOrganismsForStyle(style), ...getElectricBassOrganismsForStyle(style)];
}
