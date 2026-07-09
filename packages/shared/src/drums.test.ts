import { describe, it, expect } from 'vitest';
import {
  DrumSourcePayloadSchema,
  DrumCellSchema,
  DrumMoleculeSchema,
  DrumOrganismSchema,
} from './drums.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const validAtom = { sound: 'bassDrum', atTick: 0, velocity: 0.8, durationTicks: 480 };
const validMolecule = {
  id: 'swing-kick-1',
  label: 'Feathering 1',
  style: 'swing',
  bars: 1,
  atoms: [validAtom],
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
};
const validCell = {
  id: 'swing-8-verse',
  style: 'swing',
  length: 8,
  timeSignature: [4, 4],
  velocity: 0.85,
  dynamics: { type: 'steady', amount: 0.1 },
  lanes: [
    {
      name: 'kick',
      probability: 1,
      clips: [{ startBar: 0, lengthBars: 8, pool: ['swing-kick-1'] }],
    },
  ],
};
const validOrganismV3 = {
  id: 'swing-flat',
  style: 'swing',
  label: 'Swing flat',
  sectionMap: { verseA: ['swing-8-verse'] },
};

// ─── DrumSourcePayloadSchema ───────────────────────────────────────────────────

describe('DrumSourcePayloadSchema', () => {
  it('accepts a complete valid payload (cells + molecules + organisms)', () => {
    const res = DrumSourcePayloadSchema.safeParse({
      cells: { 'swing-8-verse': validCell },
      molecules: { 'swing-kick-1': validMolecule },
      organisms: { 'swing-flat': validOrganismV3 },
    });
    expect(res.success).toBe(true);
  });

  it('accepts a payload without organisms (organisms is optional)', () => {
    const res = DrumSourcePayloadSchema.safeParse({
      cells: { 'swing-8-verse': validCell },
      molecules: { 'swing-kick-1': validMolecule },
    });
    expect(res.success).toBe(true);
  });

  it('rejects when cells is missing', () => {
    const res = DrumSourcePayloadSchema.safeParse({
      molecules: { 'swing-kick-1': validMolecule },
    });
    expect(res.success).toBe(false);
  });

  it('rejects when molecules is missing', () => {
    const res = DrumSourcePayloadSchema.safeParse({
      cells: { 'swing-8-verse': validCell },
    });
    expect(res.success).toBe(false);
  });

  it('rejects a non-object body (null)', () => {
    const res = DrumSourcePayloadSchema.safeParse(null);
    expect(res.success).toBe(false);
  });
});

// ─── DrumCellSchema ────────────────────────────────────────────────────────────

describe('DrumCellSchema', () => {
  it('rejects a cell with more than 15 lanes', () => {
    const cell = {
      ...validCell,
      lanes: Array.from({ length: 16 }, (_, i) => ({
        name: `lane-${i}`,
        probability: 1,
        clips: [{ startBar: 0, lengthBars: 1, pool: ['x'] }],
      })),
    };
    const res = DrumCellSchema.safeParse(cell);
    expect(res.success).toBe(false);
  });

  it('rejects velocity out of range', () => {
    const res = DrumCellSchema.safeParse({ ...validCell, velocity: 1.5 });
    expect(res.success).toBe(false);
  });

  it('rejects probability out of range on a lane', () => {
    const res = DrumCellSchema.safeParse({
      ...validCell,
      lanes: [{ ...validCell.lanes[0], probability: 1.5 }],
    });
    expect(res.success).toBe(false);
  });

  it('rejects a clip with empty pool', () => {
    const res = DrumCellSchema.safeParse({
      ...validCell,
      lanes: [
        {
          name: 'kick',
          probability: 1,
          clips: [{ startBar: 0, lengthBars: 8, pool: [] }],
        },
      ],
    });
    expect(res.success).toBe(false);
  });
});

// ─── DrumMoleculeSchema ────────────────────────────────────────────────────────

describe('DrumMoleculeSchema', () => {
  it('rejects an unknown drum sound', () => {
    const res = DrumMoleculeSchema.safeParse({
      ...validMolecule,
      atoms: [{ ...validAtom, sound: 'kik' }],
    });
    expect(res.success).toBe(false);
  });

  it('rejects velocity out of range on an atom', () => {
    const res = DrumMoleculeSchema.safeParse({
      ...validMolecule,
      atoms: [{ ...validAtom, velocity: 2 }],
    });
    expect(res.success).toBe(false);
  });

  it('rejects an unknown style', () => {
    const res = DrumMoleculeSchema.safeParse({ ...validMolecule, style: 'rock' });
    expect(res.success).toBe(false);
  });
});

// ─── DrumOrganismSchema ────────────────────────────────────────────────────────

describe('DrumOrganismSchema', () => {
  it('rejects the legacy bare "verse" section type in sectionMap', () => {
    // Regression: older Drum Constructor emitted `"verse"` as a sectionMap key,
    // which is not part of SectionType and silently broke organism scheduling.
    const res = DrumOrganismSchema.safeParse({
      ...validOrganismV3,
      sectionMap: { verse: ['swing-8-verse'] },
    });
    expect(res.success).toBe(false);
  });

  it('accepts every canonical SectionType in sectionMap', () => {
    for (const type of [
      'intro',
      'verseA',
      'verseB',
      'verseC',
      'chorus',
      'bridge',
      'solo',
      'ending',
    ]) {
      const res = DrumOrganismSchema.safeParse({
        ...validOrganismV3,
        sectionMap: { [type]: ['swing-8-verse'] },
      });
      expect(res.success, `section type ${type}`).toBe(true);
    }
  });
});

// ─── DrumOrganismSchema (section-driven form) ───────────────────────────────

describe('DrumOrganismSchema (section-driven)', () => {
  const validV3 = {
    id: 'swing-v3',
    style: 'swing',
    label: 'Swing V3',
    sectionMap: {
      verseA: ['swing-16-verse'],
      bridge: ['swing-16-bridge'],
    },
  };

  it('accepts a valid v3 organism', () => {
    const res = DrumOrganismSchema.safeParse(validV3);
    expect(res.success).toBe(true);
  });

  it('accepts organism with timeSignatureOverrides', () => {
    const res = DrumOrganismSchema.safeParse({
      ...validV3,
      timeSignatureOverrides: {
        '3/4': { verseA: ['swing-waltz-12-verse'] },
      },
    });
    expect(res.success).toBe(true);
  });

  it('accepts organism with defaultForm', () => {
    const res = DrumOrganismSchema.safeParse({
      ...validV3,
      defaultForm: [{ label: 'A', type: 'verseA', cellPool: ['swing-16-verse'], repeats: 4 }],
    });
    expect(res.success).toBe(true);
  });

  it('rejects sectionMap with invalid SectionType key', () => {
    const res = DrumOrganismSchema.safeParse({
      ...validV3,
      sectionMap: { invalidType: ['swing-16-verse'] },
    });
    expect(res.success).toBe(false);
  });

  it('rejects timeSignatureOverrides with invalid time signature key', () => {
    const res = DrumOrganismSchema.safeParse({
      ...validV3,
      timeSignatureOverrides: {
        abc: { verseA: ['swing-16-verse'] },
      },
    });
    expect(res.success).toBe(false);
  });

  it('rejects timeSignatureOverrides with invalid SectionType inside', () => {
    const res = DrumOrganismSchema.safeParse({
      ...validV3,
      timeSignatureOverrides: {
        '3/4': { invalidType: ['swing-16-verse'] },
      },
    });
    expect(res.success).toBe(false);
  });

  it('accepts empty sectionMap (relies on runtime fallback)', () => {
    const res = DrumOrganismSchema.safeParse({
      ...validV3,
      sectionMap: {},
      timeSignatureOverrides: undefined,
    });
    expect(res.success).toBe(true);
  });

  it('rejects sectionMap with non-object value', () => {
    const res = DrumOrganismSchema.safeParse({
      ...validV3,
      sectionMap: null,
    });
    expect(res.success).toBe(false);
  });
});
