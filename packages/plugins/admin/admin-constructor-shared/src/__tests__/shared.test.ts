import { describe, it, expect } from 'vitest';
import {
  cloneMolecule,
  cloneCell,
  cloneOrganism,
} from '../clone';
import {
  subdivisionsPerBeat,
  ticksPerCol,
  colsPerBar,
  tickToCol,
  colToTick,
  colLabel,
  clamp01,
  PPQ,
  BEATS_PER_BAR,
} from '../gridMath';

describe('gridMath', () => {
  it('swing/ballad use triplets (3 subdivisions)', () => {
    expect(subdivisionsPerBeat('swing')).toBe(3);
    expect(subdivisionsPerBeat('ballad')).toBe(3);
  });

  it('bossa/funk/latin use 16ths (4 subdivisions)', () => {
    expect(subdivisionsPerBeat('bossa')).toBe(4);
    expect(subdivisionsPerBeat('funk')).toBe(4);
    expect(subdivisionsPerBeat('latin')).toBe(4);
  });

  it('ticksPerCol = PPQ / subdivisions', () => {
    expect(ticksPerCol('swing')).toBe(PPQ / 3);
    expect(ticksPerCol('funk')).toBe(PPQ / 4);
  });

  it('colsPerBar = subdivisions * BEATS_PER_BAR', () => {
    expect(colsPerBar('swing')).toBe(3 * BEATS_PER_BAR);
    expect(colsPerBar('funk')).toBe(4 * BEATS_PER_BAR);
  });

  it('tickToCol / colToTick round-trip', () => {
    for (const style of ['swing', 'bossa', 'funk', 'latin', 'ballad'] as const) {
      const tick = colToTick(5, style);
      expect(tickToCol(tick, style)).toBe(5);
    }
  });

  it('colLabel produces beat-relative labels', () => {
    expect(colLabel(0, 'swing')).toBe('1');
    expect(colLabel(0, 'funk')).toBe('1');
    expect(colLabel(4, 'funk')).toBe('2'); // 2nd beat start
  });

  it('clamp01 clamps to [0, 1]', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(NaN)).toBe(0);
  });
});

describe('clone helpers', () => {
  it('cloneMolecule deep-clones atoms and tags', () => {
    const mol = {
      id: 'test',
      label: 'Test',
      style: 'swing' as const,
      bars: 1 as const,
      atoms: [{ sound: 'ride' as const, atTick: 0, velocity: 0.8, durationTicks: 480 }],
      category: 'groove' as const,
      tags: ['swing'],
      complexity: { min: 1 as const, max: 2 as const },
    };
    const clone = cloneMolecule(mol);
    expect(clone).not.toBe(mol);
    expect(clone.atoms).not.toBe(mol.atoms);
    expect(clone.atoms[0]).not.toBe(mol.atoms[0]);
    expect(clone.tags).not.toBe(mol.tags);
    expect(clone.atoms[0]!.velocity).toBe(0.8);
    // mutate clone, original unchanged
    clone.atoms[0]!.velocity = 0.1;
    expect(mol.atoms[0]!.velocity).toBe(0.8);
  });

  it('cloneCell deep-clones lanes and clips', () => {
    const cell = {
      id: 'test-cell',
      style: 'swing' as const,
      length: 8 as const,
      timeSignature: [4, 4] as [4, 4],
      velocity: 0.8,
      dynamics: { type: 'steady' as const, amount: 0 },
      lanes: [
        {
          name: 'ride',
          probability: 1,
          clips: [{ startBar: 0, lengthBars: 1, pool: ['mol-1'] }],
        },
      ],
    };
    const clone = cloneCell(cell);
    expect(clone).not.toBe(cell);
    expect(clone.lanes).not.toBe(cell.lanes);
    expect(clone.lanes[0]!.clips).not.toBe(cell.lanes[0]!.clips);
    expect(clone.lanes[0]!.clips[0]!.pool).not.toBe(cell.lanes[0]!.clips[0]!.pool);
    // mutate, original unchanged
    clone.lanes[0]!.clips[0]!.pool.push('mol-2');
    expect(cell.lanes[0]!.clips[0]!.pool).toHaveLength(1);
  });

  it('cloneOrganism deep-clones sectionMap and overrides', () => {
    const org = {
      id: 'test-org',
      style: 'swing' as const,
      label: 'Test',
      sectionMap: { verseA: ['cell-1'] },
      timeSignatureOverrides: { '3/4': { verseA: ['waltz-cell'] } },
      defaultForm: [{ label: 'Verse', type: 'verseA' as const, cellPool: ['cell-1'] }],
    };
    const clone = cloneOrganism(org);
    expect(clone).not.toBe(org);
    expect(clone.sectionMap).not.toBe(org.sectionMap);
    expect(clone.sectionMap.verseA).not.toBe(org.sectionMap.verseA);
    expect(clone.timeSignatureOverrides).toBeDefined();
    expect(clone.timeSignatureOverrides!['3/4']).not.toBe(org.timeSignatureOverrides!['3/4']);
    expect(clone.defaultForm).toBeDefined();
    expect(clone.defaultForm![0]!.cellPool).not.toBe(org.defaultForm![0]!.cellPool);
  });
});
