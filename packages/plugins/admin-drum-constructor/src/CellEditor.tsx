import { useRef, useState } from 'react';
import { Play, Square, X, Plus, AlertTriangle, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, cn } from '@jazz/ui';
import {
  DrumPatternEngine,
  validateCell,
  MAX_LANES,
  type DrumCell,
  type DrumClip,
  type DrumDynamicsType,
  type DrumHit,
  type DrumLane,
  type DrumMolecule,
} from '@jazz/music-core';
import { soundLabel } from './localModel';

const BAR_W = 30; // px на такт
const LANE_H = 32; // высота дорожки
const LABEL_W = 250; // ширина колонки-контролов лейна (чтобы не наслаивалась на сетку)

const DYNAMICS_TYPES: DrumDynamicsType[] = [
  'steady',
  'crescendo',
  'decrescendo',
  'arch',
  'valley',
  'wave',
  'pulse',
];

interface CellEditorProps {
  cell: DrumCell;
  onChange: (next: DrumCell) => void;
  onDelete: () => void;
  styleMolecules: DrumMolecule[];
  moleculeOverrides: Record<string, DrumMolecule>;
  isPlaying: boolean;
  /** Текущий такт цикла для подсветки (-1 = не играет). */
  currentBar: number;
  onPlay: (hits: DrumHit[], loopBars: number) => void;
  onStop: () => void;
  bpm: number;
  /** Swing-ratio стиля (0.5 = ровно, >0.5 = свинг). Применяется при сборке тактов. */
  swing: number;
}

interface DragState {
  li: number;
  ci: number;
  mode: 'move' | 'resize';
  startX: number;
  origStart: number;
  origLen: number;
  leftBound: number;
  rightBound: number;
  moved: boolean;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

export function CellEditor({
  cell,
  onChange,
  onDelete,
  styleMolecules,
  moleculeOverrides,
  isPlaying,
  currentBar,
  onPlay,
  onStop,
  swing,
}: CellEditorProps) {
  const barTicks = cell.timeSignature[0] * 480;
  const cellRef = useRef(cell);
  cellRef.current = cell;

  const [selected, setSelected] = useState<{ li: number; ci: number } | null>(null);
  const [mutes, setMutes] = useState<Set<number>>(new Set());
  const [solos, setSolos] = useState<Set<number>>(new Set());
  const dragRef = useRef<DragState | null>(null);

  const moleculeLabel = (id: string): string => {
    const m = moleculeOverrides[id];
    if (m) return m.label;
    if (id.startsWith('accent-')) return soundLabel(id.replace('accent-', ''));
    return id;
  };

  const available: DrumMolecule[] = Array.from(
    new Map(
      [
        ...styleMolecules,
        moleculeOverrides['accent-crash'],
        moleculeOverrides['accent-crash-sizzle'],
      ]
        .filter((m): m is DrumMolecule => !!m)
        .map((m) => [m.id, m]),
    ).values(),
  );

  const errors = validateCell(cell);

  // ── immutable updates (через cellRef, чтобы drag не терял актуальный cell) ──
  const setCell = (patch: Partial<DrumCell>) => onChange({ ...cellRef.current, ...patch });
  const setLanes = (lanes: DrumLane[]) => setCell({ lanes });
  const updateLane = (li: number, patch: Partial<DrumLane>) =>
    setLanes(cellRef.current.lanes.map((l, i) => (i === li ? { ...l, ...patch } : l)));
  const updateClips = (li: number, clips: DrumClip[]) => updateLane(li, { clips });
  const updateClip = (li: number, ci: number, patch: Partial<DrumClip>) =>
    updateClips(
      li,
      cellRef.current.lanes[li]!.clips.map((c, i) => (i === ci ? { ...c, ...patch } : c)),
    );

  const toggleSet = (setFn: typeof setMutes, idx: number) =>
    setFn((prev) => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx);
      else s.add(idx);
      return s;
    });

  const addLane = () => {
    if (cell.lanes.length >= MAX_LANES) return;
    const firstMol = available[0]?.id;
    const clips: DrumClip[] = firstMol ? [{ startBar: 0, lengthBars: 1, pool: [firstMol] }] : [];
    setLanes([...cell.lanes, { name: `lane-${cell.lanes.length + 1}`, probability: 1, clips }]);
  };
  const removeLane = (li: number) => {
    setLanes(cell.lanes.filter((_, i) => i !== li));
    setSelected(null);
  };

  const addClip = (li: number) => {
    const clips = cell.lanes[li]!.clips;
    const start = clips.reduce((m, c) => Math.max(m, c.startBar + c.lengthBars), 0);
    if (start >= cell.length) return;
    const firstMol = available[0]?.id;
    if (!firstMol) return;
    updateClips(li, [...clips, { startBar: start, lengthBars: 1, pool: [firstMol] }]);
  };
  const removeClip = (li: number, ci: number) => {
    updateClips(
      li,
      cell.lanes[li]!.clips.filter((_, i) => i !== ci),
    );
    setSelected(null);
  };

  const addToPool = (li: number, ci: number, moleculeId: string) => {
    if (!moleculeId) return;
    const clip = cell.lanes[li]!.clips[ci]!;
    if (clip.pool.includes(moleculeId)) return;
    updateClip(li, ci, { pool: [...clip.pool, moleculeId] });
  };
  const removeFromPool = (li: number, ci: number, moleculeId: string) => {
    const clip = cell.lanes[li]!.clips[ci]!;
    updateClip(li, ci, { pool: clip.pool.filter((p) => p !== moleculeId) });
  };

  // ── Drag / resize ──
  const onPointerMove = (e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const deltaBars = Math.round((e.clientX - d.startX) / BAR_W);
    if (deltaBars !== 0) d.moved = true;
    if (d.mode === 'move') {
      const newStart = Math.max(
        d.leftBound,
        Math.min(d.rightBound - d.origLen, d.origStart + deltaBars),
      );
      updateClip(d.li, d.ci, { startBar: newStart });
    } else {
      const newLen = Math.max(1, Math.min(d.rightBound - d.origStart, d.origLen + deltaBars));
      updateClip(d.li, d.ci, { lengthBars: newLen });
    }
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (d && !d.moved) setSelected({ li: d.li, ci: d.ci });
    dragRef.current = null;
  };
  const startDrag = (li: number, ci: number, mode: 'move' | 'resize', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clips = cell.lanes[li]!.clips;
    const clip = clips[ci]!;
    let leftBound = 0;
    let rightBound: number = cell.length;
    clips.forEach((c, i) => {
      if (i === ci) return;
      if (c.startBar + c.lengthBars <= clip.startBar)
        leftBound = Math.max(leftBound, c.startBar + c.lengthBars);
      if (c.startBar >= clip.startBar + clip.lengthBars)
        rightBound = Math.min(rightBound, c.startBar);
    });
    dragRef.current = {
      li,
      ci,
      mode,
      startX: e.clientX,
      origStart: clip.startBar,
      origLen: clip.lengthBars,
      leftBound,
      rightBound,
      moved: false,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  function play() {
    const soloed = solos.size > 0;
    const effLanes = cell.lanes.filter((_, i) => (soloed ? solos.has(i) : !mutes.has(i)));
    const effCell: DrumCell = { ...cell, lanes: effLanes };
    const engine = new DrumPatternEngine();
    const hits: DrumHit[] = [];
    for (let bar = 0; bar < effCell.length; bar++) {
      const barHits = engine.assembleBar(effCell, bar, swing);
      for (const h of barHits) hits.push({ ...h, atTick: h.atTick + bar * barTicks });
    }
    onPlay(hits, cell.length);
  }

  const gridW = cell.length * BAR_W;
  const selClip =
    selected && cell.lanes[selected.li]?.clips[selected.ci]
      ? cell.lanes[selected.li]!.clips[selected.ci]!
      : null;

  const numInput = (
    value: number,
    onNum: (n: number) => void,
    opts: { min?: number; max?: number; step?: number; w?: string } = {},
  ) => (
    <Input
      type="number"
      min={opts.min}
      max={opts.max}
      step={opts.step ?? 1}
      value={value}
      onChange={(e) => onNum(Number(e.target.value))}
      className={cn('h-8', opts.w ?? 'w-16')}
    />
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{cell.id}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {cell.length} тактов · TS {cell.timeSignature[0]}/{cell.timeSignature[1]} ·{' '}
            {cell.lanes.length}/{MAX_LANES} лейнов
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={isPlaying ? 'secondary' : 'default'}
            onClick={isPlaying ? onStop : play}
          >
            {isPlaying ? <Square className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
            {isPlaying ? 'Стоп' : 'Играть клетку'}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Удалить клетку"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Инспектор клетки */}
        <div className="flex flex-wrap items-end gap-4 rounded-md border border-border bg-muted/20 p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Velocity</span>
            {numInput(cell.velocity, (n) => setCell({ velocity: clamp01(n) }), {
              min: 0,
              max: 1,
              step: 0.05,
              w: 'w-20',
            })}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Dynamics</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={cell.dynamics.type}
              onChange={(e) =>
                setCell({
                  dynamics: { ...cell.dynamics, type: e.target.value as DrumDynamicsType },
                })
              }
            >
              {DYNAMICS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Amount</span>
            {numInput(
              cell.dynamics.amount,
              (n) => setCell({ dynamics: { ...cell.dynamics, amount: clamp01(n) } }),
              { min: 0, max: 1, step: 0.05, w: 'w-20' },
            )}
          </label>
        </div>

        {errors.length > 0 && (
          <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            <div className="flex items-center gap-1 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" /> Ошибки клетки:
            </div>
            {errors.map((e: { lane?: string; detail: string }, i: number) => (
              <div key={i}>
                {e.lane ? `[${e.lane}] ` : ''}
                {e.detail}
              </div>
            ))}
          </div>
        )}

        {/* Таймлайн */}
        <div className="overflow-x-auto">
          <div style={{ width: LABEL_W + gridW }}>
            {/* Заголовок тактов */}
            <div className="flex" style={{ marginLeft: LABEL_W }}>
              {Array.from({ length: cell.length }, (_, b) => (
                <div
                  key={b}
                  className={cn(
                    'shrink-0 border-l border-border/40 text-center text-[10px] text-muted-foreground',
                    b === currentBar && 'bg-primary/20 text-foreground',
                    b % 4 === 0 && 'border-border font-medium text-foreground',
                  )}
                  style={{ width: BAR_W }}
                >
                  {b + 1}
                </div>
              ))}
            </div>

            {/* Лейны */}
            {cell.lanes.map((lane, li) => (
              <div key={li} className="flex items-stretch border-t border-border/30">
                {/* Подпись лейна */}
                <div
                  className="flex shrink-0 items-center gap-1 py-1 pr-2"
                  style={{ width: LABEL_W }}
                >
                  <Input
                    value={lane.name}
                    onChange={(e) => updateLane(li, { name: e.target.value })}
                    className="h-6 w-20 px-1 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={lane.probability}
                    onChange={(e) =>
                      updateLane(li, { probability: clamp01(Number(e.target.value)) })
                    }
                    className="h-6 w-12 rounded border border-input bg-background px-1 text-xs"
                    title="probability"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSet(setMutes, li)}
                    className={cn(
                      'h-6 w-6 rounded border text-[10px] font-bold',
                      mutes.has(li)
                        ? 'border-destructive bg-destructive/20 text-destructive'
                        : 'border-border text-muted-foreground',
                    )}
                    title="Mute"
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSet(setSolos, li)}
                    className={cn(
                      'h-6 w-6 rounded border text-[10px] font-bold',
                      solos.has(li)
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-border text-muted-foreground',
                    )}
                    title="Solo"
                  >
                    S
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLane(li)}
                    className="h-6 w-6 rounded text-muted-foreground hover:text-destructive"
                    title="Удалить лейн"
                  >
                    <X className="mx-auto h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Дорожка с клипами */}
                <div
                  className="relative shrink-0 self-center bg-muted/10"
                  style={{ width: gridW, height: LANE_H }}
                  onDoubleClick={() => addClip(li)}
                  title="Двойной клик — добавить клип"
                >
                  {/* Сетка тактов */}
                  {Array.from({ length: cell.length }, (_, b) => (
                    <div
                      key={b}
                      className={cn(
                        'absolute top-0 h-full border-l',
                        b % 4 === 0 ? 'border-border/50' : 'border-border/20',
                        b === currentBar && 'bg-primary/10',
                      )}
                      style={{ left: b * BAR_W, width: BAR_W }}
                    />
                  ))}
                  {/* Клипы */}
                  {lane.clips.map((clip, ci) => {
                    const isSel = selected?.li === li && selected?.ci === ci;
                    return (
                      <div
                        key={ci}
                        onPointerDown={(e) => startDrag(li, ci, 'move', e)}
                        className={cn(
                          'absolute top-1 flex cursor-grab items-center overflow-hidden rounded border px-1 text-[10px] active:cursor-grabbing',
                          isSel
                            ? 'border-ring ring-1 ring-ring bg-primary/30'
                            : 'border-primary/60 bg-primary/20',
                        )}
                        style={{
                          left: clip.startBar * BAR_W + 1,
                          width: clip.lengthBars * BAR_W - 2,
                          height: LANE_H - 8,
                        }}
                        title={clip.pool.map((p) => moleculeLabel(p)).join(', ')}
                      >
                        <span className="truncate">
                          {clip.pool.map((p) => moleculeLabel(p)).join('/')}
                        </span>
                        {/* Хэндл ресайза */}
                        <span
                          onPointerDown={(e) => startDrag(li, ci, 'resize', e)}
                          className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-primary/50"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={addLane}
          disabled={cell.lanes.length >= MAX_LANES}
        >
          <Plus className="mr-1 h-4 w-4" /> лейн
        </Button>

        {/* Панель выбранного клипа */}
        {selected && selClip && (
          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{cell.lanes[selected.li]?.name}</span>
              <span className="text-muted-foreground">такт</span>
              {numInput(
                selClip.startBar,
                (n) => updateClip(selected.li, selected.ci, { startBar: n }),
                { min: 0, max: cell.length - 1, w: 'w-16' },
              )}
              <span className="text-muted-foreground">длина</span>
              {numInput(
                selClip.lengthBars,
                (n) => updateClip(selected.li, selected.ci, { lengthBars: n }),
                { min: 1, max: cell.length, w: 'w-16' },
              )}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-7"
                onClick={() => removeClip(selected.li, selected.ci)}
              >
                Удалить клип
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selClip.pool.map((mid) => (
                <Badge key={mid} variant="secondary" className="gap-1 font-normal">
                  <span className="text-xs">{moleculeLabel(mid)}</span>
                  <button
                    type="button"
                    onClick={() => removeFromPool(selected.li, selected.ci, mid)}
                    className="rounded-sm hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <select
                className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                value=""
                onChange={(e) => addToPool(selected.li, selected.ci, e.target.value)}
              >
                <option value="">+ молекула…</option>
                {available
                  .filter((m) => !selClip.pool.includes(m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
