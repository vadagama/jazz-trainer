import type { DrumOrganism, DrumPatternStyle } from './drumPatternTypes.js';
import type { SectionType } from '@jazz/shared';
import { GENERATED_DRUM_ORGANISMS } from './drumOrganismsGenerated.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Organisms — macro-form structures (section-driven v3)
//
// Каждый организм описывает(sectionMap): тип секции → пул клеток (cycling).
// Дополнительно: timeSignatureOverrides для не-4/4 размеров (приоритетный резолв).
// defaultForm — линейный fallback для flat-режима без grid-секций.
//
// Секции соответствуют глобальному списку SectionType из @jazz/shared:
//   intro, verseA, verseB, verseC, chorus, bridge, solo, ending
// verseC использует те же клетки что и verseA.
// ═══════════════════════════════════════════════════════════════════════════════

function organism(
  id: string,
  style: DrumPatternStyle,
  label: string,
  sectionMap: Partial<Record<SectionType, string[]>>,
  timeSignatureOverrides?: DrumOrganism['timeSignatureOverrides'],
): DrumOrganism {
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

const BASE_DRUM_ORGANISMS: Record<string, DrumOrganism> = {
  'swing-default': organism(
    'swing-default',
    'swing',
    'Swing Default (все секции, щётки)',
    {
      intro: ['swing-8-intro'],
      verseA: ['swing-16-brushes', 'swing-16-verse'],
      bridge: ['swing-16-bridge'],
      verseB: ['swing-16-brushes-comp'],
      verseC: ['swing-16-verse', 'swing-16-brushes'],
      chorus: ['swing-16-chorus'],
      solo: ['swing-16-solo'],
      ending: ['swing-8-ending'],
    },
    {
      '3/4': {
        verseA: ['swing-waltz-12-verse'],
        bridge: ['swing-waltz-12-bridge'],
        chorus: ['swing-waltz-12-chorus'],
      },
    },
  ),
  'bossa-default': organism('bossa-default', 'bossa', 'Bossa Default (все секции, канонический)', {
    intro: ['bossa-8-intro'],
    verseA: ['bossa-16-verse', 'bossa-16-verse-var'],
    bridge: ['bossa-16-bridge'],
    verseB: ['bossa-16-basic', 'bossa-16-ghost'],
    verseC: ['bossa-16-verse', 'bossa-16-verse-var'],
    chorus: ['bossa-16-chorus'],
    solo: ['bossa-16-solo'],
    ending: ['bossa-8-ending'],
  }),
  'funk-default': organism('funk-default', 'funk', 'Funk Default (все секции, канонический)', {
    intro: ['funk-8-intro'],
    verseA: ['funk-16-verse', 'funk-16-verse-var'],
    bridge: ['funk-16-bridge'],
    verseB: ['funk-16-pocket', 'funk-16-tight'],
    verseC: ['funk-16-verse', 'funk-16-verse-var'],
    chorus: ['funk-16-chorus'],
    solo: ['funk-16-solo'],
    ending: ['funk-8-ending'],
  }),
  'latin-default': organism('latin-default', 'latin', 'Latin Default (все секции, канонический)', {
    intro: ['latin-8-intro'],
    verseA: ['latin-16-verse', 'latin-16-verse-var'],
    bridge: ['latin-16-bridge'],
    verseB: ['latin-16-montuno', 'latin-16-verse-var'],
    verseC: ['latin-16-verse', 'latin-16-verse-var'],
    chorus: ['latin-16-chorus'],
    solo: ['latin-16-solo'],
    ending: ['latin-8-ending'],
  }),
  'ballad-default': organism(
    'ballad-default',
    'ballad',
    'Ballad Default (все секции, канонический)',
    {
      intro: ['ballad-8-intro'],
      verseA: ['ballad-16-verse', 'ballad-16-verse-var'],
      bridge: ['ballad-16-bridge'],
      verseB: ['ballad-16-texture', 'ballad-16-verse-var'],
      verseC: ['ballad-16-verse', 'ballad-16-verse-var'],
      chorus: ['ballad-16-chorus'],
      solo: ['ballad-16-solo'],
      ending: ['ballad-8-ending'],
    },
  ),
};

/**
 * Итоговый реестр организмов. Если сгенерированный реестр непуст —
 * он ПОЛНОСТЬЮ замещает базовый.
 */
export const DRUM_ORGANISMS: Record<string, DrumOrganism> =
  Object.keys(GENERATED_DRUM_ORGANISMS).length > 0
    ? (GENERATED_DRUM_ORGANISMS as Record<string, DrumOrganism>)
    : BASE_DRUM_ORGANISMS;

export const DRUM_ORGANISM_LIST: DrumOrganism[] = Object.values(DRUM_ORGANISMS);

export function getOrganismsForStyle(style: string): DrumOrganism[] {
  return DRUM_ORGANISM_LIST.filter((o) => o.style === style);
}
