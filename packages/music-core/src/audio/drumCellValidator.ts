import type { DrumCell } from './drumPatternTypes.js';
import { DRUM_MOLECULES } from './drumMolecules.js';

// Cell validation — kept in a standalone module to avoid a circular import:
// `drumCells.ts` validates at load time, and `drumPatternEngine.ts` re-exports
// this for API parity. Depends only on the molecules registry (read-only).

export interface CellValidationError {
  code: string;
  lane?: string;
  detail: string;
}

export const MAX_LANES = 15;

export function validateCell(cell: DrumCell): CellValidationError[] {
  const errors: CellValidationError[] = [];
  const err = (code: string, detail: string, lane?: string) => errors.push({ code, detail, lane });

  if (cell.lanes.length < 1 || cell.lanes.length > MAX_LANES)
    err('lane-count', 'Lanes 1..' + MAX_LANES + ', got ' + cell.lanes.length);
  if (cell.velocity < 0 || cell.velocity > 1)
    err('velocity-range', 'velocity ' + cell.velocity + ' out of 0..1');
  if (cell.dynamics.amount < 0 || cell.dynamics.amount > 1)
    err('amount-range', 'dynamics.amount ' + cell.dynamics.amount + ' out of 0..1');

  for (const lane of cell.lanes) {
    if (lane.probability < 0 || lane.probability > 1)
      err('probability-range', 'probability ' + lane.probability + ' out of 0..1', lane.name);
    const sorted = [...lane.clips].sort((a, b) => a.startBar - b.startBar);
    let prevEnd = -1;
    for (const clip of sorted) {
      if (clip.startBar < 0 || clip.lengthBars < 1)
        err('clip-bounds', 'clip start=' + clip.startBar + ' len=' + clip.lengthBars, lane.name);
      if (clip.startBar + clip.lengthBars > cell.length)
        err(
          'clip-overflow',
          'clip [' + clip.startBar + ',+' + clip.lengthBars + '] > length=' + cell.length,
          lane.name,
        );
      if (clip.startBar < prevEnd)
        err('clip-overlap', 'overlap at bar ' + clip.startBar, lane.name);
      prevEnd = clip.startBar + clip.lengthBars;
      if (clip.pool.length < 1) err('empty-pool', 'empty pool @' + clip.startBar, lane.name);
      const inPool = new Set<string>();
      for (const mid of clip.pool) {
        if (!DRUM_MOLECULES[mid]) err('unknown-molecule', 'unknown molecule ' + mid, lane.name);
        if (inPool.has(mid))
          err('duplicate-in-pool', 'duplicate ' + mid + ' @' + clip.startBar, lane.name);
        inPool.add(mid);
      }
    }
  }
  return errors;
}
