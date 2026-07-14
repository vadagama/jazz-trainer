import type { PercussionOrganism, PercussionPatternStyle } from './percussionPatternTypes.js';
import type { SectionType } from '@jazz/shared';
import { GENERATED_PERCUSSION_ORGANISMS } from './percussionOrganismsGenerated.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Organisms — macro-form structures (section-driven)
//
// Each organism describes (sectionMap): section type → cell pool (cycling).
// defaultForm — linear fallback when no grid sections available.
//
// Sections: intro, verseA, verseB, verseC, chorus, bridge, solo, ending
// verseC uses the same cells as verseA.
// ═══════════════════════════════════════════════════════════════════════════════

function organism(
  id: string,
  style: PercussionPatternStyle,
  label: string,
  sectionMap: Partial<Record<SectionType, string[]>>,
  timeSignatureOverrides?: PercussionOrganism['timeSignatureOverrides'],
): PercussionOrganism {
  const defaultForm = Object.entries(sectionMap).map(([type, cellPool]) => ({
    label: type,
    type: type as SectionType,
    cellPool: cellPool!,
    repeats: 1,
  }));
  return timeSignatureOverrides
    ? { id, style, label, sectionMap, timeSignatureOverrides, defaultForm }
    : { id, style, label, sectionMap, defaultForm };
}

const BASE_PERCUSSION_ORGANISMS: Record<string, PercussionOrganism> = {
  // ── Latin ──────────────────────────────────────────────────────────────────

  'latin-default': organism('latin-default', 'latin', 'Latin Default (cascara, montuno, sparse)', {
    intro: ['latin-8-intro'],
    verseA: ['latin-16-verse', 'latin-16-verse-var'],
    verseB: ['latin-16-montuno', 'latin-16-verse-var'],
    verseC: ['latin-16-verse', 'latin-16-verse-var'],
    chorus: ['latin-16-chorus'],
    bridge: ['latin-16-bridge'],
    solo: ['latin-16-solo'],
    ending: ['latin-8-ending'],
  }),

  // ── Bossa ──────────────────────────────────────────────────────────────────

  'bossa-default': organism(
    'bossa-default',
    'bossa',
    'Bossa Default (shaker, clave, conga, texture)',
    {
      intro: ['bossa-8-intro'],
      verseA: ['bossa-16-verse', 'bossa-16-verse-var'],
      verseB: ['bossa-16-basic', 'bossa-16-verse-var'],
      verseC: ['bossa-16-verse', 'bossa-16-verse-var'],
      chorus: ['bossa-16-chorus'],
      bridge: ['bossa-16-bridge'],
      solo: ['bossa-16-solo'],
      ending: ['bossa-8-ending'],
    },
  ),

  // ── Funk ───────────────────────────────────────────────────────────────────

  'funk-default': organism(
    'funk-default',
    'funk',
    'Funk Default (conga, bongo, cowbell, triangle — no shaker)',
    {
      intro: ['funk-8-intro'],
      verseA: ['funk-16-verse', 'funk-16-verse-var'],
      verseB: ['funk-16-pocket', 'funk-16-tight'],
      verseC: ['funk-16-verse', 'funk-16-verse-var'],
      chorus: ['funk-16-chorus'],
      bridge: ['funk-16-bridge'],
      solo: ['funk-16-solo'],
      ending: ['funk-8-ending'],
    },
  ),
};

export const PERCUSSION_ORGANISMS: Record<string, PercussionOrganism> =
  Object.keys(GENERATED_PERCUSSION_ORGANISMS).length > 0
    ? (GENERATED_PERCUSSION_ORGANISMS as Record<string, PercussionOrganism>)
    : BASE_PERCUSSION_ORGANISMS;

export const PERCUSSION_ORGANISM_LIST: PercussionOrganism[] = Object.values(PERCUSSION_ORGANISMS);

export function getOrganismsForStyle(style: string): PercussionOrganism[] {
  return PERCUSSION_ORGANISM_LIST.filter((o) => o.style === style);
}
