/**
 * Step-sequencer редактор перкуссионной молекулы.
 *
 * Строки = звуки (timbales → cowbell → clave → конги → … → sleigh bells),
 * колонки = деления сетки (16-е для latin/bossa/funk).
 * UI: клик по пустой ячейке — добавить удар, двойной клик — удалить,
 * зажать и тянуть вверх/вниз — velocity.
 */
import { useRef, useState } from 'react';
import { Play, Square, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, cn } from '@jazz/ui';
import type { PercussionHit, PercussionMolecule, PercussionSound, PercussionPatternStyle } from '@jazz/music-core';
import {
  clamp01,
  colLabel,
  colToTick,
  colsPerBar,
  subdivisionsPerBeat,
  tickToCol,
  type MoleculeEditorProps,
} from '@jazz/plugin-admin-constructor-shared';
import { moleculeRows } from './percussionStrategy.js';

type Props = MoleculeEditorProps<PercussionPatternStyle, PercussionSound>;

interface SelectedCell {
  sound: PercussionSound;
  col: number;
}

interface VelDrag {
  sound: PercussionSound;
  col: number;
  startY: number;
  startVel: number;
}

function atomsAt(molecule: PercussionMolecule, sound: PercussionSound, col: number, style: string): number[] {
  const idx: number[] = [];
  molecule.atoms.forEach((a, i) => {
    if (a.sound === sound && tickToCol(a.atTick, style) === col) idx.push(i);
  });
  return idx;
}

export function PercussionMoleculeTable({
  molecule,
  onChange,
  onDelete,
  isPlaying,
  onPlay,
  onStop,
  makeAtom,
  soundLabel: soundLabelFn,
}: Props) {
  const style = molecule.style;
  const bars = molecule.bars;
  const perBar = colsPerBar(style);
  const totalCols = perBar * bars;
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const moleculeRef = useRef(molecule);
  moleculeRef.current = molecule;
  const dragRef = useRef<VelDrag | null>(null);

  const selectedAtomIdx =
    selected != null ? atomsAt(molecule, selected.sound, selected.col, style) : [];
  const selectedAtom = selectedAtomIdx.length > 0 ? molecule.atoms[selectedAtomIdx[0]!] : null;

  const soundsForRows = molecule.atoms.map((a) => a.sound);
  if (selected) soundsForRows.push(selected.sound);
  const rows = moleculeRows(soundsForRows);

  const addAtom = (sound: PercussionSound, col: number) =>
    onChange({
      ...moleculeRef.current,
      atoms: [...moleculeRef.current.atoms, makeAtom(sound, colToTick(col, style))],
    });

  const removeAtom = (sound: PercussionSound, col: number) => {
    const existing = atomsAt(moleculeRef.current, sound, col, style);
    if (existing.length === 0) return;
    onChange({
      ...moleculeRef.current,
      atoms: moleculeRef.current.atoms.filter((_, i) => !existing.includes(i)),
    });
  };

  const setVelocityAt = (sound: PercussionSound, col: number, v: number) => {
    const idx = atomsAt(moleculeRef.current, sound, col, style);
    if (idx.length === 0) return;
    const clamped = clamp01(v);
    onChange({
      ...moleculeRef.current,
      atoms: moleculeRef.current.atoms.map((a, i) =>
        idx.includes(i) ? { ...a, velocity: clamped } : a,
      ),
    });
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = d.startY - e.clientY;
    setVelocityAt(d.sound, d.col, d.startVel + dy * 0.01);
  };
  const onPointerUp = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    dragRef.current = null;
  };
  const onCellPointerDown = (
    sound: PercussionSound,
    col: number,
    active: boolean,
    e: React.PointerEvent,
  ) => {
    setSelected({ sound, col });
    if (active) {
      const idx = atomsAt(moleculeRef.current, sound, col, style);
      const startVel = idx.length > 0 ? moleculeRef.current.atoms[idx[0]!]!.velocity : 0.6;
      dragRef.current = { sound, col, startY: e.clientY, startVel };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    } else {
      addAtom(sound, col);
    }
  };

  function setVelocity(v: number) {
    if (selected) setVelocityAt(selected.sound, selected.col, v);
  }

  function play() {
    const hits: PercussionHit[] = molecule.atoms.map((a) => ({
      sound: a.sound,
      atTick: a.atTick,
      velocity: a.velocity,
      durationTicks: a.durationTicks,
    }));
    onPlay(hits, bars);
  }

  const sub = subdivisionsPerBeat(style);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{molecule.label}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {molecule.id} · {molecule.category} · {bars} такт{bars > 1 ? 'а' : ''} ·{' '}
            {sub === 3 ? 'триоли' : '16-е'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={isPlaying ? 'secondary' : 'default'}
            onClick={isPlaying ? onStop : play}
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
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Клик по пустой ячейке — добавить удар · двойной клик — удалить · зажать и тянуть
          вверх/вниз — velocity
        </p>
        <div className="overflow-x-auto">
          <table className="border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background px-2 py-1 text-left" />
                {Array.from({ length: totalCols }, (_, col) => (
                  <th
                    key={col}
                    className={cn(
                      'w-7 px-0 py-1 font-mono text-[10px] text-muted-foreground',
                      col % sub === 0 && 'text-foreground',
                      col % perBar === 0 && col > 0 && 'border-l border-border',
                    )}
                  >
                    {colLabel(col % perBar, style)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sound}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-background px-2 py-1 text-left font-medium">
                    {row.label}
                  </td>
                  {Array.from({ length: totalCols }, (_, col) => {
                    const idx = atomsAt(molecule, row.sound, col, style);
                    const active = idx.length > 0;
                    const vel = active ? molecule.atoms[idx[0]!]!.velocity : 0;
                    const isSel = selected?.sound === row.sound && selected?.col === col;
                    return (
                      <td
                        key={col}
                        className={cn(
                          'p-0.5',
                          col % sub === 0 && 'bg-muted/30',
                          col % perBar === 0 && col > 0 && 'border-l border-border',
                        )}
                      >
                        <button
                          type="button"
                          onPointerDown={(e) => onCellPointerDown(row.sound, col, active, e)}
                          onDoubleClick={() => active && removeAtom(row.sound, col)}
                          className={cn(
                            'h-6 w-6 touch-none select-none rounded-sm border transition-colors',
                            active
                              ? 'cursor-ns-resize border-primary bg-primary'
                              : 'border-border bg-transparent hover:bg-muted',
                            isSel && 'ring-2 ring-ring ring-offset-1 ring-offset-background',
                          )}
                          style={active ? { opacity: 0.35 + vel * 0.65 } : undefined}
                          title={
                            active
                              ? `velocity ${vel.toFixed(2)} · тяни вверх/вниз · 2×клик — удалить`
                              : 'клик — добавить удар'
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-muted/30 p-3 text-sm">
            <span className="font-medium">
              {soundLabelFn(selected.sound)} · {colLabel(selected.col % perBar, style)}
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
                onChange={(e) => setVelocity(parseFloat(e.target.value))}
                className="h-8 w-20"
              />
            </label>
            {selectedAtom && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-destructive"
                onClick={() => removeAtom(selected.sound, selected.col)}
              >
                Удалить удар
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
