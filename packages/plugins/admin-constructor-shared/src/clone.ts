/**
 * Generic deep-clone helpers для паттерн-модели (atom → molecule → cell → organism).
 *
 * Инструмент-агностичны — работают с любыми `TStyle`/`TSound`. Извлечены из
 * дублированных clone-функций localModel.ts обоих плагинов.
 */
import type { Cell, Molecule, PatternOrganism } from '@jazz/music-core';

export function cloneMolecule<TStyle extends string, TSound extends string = string>(
  m: Molecule<TStyle, TSound>,
): Molecule<TStyle, TSound> {
  return {
    ...m,
    atoms: m.atoms.map((a) => ({ ...a })),
    tags: [...m.tags],
    complexity: { ...m.complexity },
    conditions: m.conditions ? { ...m.conditions } : undefined,
  };
}

export function cloneCell<TStyle extends string>(c: Cell<TStyle>): Cell<TStyle> {
  return {
    ...c,
    timeSignature: [...c.timeSignature] as Cell<TStyle>['timeSignature'],
    dynamics: { ...c.dynamics },
    lanes: c.lanes.map((l) => ({
      ...l,
      clips: l.clips.map((cl) => ({ ...cl, pool: [...cl.pool] })),
    })),
  };
}

export function cloneOrganism<TStyle extends string>(o: PatternOrganism<TStyle>): PatternOrganism<TStyle> {
  const sectionMap: PatternOrganism<TStyle>['sectionMap'] = {};
  for (const [key, pool] of Object.entries(o.sectionMap) as [string, string[]][]) {
    sectionMap[key as keyof typeof sectionMap] = [...pool];
  }
  const overrides: Record<string, Record<string, string[]>> = {};
  if (o.timeSignatureOverrides) {
    for (const [ts, map] of Object.entries(o.timeSignatureOverrides) as [string, Record<string, string[]>][]) {
      const tsMap: Record<string, string[]> = {};
      for (const [sec, pool] of Object.entries(map) as [string, string[]][]) {
        tsMap[sec] = [...pool];
      }
      overrides[ts] = tsMap;
    }
  }
  return {
    ...o,
    sectionMap,
    ...(Object.keys(overrides).length > 0 ? { timeSignatureOverrides: overrides } : {}),
    defaultForm: o.defaultForm?.map((s: typeof o.defaultForm[number]) => ({ ...s, cellPool: [...s.cellPool] })),
  };
}
