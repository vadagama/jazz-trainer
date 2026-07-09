/**
 * Generic pattern-engine logic — pure functions parameterised over
 * `TStyle` and `TSound`. Drum-specific {@link DrumPatternEngine} binds these
 * to the drum registries via callbacks; future instruments reuse the same core.
 */
import type {
  Atom,
  Cell,
  Dynamics,
  Hit,
  Molecule,
  Organism,
} from './types.js';

const PPQ = 480;

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ─── applySwing ───────────────────────────────────────────────────────────────

export function applySwing(
  tick: number,
  beatStart: number,
  beatDuration: number,
  swingRatio: number,
): number {
  const offsetInBeat = tick - beatStart;
  if (offsetInBeat >= beatDuration / 3 && offsetInBeat <= (beatDuration * 2) / 3) {
    return beatStart + Math.round(swingRatio * beatDuration);
  }
  return tick;
}

// ─── Dynamics ─────────────────────────────────────────────────────────────────

export function dynamicsMultiplier(
  dyn: Dynamics,
  barInCell: number,
  cellLength: number,
): number {
  const progress = cellLength > 1 ? barInCell / (cellLength - 1) : 0;
  const a = clamp01(dyn.amount);
  switch (dyn.type) {
    case 'steady':
      return 1;
    case 'crescendo':
      return 1 - a + a * progress;
    case 'decrescendo':
      return 1 - a * progress;
    case 'arch':
      return 1 - a + a * (1 - Math.abs(2 * progress - 1));
    case 'valley':
      return 1 - a * (1 - Math.abs(2 * progress - 1));
    case 'wave':
      return 1 - a * 0.5 + a * 0.5 * Math.sin(progress * Math.PI * 2);
    case 'pulse':
      return 1 - a * 0.5 + a * 0.5 * (Math.sin(progress * Math.PI * 8) * 0.5 + 0.5);
    default:
      return 1;
  }
}

// ─── assembleBar ──────────────────────────────────────────────────────────────

/**
 * Assemble the hits for a single bar of a cell, resolving molecules via the
 * caller-provided `resolveMolecule` callback (keeps this function generic —
 * it doesn't know about any specific molecule registry).
 */
export function assembleBar<TStyle extends string, TSound extends string = string>(
  cell: Cell<TStyle>,
  barInCell: number,
  swingRatio: number,
  resolveMolecule: (id: string) => Molecule<TStyle, TSound> | undefined,
): Hit<TSound>[] {
  const hits: Hit<TSound>[] = [];
  const tpBeat = PPQ;
  const barTicks = cell.timeSignature[0] * tpBeat;
  const dynMul = dynamicsMultiplier(cell.dynamics, barInCell, cell.length);

  for (const lane of cell.lanes) {
    const clip = lane.clips.find(
      (c) => barInCell >= c.startBar && barInCell < c.startBar + c.lengthBars,
    );
    if (!clip) continue;

    const mol = resolveMolecule(clip.pool[0]!);
    if (!mol) continue;

    const localBar = barInCell - clip.startBar;
    const molBar = ((localBar % mol.bars) + mol.bars) % mol.bars;

    for (const atom of mol.atoms) {
      if (Math.floor(atom.atTick / barTicks) !== molBar) continue;
      const vel = atom.velocity * cell.velocity * dynMul;
      hits.push({
        sound: atom.sound,
        atTick: atom.atTick - molBar * barTicks,
        velocity: clamp01(vel),
        durationTicks: atom.durationTicks,
      });
    }
  }

  // Apply swing to offbeat eighths
  for (const hit of hits) {
    for (let beat = 0; beat < cell.timeSignature[0]; beat++) {
      const beatStart = beat * tpBeat;
      const offset = hit.atTick - beatStart;
      if (offset >= 0 && offset < tpBeat) {
        hit.atTick = applySwing(hit.atTick, beatStart, tpBeat, swingRatio);
        break;
      }
    }
  }

  return hits.filter((h) => h.velocity > 0);
}

// ─── resolveSectionCells ──────────────────────────────────────────────────────

/**
 * Resolve the ordered cell pool for a given section type and time signature.
 * Three-level fallback:
 *   1. `timeSignatureOverrides[ts][sectionType]`    (per-size override)
 *   2. `sectionMap[sectionType]`                    (default for section type)
 *   3. `sectionMap['verseA']` or empty              (ultimate fallback)
 */
export function resolveSectionCells<TStyle extends string>(
  organism: Organism<TStyle>,
  sectionType: string,
  timeSignatureStr: string,
): string[] {
  // Level 1: time-signature override
  const tsOverride = organism.timeSignatureOverrides?.[timeSignatureStr];
  if (tsOverride) {
    const pool = tsOverride[sectionType as keyof typeof tsOverride];
    if (pool && pool.length > 0) return pool;
  }

  // Level 2: sectionMap for this type
  const sm = organism.sectionMap;
  const pool = sm[sectionType as keyof typeof sm];
  if (pool && pool.length > 0) return pool;

  // Level 3: fallback to verseA
  const verseAPool = sm['verseA' as keyof typeof sm];
  if (verseAPool && verseAPool.length > 0) return verseAPool;

  return [];
}
