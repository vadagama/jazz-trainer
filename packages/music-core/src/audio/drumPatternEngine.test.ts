import { describe, it, expect } from 'vitest';
import { DrumPatternEngine, validateCell } from './drumPatternEngine.js';
import { DRUM_CELL_LIST } from './drumCells.js';
import { DRUM_MOLECULES } from './drumMolecules.js';
import { getOrganismsForStyle } from './drumOrganisms.js';
import type { DrumCell, DrumLane, DrumOrganism } from './drumPatternTypes.js';

function cell(overrides: Partial<DrumCell> = {}): DrumCell {
  return {
    id: 'test',
    style: 'swing',
    length: 8,
    timeSignature: [4, 4],
    velocity: 1,
    dynamics: { type: 'steady', amount: 0 },
    lanes: [],
    ...overrides,
  };
}

const lane = (name: string, ...clips: DrumLane['clips']): DrumLane => ({
  name,
  probability: 1,
  clips,
});

const engine = new DrumPatternEngine();

describe('DrumPatternEngine.assembleBar', () => {
  it('is idempotent for identical inputs', () => {
    const c = cell({
      lanes: [
        lane('ride', {
          startBar: 0,
          lengthBars: 4,
          pool: ['swing-ride-basic'],
        }),
      ],
    });
    const a = engine.assembleBar(c, 0, 0.5);
    const b = engine.assembleBar(c, 0, 0.5);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('selects pool molecules deterministically per bar (not always pool[0])', () => {
    const c = cell({
      lanes: [
        lane('groove', {
          startBar: 0,
          lengthBars: 4,
          pool: ['swing-ride-basic', 'swing-feathering-1'],
        }),
      ],
    });
    // Determinism: same bar always produces the same hits
    const a0 = engine.assembleBar(c, 0, 0.5);
    const b0 = engine.assembleBar(c, 0, 0.5);
    expect(a0).toEqual(b0);
    expect(a0.length).toBeGreaterThan(0);

    // At least one bar should differ from bar 0 (pool has 2 items)
    const sounds = new Set<string>();
    for (let bar = 0; bar < 8; bar++) {
      for (const h of engine.assembleBar(c, bar, 0.5)) sounds.add(h.sound);
    }
    expect(sounds.has('ride')).toBe(true);
    expect(sounds.has('bassDrum')).toBe(true);
  });

  it('tiles a 2-bar molecule across the span (molBar cycles every 2 bars)', () => {
    const two = DRUM_MOLECULES['funk-snare-buzz-phrase'];
    expect(two?.bars).toBe(2);
    const c = cell({
      style: 'funk',
      length: 8,
      lanes: [
        lane('snare', {
          startBar: 0,
          lengthBars: 4,
          pool: ['funk-snare-buzz-phrase'],
        }),
      ],
    });
    const b0 = engine.assembleBar(c, 0, 0.5);
    const b1 = engine.assembleBar(c, 1, 0.5);
    const b2 = engine.assembleBar(c, 2, 0.5);
    const b3 = engine.assembleBar(c, 3, 0.5);
    expect(b0.length).toBeGreaterThan(0); // molBar 0 → atoms
    expect(b1).toHaveLength(0); // molBar 1 → no atoms in this molecule
    expect(b3).toHaveLength(0);
    expect(b2).toEqual(b0);
    for (const h of b0) expect(h.atTick).toBeLessThan(1920);
  });

  it('respects clip span boundaries', () => {
    const c = cell({
      length: 8,
      lanes: [
        lane('ride', {
          startBar: 1,
          lengthBars: 2,
          pool: ['swing-ride-basic'],
        }),
      ],
    });
    expect(engine.assembleBar(c, 0, 0.5)).toHaveLength(0);
    expect(engine.assembleBar(c, 1, 0.5).length).toBeGreaterThan(0);
    expect(engine.assembleBar(c, 2, 0.5).length).toBeGreaterThan(0);
    expect(engine.assembleBar(c, 3, 0.5)).toHaveLength(0);
  });

  it('dynamics crescendo scales velocity up across the cell', () => {
    const c = cell({
      length: 8,
      dynamics: { type: 'crescendo', amount: 0.5 },
      lanes: [
        lane('ride', {
          startBar: 0,
          lengthBars: 4,
          pool: ['swing-ride-basic'],
        }),
      ],
    });
    const first = engine.assembleBar(c, 0, 0.5)[0]!;
    const last = engine.assembleBar(c, 3, 0.5)[0]!;
    expect(last.velocity).toBeGreaterThan(first.velocity);
  });

  it('cell.velocity scales molecule velocity', () => {
    const loud = cell({
      velocity: 1,
      lanes: [
        lane('ride', {
          startBar: 0,
          lengthBars: 4,
          pool: ['swing-ride-basic'],
        }),
      ],
    });
    const quiet = cell({
      velocity: 0.5,
      lanes: [
        lane('ride', {
          startBar: 0,
          lengthBars: 4,
          pool: ['swing-ride-basic'],
        }),
      ],
    });
    const l = engine.assembleBar(loud, 0, 0.5)[0]!;
    const q = engine.assembleBar(quiet, 0, 0.5)[0]!;
    expect(q.velocity).toBeCloseTo(l.velocity * 0.5, 5);
  });
});

describe('validateCell', () => {
  it('accepts a valid cell', () => {
    const c = cell({
      lanes: [
        lane('ride', {
          startBar: 0,
          lengthBars: 4,
          pool: ['swing-ride-basic'],
        }),
      ],
    });
    expect(validateCell(c)).toEqual([]);
  });

  it('flags overlapping clips in a lane', () => {
    const c = cell({
      lanes: [
        lane(
          'ride',
          { startBar: 0, lengthBars: 3, pool: ['swing-ride-basic'] },
          { startBar: 2, lengthBars: 2, pool: ['swing-feathering-1'] },
        ),
      ],
    });
    expect(validateCell(c).some((e) => e.code === 'clip-overlap')).toBe(true);
  });

  it('flags duplicate molecule within a pool', () => {
    const c = cell({
      lanes: [
        lane('ride', {
          startBar: 0,
          lengthBars: 4,
          pool: ['swing-ride-basic', 'swing-ride-basic'],
        }),
      ],
    });
    expect(validateCell(c).some((e) => e.code === 'duplicate-in-pool')).toBe(true);
  });

  it('flags unknown molecule and >15 lanes', () => {
    const bad = cell({
      lanes: [lane('x', { startBar: 0, lengthBars: 4, pool: ['nope'] })],
    });
    expect(validateCell(bad).some((e) => e.code === 'unknown-molecule')).toBe(true);

    const many = cell({
      lanes: Array.from({ length: 16 }, (_, i) =>
        lane(`l${i}`, {
          startBar: 0,
          lengthBars: 4,
          pool: ['swing-ride-basic'],
        }),
      ),
    });
    expect(validateCell(many).some((e) => e.code === 'lane-count')).toBe(true);
  });

  it('all converted DRUM_CELLS are valid', () => {
    for (const c of DRUM_CELL_LIST) {
      expect(validateCell(c), `cell ${c.id}`).toEqual([]);
    }
  });
});

// ─── Organisms registry ────────────────────────────────────────────────────

describe('drum organisms registry', () => {
  it('swing-default has full sectionMap and defaultForm', () => {
    const orgs = getOrganismsForStyle('swing');
    const def = orgs.find((o) => o.id === 'swing-default');
    expect(def).toBeDefined();
    expect(def!.sectionMap.verseA).toBeDefined();
    expect(def!.sectionMap.verseA!.length).toBeGreaterThan(0);
    expect(def!.sectionMap.bridge).toBeDefined();
    expect(def!.sectionMap.chorus).toBeDefined();
    expect(def!.sectionMap.solo).toBeDefined();
    expect(def!.defaultForm).toBeDefined();
    expect(def!.defaultForm!.length).toBeGreaterThan(0);
  });

  it('swing-default carries 3/4 time-signature override', () => {
    const orgs = getOrganismsForStyle('swing');
    const def = orgs.find((o) => o.id === 'swing-default');
    expect(def!.timeSignatureOverrides?.['3/4']?.verseA).toBeDefined();
  });
});

// ─── resolveSectionCells & selectCellForSectionType ────────────────────────

describe('DrumPatternEngine section-driven', () => {
  const v3Organism: DrumOrganism = {
    id: 'test-v3',
    style: 'swing',
    label: 'Test V3',
    sectionMap: {
      verseA: ['swing-16-verse', 'swing-16-brushes'],
      bridge: ['swing-16-bridge'],
    },
  };

  it('resolveSectionCells returns correct pool for verseA', () => {
    const pool = engine.resolveSectionCells(v3Organism, 'verseA', '4/4');
    expect(pool).toEqual(['swing-16-verse', 'swing-16-brushes']);
  });

  it('resolveSectionCells returns correct pool for bridge', () => {
    const pool = engine.resolveSectionCells(v3Organism, 'bridge', '4/4');
    expect(pool).toEqual(['swing-16-bridge']);
  });

  it('resolveSectionCells falls back to verseA for unknown section type', () => {
    const pool = engine.resolveSectionCells(v3Organism, 'chorus', '4/4');
    expect(pool).toEqual(['swing-16-verse', 'swing-16-brushes']);
  });

  it('timeSignatureOverride takes priority over sectionMap', () => {
    const org: DrumOrganism = {
      ...v3Organism,
      timeSignatureOverrides: {
        '3/4': { verseA: ['swing-waltz-12-verse'] },
      },
    };
    const pool = engine.resolveSectionCells(org, 'verseA', '3/4');
    expect(pool).toEqual(['swing-waltz-12-verse']);
  });

  it('timeSignatureOverride falls through to sectionMap when type not in override', () => {
    const org: DrumOrganism = {
      ...v3Organism,
      timeSignatureOverrides: {
        '3/4': { verseA: ['swing-waltz-12-verse'] },
      },
    };
    // bridge is NOT in the 3/4 override
    const pool = engine.resolveSectionCells(org, 'bridge', '3/4');
    expect(pool).toEqual(['swing-16-bridge']);
  });

  it('selectCellForSectionType picks a cell from the pool', () => {
    const result = engine.selectCellForSectionType(v3Organism, 'verseA', '4/4', 0, 'swing', 42);
    expect(result.cell).toBeDefined();
    expect(result.cell.style).toBe('swing');
    expect(result.barInCell).toBeGreaterThanOrEqual(0);
  });

  it('selectCellForSectionType cycles pool every cell.length bars', () => {
    // verseA pool: ['swing-16-verse' (len 16), 'swing-16-brushes' (len 16)]
    // bar 0 → index 0, bar 16 → index 1
    const r0 = engine.selectCellForSectionType(v3Organism, 'verseA', '4/4', 0, 'swing', 42);
    const r16 = engine.selectCellForSectionType(v3Organism, 'verseA', '4/4', 16, 'swing', 42);
    expect(r0.cell.id).toBe('swing-16-verse');
    expect(r16.cell.id).toBe('swing-16-brushes');
  });

  it('selectCellForSectionType cycles pool per form pass (passIndex)', () => {
    // bar 0, pass 0 → cell[0]; bar 0, pass 1 → cell[1]; bar 0, pass 2 → cell[0]
    const r0 = engine.selectCellForSectionType(v3Organism, 'verseA', '4/4', 0, 'swing', 42, 0);
    const r1 = engine.selectCellForSectionType(v3Organism, 'verseA', '4/4', 0, 'swing', 42, 1);
    const r2 = engine.selectCellForSectionType(v3Organism, 'verseA', '4/4', 0, 'swing', 42, 2);
    expect(r0.cell.id).toBe('swing-16-verse');
    expect(r1.cell.id).toBe('swing-16-brushes');
    // pass 2 wraps back to cell[0]
    expect(r2.cell.id).toBe('swing-16-verse');
  });

  it('passIndex composes with within-section bar cycling', () => {
    // 32-bar section, 16-bar cells: pass 0 bar 16 → cell[1]; pass 1 bar 0 → cell[1]
    const rPass0Bar16 = engine.selectCellForSectionType(
      v3Organism,
      'verseA',
      '4/4',
      16,
      'swing',
      42,
      0,
    );
    const rPass1Bar0 = engine.selectCellForSectionType(
      v3Organism,
      'verseA',
      '4/4',
      0,
      'swing',
      42,
      1,
    );
    expect(rPass0Bar16.cell.id).toBe('swing-16-brushes');
    expect(rPass1Bar0.cell.id).toBe('swing-16-brushes');
  });

  it('selectOrganism returns a section-driven organism', () => {
    const org = engine.selectOrganism('swing', 0, 0x5eed);
    expect(org).toBeDefined();
    expect(org.sectionMap).toBeDefined();
    expect(org.sectionMap.verseA).toBeDefined();
  });
});
