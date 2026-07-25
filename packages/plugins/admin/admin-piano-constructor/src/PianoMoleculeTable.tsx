import { useRef, useState, useCallback } from 'react';
import { Play, Square, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, cn } from '@jazz/ui';
import type { PianoHit, VoiceRole } from '@jazz/music-core';
import {
  clamp01,
  colLabel,
  colToTick,
  colsPerBar,
  tickToCol,
  ticksPerCol,
  type MoleculeEditorProps,
} from '@jazz/plugin-admin-constructor-shared';
import { roleLabel, roleDescription, VOICE_ROLES } from './pianoSampler.js';

type Props = MoleculeEditorProps<'swing' | 'bossa' | 'funk' | 'latin' | 'ballad', VoiceRole>;

const CELL_H = 22;
const HEADER_H = 22;
const LABEL_W = 76;

interface SelectedCell {
  sound: string;
  col: number;
}

interface DragState {
  sound: string;
  startCol: number;
  startX: number;
  startY: number;
  startVel: number;
  startTick: number;
  startDurTicks: number;
  movedH: boolean;
  movedV: boolean;
}

export function PianoMoleculeTable({
  molecule,
  onChange,
  onDelete,
  isPlaying,
  currentTick,
  onPlay,
  onStop,
  makeAtom,
}: Props) {
  const style = molecule.style;
  const bars = molecule.bars;
  const perBar = colsPerBar(style);
  const totalCols = perBar * bars;
  const tickStep = ticksPerCol(style);

  const moleculeRef = useRef(molecule);
  moleculeRef.current = molecule;

  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [dragSound, setDragSound] = useState<string | null>(null);
  const dragAddRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);

  // ── row computation ──────────────────────────────────────────────────────

  /** Rows: fixed canonical role order (VOICE_ROLES) — stable regardless of
   *  which roles currently have atoms or in what order they were added, so
   *  adding a note never reshuffles the grid. */
  const rows = VOICE_ROLES.map((role) => ({ sound: role, label: roleLabel(role) }));

  /** Roles that currently have at least one atom (for subtle row shading). */
  const usedRoles = new Set(molecule.atoms.map((a) => a.sound));

  // ── atom lookup ──────────────────────────────────────────────────────────

  const atomIndex = new Map<string, number>();
  molecule.atoms.forEach((a, i) => {
    const col = tickToCol(a.atTick, style);
    atomIndex.set(`${a.sound}:${col}`, i);
  });

  const atomAt = (sound: string, col: number) => {
    const idx = atomIndex.get(`${sound}:${col}`);
    return idx != null ? molecule.atoms[idx] : null;
  };

  const hasAtom = (sound: string, col: number) => atomAt(sound, col) != null;

  // ── visual duration capping (clip sustain before the next independent atom) ─
  //
  // A note's nominal duration (rounded to grid columns) can overlap the column
  // where the *next* atom in the same row starts — e.g. after swing-snapping,
  // consecutive 8th-note hits don't always land an exact number of columns
  // apart. Without capping, the sustain silently swallows that next atom's
  // cell (it never renders, though it still plays — data/audio are unaffected,
  // only the piano-roll). Capping to the distance-to-next-atom fixes the
  // visual grid consistently for both the sustain shading and the span itself.
  const sortedColsBySound = new Map<string, number[]>();
  for (const a of molecule.atoms) {
    const col = tickToCol(a.atTick, style);
    const arr = sortedColsBySound.get(a.sound) ?? [];
    arr.push(col);
    sortedColsBySound.set(a.sound, arr);
  }
  for (const arr of sortedColsBySound.values()) arr.sort((x, y) => x - y);

  const visualDurCols = (sound: string, startCol: number, nominalDurCols: number): number => {
    const cols = sortedColsBySound.get(sound) ?? [];
    const idx = cols.indexOf(startCol);
    const nextCol = idx >= 0 && idx + 1 < cols.length ? cols[idx + 1]! : totalCols;
    return Math.max(1, Math.min(nominalDurCols, nextCol - startCol, totalCols - startCol));
  };

  // ── stretched-note occupancy ─────────────────────────────────────────────

  const stretchedCoverage = new Map<string, Set<number>>();
  for (const a of molecule.atoms) {
    const startCol = tickToCol(a.atTick, style);
    const nominalDurCols = Math.max(1, Math.round(a.durationTicks / tickStep));
    const durCols = visualDurCols(a.sound, startCol, nominalDurCols);
    if (durCols <= 1) continue;
    let cols = stretchedCoverage.get(a.sound);
    if (!cols) {
      cols = new Set();
      stretchedCoverage.set(a.sound, cols);
    }
    for (let c = startCol + 1; c < startCol + durCols && c < totalCols; c++) {
      cols.add(c);
    }
  }

  // ── mutations ────────────────────────────────────────────────────────────

  const setAtom = useCallback(
    (
      sound: string,
      col: number,
      patch: Partial<{ atTick: number; velocity: number; durationTicks: number }>,
    ) => {
      const idx = atomIndex.get(`${sound}:${col}`);
      if (idx == null) return;
      onChange({
        ...moleculeRef.current,
        atoms: moleculeRef.current.atoms.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
      });
    },
    [atomIndex, onChange],
  );

  const removeAtom = (sound: string, col: number) => {
    const idx = atomIndex.get(`${sound}:${col}`);
    if (idx == null) return;
    onChange({
      ...moleculeRef.current,
      atoms: moleculeRef.current.atoms.filter((_, i) => i !== idx),
    });
  };

  const addAtom = (sound: string, col: number) => {
    onChange({
      ...moleculeRef.current,
      atoms: [...moleculeRef.current.atoms, makeAtom(sound as VoiceRole, colToTick(col, style))],
    });
  };

  const moveAtom = (sound: string, fromCol: number, toCol: number) => {
    const idx = atomIndex.get(`${sound}:${fromCol}`);
    if (idx == null) return;
    if (hasAtom(sound, toCol)) return;
    onChange({
      ...moleculeRef.current,
      atoms: moleculeRef.current.atoms.map((a, i) =>
        i === idx ? { ...a, atTick: colToTick(toCol, style) } : a,
      ),
    });
    setSelected({ sound, col: toCol });
  };

  // ── pointer handlers ─────────────────────────────────────────────────────

  const onPointerDown = (sound: string, col: number, e: React.PointerEvent) => {
    const active = hasAtom(sound, col);
    if (active) {
      const atom = atomAt(sound, col)!;
      dragRef.current = {
        sound,
        startCol: col,
        startX: e.clientX,
        startY: e.clientY,
        startVel: atom.velocity,
        startTick: atom.atTick,
        startDurTicks: atom.durationTicks,
        movedH: false,
        movedV: false,
      };
      setSelected({ sound, col });
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragUp);
    } else {
      addAtom(sound, col);
      dragAddRef.current = true;
      setDragSound(sound);
      setSelected({ sound, col });
    }
  };

  const onCellEnter = (sound: string, col: number) => {
    // Драг должен оставаться в той роли (строке), где начался клик — иначе
    // небольшое дрожание мыши между соседними строками добавляет/удаляет
    // ноты и в них тоже.
    if (dragSound == null || sound !== dragSound) return;
    if (dragAddRef.current) {
      if (!hasAtom(sound, col)) addAtom(sound, col);
    } else {
      if (hasAtom(sound, col)) removeAtom(sound, col);
    }
  };

  const onPointerUp = () => {
    setDragSound(null);
    dragAddRef.current = false;
  };

  const onDragMove = (e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;

    const dx = e.clientX - d.startX;
    const dy = d.startY - e.clientY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (!d.movedH && !d.movedV) {
      if (absDx > 3 || absDy > 3) {
        if (absDx >= absDy) d.movedH = true;
        else d.movedV = true;
      } else {
        return;
      }
    }

    if (d.movedV) {
      const vel = clamp01(d.startVel + dy * 0.01);
      setAtom(d.sound, d.startCol, { velocity: vel });
    } else if (d.movedH) {
      const colDelta = Math.round(dx / 30);
      const targetCol = Math.max(0, Math.min(totalCols - 1, d.startCol + colDelta));

      if (e.shiftKey) {
        const durCols = Math.max(1, targetCol - d.startCol + 1);
        setAtom(d.sound, d.startCol, { durationTicks: Math.round(durCols * tickStep) });
      } else {
        if (targetCol !== d.startCol && !hasAtom(d.sound, targetCol)) {
          moveAtom(d.sound, d.startCol, targetCol);
          d.startCol = targetCol;
          d.startX = e.clientX;
        }
      }
    }
  };

  const onDragUp = () => {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragUp);
    dragRef.current = null;
  };

  // ── selected atom ────────────────────────────────────────────────────────

  const selectedAtom = selected ? atomAt(selected.sound, selected.col) : null;
  const selectedDurCols = selectedAtom
    ? Math.max(1, Math.round(selectedAtom.durationTicks / tickStep))
    : 1;

  // ── playhead ─────────────────────────────────────────────────────────────

  const playheadCol =
    currentTick != null && currentTick >= 0 ? tickToCol(currentTick, style) % totalCols : -1;

  // ── render ───────────────────────────────────────────────────────────────

  const gridCols = `${LABEL_W}px repeat(${totalCols}, 1fr)`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{molecule.label}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {molecule.id} · {molecule.category} · {bars} бар{bars > 1 ? 'а' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={isPlaying ? 'secondary' : 'default'}
            onClick={
              isPlaying
                ? onStop
                : () =>
                    onPlay(
                      molecule.atoms.map((a) => ({ ...a }) as PianoHit),
                      molecule.bars,
                    )
            }
          >
            {isPlaying ? <Square className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
            {isPlaying ? 'Стоп' : 'Играть'}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Удалить молекулу"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        <p className="text-xs text-muted-foreground px-6">
          Клик — добавить/удалить · тяни ↔ — переместить · Shift+↔ — длительность · ↕ — velocity
        </p>
        <div
          className="overflow-auto"
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ maxHeight: Math.min(rows.length * CELL_H + HEADER_H + 100, 480) }}
        >
          <div className="w-full" style={{ minWidth: LABEL_W + totalCols * 32 }}>
            {/* ── Header ──────────────────────────────────────────────── */}
            <div
              className="grid gap-px border-b border-border"
              style={{ height: HEADER_H, gridTemplateColumns: gridCols }}
            >
              <div className="sticky left-0 z-10 border-r border-border bg-muted/50 px-1 text-[10px] leading-[22px] text-muted-foreground">
                Роль
              </div>
              {Array.from({ length: totalCols }, (_, col) => (
                <div
                  key={col}
                  className={cn(
                    'text-center text-[9px] leading-[22px] text-muted-foreground',
                    col % perBar === 0 && col > 0 && 'border-l border-border/60 font-semibold',
                    col === playheadCol && 'bg-primary/20 text-primary font-bold',
                  )}
                >
                  {colLabel(col, style)}
                </div>
              ))}
            </div>

            {/* ── Role rows (fixed order) ─────────────────────────────── */}
            {rows.map((row) => {
              const covered = stretchedCoverage.get(row.sound);
              const rowBg = usedRoles.has(row.sound) ? 'bg-muted/10' : 'bg-muted/5';

              return (
                <div
                  key={row.sound}
                  className={cn('grid gap-px', rowBg)}
                  style={{ height: CELL_H, gridTemplateColumns: gridCols }}
                >
                  {/* Label */}
                  <div
                    className="sticky left-0 z-10 flex items-center truncate border-r border-b border-border bg-muted/30 px-1 text-[9px] leading-none text-muted-foreground"
                    title={roleDescription(row.sound)}
                  >
                    {row.label}
                  </div>

                  {/* Cells */}
                  {Array.from({ length: totalCols }, (_, col) => {
                    if (covered?.has(col)) return null;

                    const active = hasAtom(row.sound, col);
                    const atom = atomAt(row.sound, col);
                    const vel = atom?.velocity ?? 0;
                    const durCols = atom
                      ? visualDurCols(
                          row.sound,
                          col,
                          Math.max(1, Math.round(atom.durationTicks / tickStep)),
                        )
                      : 1;
                    const beatStart = col % perBar === 0;
                    const isSel = selected?.sound === row.sound && selected?.col === col;

                    return (
                      <div
                        key={col}
                        className={cn(
                          'border-b border-border/20',
                          beatStart && col > 0 && 'border-l border-border/40',
                          // mx-px + rounded даёт каждой ноте видимый зазор от соседней —
                          // без него ноты на смежных колонках визуально сливаются в один блок.
                          active && 'mx-px rounded-sm bg-primary/60',
                          'cursor-pointer hover:bg-primary/30',
                          isSel && 'ring-2 ring-ring ring-inset z-10',
                          col === playheadCol && !active && 'bg-primary/10',
                          col === playheadCol && active && 'ring-1 ring-primary/50',
                        )}
                        style={{
                          gridColumn: active && durCols > 1 ? `span ${durCols}` : undefined,
                          opacity: active ? 0.4 + vel * 0.6 : 1,
                        }}
                        onPointerDown={(e) => onPointerDown(row.sound, col, e)}
                        onPointerEnter={() => onCellEnter(row.sound, col)}
                        title={
                          active
                            ? `${row.label} · vel ${vel.toFixed(2)} · dur ${durCols} · тяни ↔/↕`
                            : `${row.label} · клик — добавить`
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Inspector ─────────────────────────────────────────────────── */}
        {selected && (
          <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-muted/30 p-3 mx-6 text-sm">
            <span className="font-medium">
              {roleLabel(selected.sound)} · {colLabel(selected.col % perBar, style)}
              {bars > 1 ? ` · такт ${Math.floor(selected.col / perBar) + 1}` : ''}
            </span>
            <label className="flex items-center gap-2">
              velocity
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                disabled={!selectedAtom}
                value={selectedAtom ? selectedAtom.velocity.toFixed(2) : ''}
                onChange={(e) =>
                  setAtom(selected.sound, selected.col, {
                    velocity: clamp01(parseFloat(e.target.value)),
                  })
                }
                className="h-8 w-20"
              />
            </label>
            <label className="flex items-center gap-2">
              длит.
              <Input
                type="number"
                min={1}
                max={totalCols}
                step={1}
                disabled={!selectedAtom}
                value={selectedDurCols}
                onChange={(e) => {
                  const cols = Math.max(1, Math.min(totalCols, parseInt(e.target.value) || 1));
                  setAtom(selected.sound, selected.col, {
                    durationTicks: Math.round(cols * tickStep),
                  });
                }}
                className="h-8 w-16"
              />
              <span className="text-xs text-muted-foreground">долей</span>
            </label>
            {selectedAtom && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-destructive"
                onClick={() => removeAtom(selected.sound, selected.col)}
              >
                Удалить ноту
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
