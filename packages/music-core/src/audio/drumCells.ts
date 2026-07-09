import type { DrumCell } from './drumPatternTypes.js';
import { validateCell } from './drumCellValidator.js';
import { GENERATED_DRUM_CELLS } from './drumCellsGenerated.js';

const CELLS_SOURCE: Record<string, DrumCell> = GENERATED_DRUM_CELLS as Record<
  string,
  DrumCell
>;

// Validate generated/admin-edited cells at load time. Cells ship from the
// Drum Constructor API as `unknown`; surface structural problems here so a
// bad entry doesn't reach the pattern engine as a silent `TypeError`.
const CELL_VALIDATION_ERRORS: string[] = [];
for (const [id, cell] of Object.entries(CELLS_SOURCE)) {
  const errs = validateCell(cell);
  if (errs.length > 0) {
    CELL_VALIDATION_ERRORS.push(
      `${id}: ${errs.map((e) => `${e.code}(${e.detail})`).join(', ')}`,
    );
  }
}
if (CELL_VALIDATION_ERRORS.length > 0) {
  // Don't throw — log loudly so playback still works for valid cells, but the
  // problem is visible in dev. Throwing would brick the whole instrument for
  // one bad admin edit.
  console.error(
    `[drumCells] ${CELL_VALIDATION_ERRORS.length} invalid cell(s) loaded from drumCellsGenerated.ts:\n` +
      CELL_VALIDATION_ERRORS.map((e) => `  - ${e}`).join('\n'),
  );
}

export const DRUM_CELLS: Record<string, DrumCell> = CELLS_SOURCE;

export const DRUM_CELL_LIST: DrumCell[] = Object.values(DRUM_CELLS);

export function getCellsForStyle(style: string): DrumCell[] {
  return DRUM_CELL_LIST.filter((c) => c.style === style);
}
