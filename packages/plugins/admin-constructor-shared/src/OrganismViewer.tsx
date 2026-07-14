/**
 * Generic section-driven organism viewer/editor.
 *
 * Объединяет бывшие OrganismViewer (drum) и PianoOrganismViewer (piano),
 * которые были ~93% идентичны. Единственное различие — assembly-логика —
 * решается через `assembleOrganism` callback в пропсах.
 */
import { useState } from 'react';
import { Play, Square, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, cn } from '@jazz/ui';
import type { OrganismSection } from '@jazz/music-core';
import {
  SECTION_TYPES,
  SECTION_TYPE_LABELS,
  SECTION_TYPE_COLORS,
  type SectionType,
} from '@jazz/shared';
import type { OrganismViewerProps } from './types.js';

/** Локальные алиасы для работы с generic-типами PatternOrganism. */
type CellPool = string[];
type SectionMap = Partial<Record<SectionType, CellPool>>;
type TsOverrideMap = Partial<Record<SectionType, CellPool>>;
type TsOverrides = Record<string, TsOverrideMap>;

export function OrganismViewer<TStyle extends string, TSound extends string = string>({
  organism,
  onChange,
  onDelete,
  cells,
  moleculeOverrides: _moleculeOverrides,
  isPlaying,
  currentBar,
  onPlay,
  onStop,
  swing,
  assembleOrganism,
}: OrganismViewerProps<TStyle, TSound>) {
  const [showOverrides, setShowOverrides] = useState(false);

  const sectionMap = organism.sectionMap as SectionMap;
  const tsOverrides = (organism.timeSignatureOverrides ?? {}) as TsOverrides;

  const styleCells = Object.values(cells).filter((c) => c.style === organism.style);
  const activeSectionTypes = Object.keys(sectionMap) as SectionType[];
  const unusedSectionTypes = SECTION_TYPES.filter((t) => !activeSectionTypes.includes(t));

  function play() {
    const { hits, totalBars } = assembleOrganism(organism, cells, _moleculeOverrides, swing);
    onPlay(hits, totalBars);
  }

  // ── sectionMap mutators ──────────────────────────────────────────────────

  function addSectionType(type: SectionType) {
    onChange({ ...organism, sectionMap: { ...sectionMap, [type]: [] } });
  }

  function removeSectionType(type: SectionType) {
    const next = { ...sectionMap };
    delete next[type];
    onChange({ ...organism, sectionMap: next });
  }

  function addCellToSection(type: SectionType, cellId: string) {
    const pool: CellPool = [...(sectionMap[type] ?? []), cellId];
    onChange({ ...organism, sectionMap: { ...sectionMap, [type]: pool } });
  }

  function removeCellFromSection(type: SectionType, cellId: string) {
    const pool: CellPool = (sectionMap[type] ?? []).filter((id: string) => id !== cellId);
    if (pool.length === 0) {
      removeSectionType(type);
    } else {
      onChange({ ...organism, sectionMap: { ...sectionMap, [type]: pool } });
    }
  }

  // ── timeSignatureOverrides mutators ──────────────────────────────────────

  function addTimeSignature(ts: string) {
    const overrides: TsOverrides = { ...tsOverrides, [ts]: {} };
    onChange({ ...organism, timeSignatureOverrides: overrides });
  }

  function removeTimeSignature(ts: string) {
    const overrides: TsOverrides = { ...tsOverrides };
    delete overrides[ts];
    onChange({
      ...organism,
      timeSignatureOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    });
  }

  function addCellToOverride(ts: string, type: SectionType, cellId: string) {
    const overrides: TsOverrides = { ...tsOverrides };
    const tsMap: TsOverrideMap = { ...(overrides[ts] ?? {}) };
    tsMap[type] = [...(tsMap[type] ?? []), cellId];
    overrides[ts] = tsMap;
    onChange({ ...organism, timeSignatureOverrides: overrides });
  }

  function removeCellFromOverride(ts: string, type: SectionType, cellId: string) {
    const overrides: TsOverrides = { ...tsOverrides };
    const tsMap: TsOverrideMap = { ...(overrides[ts] ?? {}) };
    tsMap[type] = (tsMap[type] ?? []).filter((id: string) => id !== cellId);
    if (Object.keys(tsMap).length === 0) {
      removeTimeSignature(ts);
    } else {
      overrides[ts] = tsMap;
      onChange({ ...organism, timeSignatureOverrides: overrides });
    }
  }

  function removeOverrideSection(ts: string, type: SectionType) {
    const overrides: TsOverrides = { ...tsOverrides };
    const tsMap: TsOverrideMap = { ...(overrides[ts] ?? {}) };
    delete tsMap[type];
    if (Object.keys(tsMap).length === 0) {
      removeTimeSignature(ts);
    } else {
      overrides[ts] = tsMap;
      onChange({ ...organism, timeSignatureOverrides: overrides });
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  function availableCellsForSection(type: SectionType) {
    const used = sectionMap[type] ?? [];
    return styleCells.filter((c) => !used.includes(c.id));
  }

  function availableCellsForOverride(ts: string, type: SectionType) {
    const used = tsOverrides[ts]?.[type] ?? [];
    return styleCells.filter((c) => !used.includes(c.id));
  }

  // ── Preview timeline (from defaultForm) ──────────────────────────────────

  const previewSections: OrganismSection[] =
    organism.defaultForm && organism.defaultForm.length > 0
      ? organism.defaultForm
      : Object.entries(sectionMap).map(([type, pool]) => ({
          label: SECTION_TYPE_LABELS[type as SectionType] ?? type,
          type: type as SectionType,
          cellPool: pool ?? [],
        }));

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{organism.label}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {organism.id} · {organism.style} · {activeSectionTypes.length} типов секций
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
            title="Удалить организм"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Preview progress bar ──────────────────────────────────────── */}
        {isPlaying && currentBar >= 0 && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-muted">
              {(() => {
                const { totalBars } = assembleOrganism(organism, cells, _moleculeOverrides, swing);
                const pct = totalBars > 0 ? ((currentBar % totalBars) / totalBars) * 100 : 0;
                return (
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-100"
                    style={{ width: `${pct}%` }}
                  />
                );
              })()}
            </div>
            <p className="text-xs text-muted-foreground text-center">Такт {currentBar + 1}</p>
          </div>
        )}

        {/* ── Form timeline (defaultForm) — primary visualization, always shown ── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Форма (defaultForm){' '}
            <span className="text-[10px]">({previewSections.length} секций)</span>
          </p>
          <div className="overflow-x-auto">
            <div className="flex gap-0 min-w-max rounded-lg border border-border overflow-hidden">
              {/* Повтор разбивается на отдельные блоки, только если пул секции
                  реально циклит РАЗНЫЕ клетки (та же формула, что и в
                  assembleOrganism/движке: cellIndex = repeatIndex % pool.length).
                  Если все повторы резолвятся в одну и ту же клетку — это не
                  несёт новой информации, показываем один блок с «×N». */}
              {(() => {
                interface TimelineBox {
                  key: string;
                  section: OrganismSection;
                  cellId: string;
                  repeatIndex: number;
                  repeats: number;
                  merged: boolean;
                  barLen: number;
                  startBar: number;
                }

                const boxes: TimelineBox[] = [];
                let cursor = 0;
                previewSections.forEach((section, si) => {
                  const repeats = section.repeats ?? 1;
                  const poolIds = section.cellPool.length > 0 ? section.cellPool : ['?'];
                  const repeatCellIds = Array.from(
                    { length: repeats },
                    (_, r) => poolIds[r % poolIds.length]!,
                  );
                  const allSame = repeatCellIds.every((id) => id === repeatCellIds[0]);

                  if (allSame) {
                    const cellId = repeatCellIds[0]!;
                    const resolvedCell = cells[cellId];
                    const barLen = (resolvedCell ? resolvedCell.length : 8) * repeats;
                    boxes.push({
                      key: `${si}`,
                      section,
                      cellId,
                      repeatIndex: 0,
                      repeats,
                      merged: true,
                      barLen,
                      startBar: cursor,
                    });
                    cursor += barLen;
                  } else {
                    repeatCellIds.forEach((cellId, r) => {
                      const resolvedCell = cells[cellId];
                      const barLen = resolvedCell ? resolvedCell.length : 8;
                      boxes.push({
                        key: `${si}-${r}`,
                        section,
                        cellId,
                        repeatIndex: r,
                        repeats,
                        merged: false,
                        barLen,
                        startBar: cursor,
                      });
                      cursor += barLen;
                    });
                  }
                });

                return boxes.map((box) => {
                  const endBar = box.startBar + box.barLen;
                  const isActive = isPlaying && currentBar >= box.startBar && currentBar < endBar;

                  return (
                    <div
                      key={box.key}
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-1 border-r border-border px-2 py-2 text-center transition-colors',
                        SECTION_TYPE_COLORS[box.section.type] ?? 'bg-muted/30',
                        isActive && 'ring-2 ring-primary ring-inset',
                      )}
                      style={{
                        minWidth: Math.max(box.barLen * 16, 80),
                        flex: `0 0 ${box.barLen * 16}px`,
                      }}
                      title={`${box.section.label} · ${box.section.type} · ${box.cellId}${
                        box.repeats > 1
                          ? box.merged
                            ? ` ×${box.repeats}`
                            : ` · повтор ${box.repeatIndex + 1}/${box.repeats}`
                          : ''
                      }`}
                    >
                      <span className="text-[10px] font-semibold">
                        {box.section.label}
                        {box.repeats > 1 && !box.merged
                          ? ` (${box.repeatIndex + 1}/${box.repeats})`
                          : ''}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {SECTION_TYPE_LABELS[box.section.type] ?? box.section.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {box.cellId}
                        {box.repeats > 1 && box.merged ? ` · ×${box.repeats}` : ''}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* ── Section Map editor ────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Карта секций (sectionMap):</p>

          {activeSectionTypes.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Нет секций. Добавьте тип секции.</p>
          )}

          <div className="space-y-2">
            {activeSectionTypes.map((type) => {
              const pool = sectionMap[type] ?? [];
              const available = availableCellsForSection(type);

              return (
                <div
                  key={type}
                  className={cn(
                    'rounded-md border px-3 py-2',
                    SECTION_TYPE_COLORS[type] ?? 'border-border bg-muted/20',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {SECTION_TYPE_LABELS[type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{type}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSectionType(type)}
                      title="Удалить тип секции"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Cell pool tags */}
                  <div className="flex flex-wrap gap-1 mb-1">
                    {pool.map((cellId) => (
                      <Badge
                        key={cellId}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 gap-1 cursor-pointer hover:bg-destructive/20"
                        onClick={() => removeCellFromSection(type, cellId)}
                        title="Клик — удалить"
                      >
                        {cellId}
                        <X className="h-2.5 w-2.5" />
                      </Badge>
                    ))}
                    {pool.length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">пусто</span>
                    )}
                  </div>

                  {/* Add cell dropdown */}
                  {available.length > 0 && (
                    <select
                      className="h-7 rounded border border-border bg-background px-2 text-[11px] text-muted-foreground"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) addCellToSection(type, e.target.value);
                      }}
                    >
                      <option value="">+ добавить клетку…</option>
                      {available.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add section type */}
          {unusedSectionTypes.length > 0 && (
            <select
              className="h-7 rounded border border-border bg-background px-2 text-[11px] text-muted-foreground"
              value=""
              onChange={(e) => {
                if (e.target.value) addSectionType(e.target.value as SectionType);
              }}
            >
              <option value="">+ добавить тип секции…</option>
              {unusedSectionTypes.map((t) => (
                <option key={t} value={t}>
                  {SECTION_TYPE_LABELS[t]} ({t})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Time Signature Overrides ───────────────────────────────────── */}
        <div className="space-y-2">
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setShowOverrides(!showOverrides)}
          >
            {showOverrides ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Переопределения размеров (timeSignatureOverrides)
            {organism.timeSignatureOverrides && (
              <span className="text-[10px]">({Object.keys(tsOverrides).length})</span>
            )}
          </button>

          {showOverrides && (
            <div className="space-y-3 pl-4 border-l-2 border-border">
              {Object.entries(tsOverrides).map(([ts, tsMap]) => (
                <div key={ts} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {ts}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTimeSignature(ts)}
                      title="Удалить размер"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {Object.entries(tsMap).map(([secType, pool]) => (
                    <div
                      key={secType}
                      className={cn(
                        'rounded-md border px-3 py-2 ml-4',
                        SECTION_TYPE_COLORS[secType as SectionType] ?? 'border-border bg-muted/20',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium">
                          {SECTION_TYPE_LABELS[secType as SectionType] ?? secType}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="ml-auto h-5 w-5 text-muted-foreground hover:text-destructive"
                          onClick={() => removeOverrideSection(ts, secType as SectionType)}
                          title="Удалить"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(pool ?? []).map((cellId) => (
                          <Badge
                            key={cellId}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 gap-1 cursor-pointer hover:bg-destructive/20"
                            onClick={() =>
                              removeCellFromOverride(ts, secType as SectionType, cellId)
                            }
                            title="Клик — удалить"
                          >
                            {cellId}
                            <X className="h-2.5 w-2.5" />
                          </Badge>
                        ))}
                      </div>

                      {availableCellsForOverride(ts, secType as SectionType).length > 0 && (
                        <select
                          className="mt-1 h-6 rounded border border-border bg-background px-1 text-[10px] text-muted-foreground"
                          value=""
                          onChange={(e) => {
                            if (e.target.value)
                              addCellToOverride(ts, secType as SectionType, e.target.value);
                          }}
                        >
                          <option value="">+ клетка…</option>
                          {availableCellsForOverride(ts, secType as SectionType).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}

                  {/* Add section type to this TS override */}
                  {(() => {
                    const existing = Object.keys(tsMap);
                    const unused = SECTION_TYPES.filter((t) => !existing.includes(t));
                    if (unused.length === 0) return null;
                    return (
                      <select
                        className="ml-4 h-6 rounded border border-border bg-background px-1 text-[10px] text-muted-foreground"
                        value=""
                        onChange={(e) => {
                          if (e.target.value)
                            addCellToOverride(ts, e.target.value as SectionType, '');
                        }}
                      >
                        <option value="">+ тип секции…</option>
                        {unused.map((t) => (
                          <option key={t} value={t}>
                            {SECTION_TYPE_LABELS[t]} ({t})
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              ))}

              {/* Add time signature */}
              {(() => {
                const TIME_SIGNATURES = ['3/4', '4/4', '5/4', '6/8', '7/8'] as const;
                const existing = Object.keys(tsOverrides);
                const unused = TIME_SIGNATURES.filter((t) => !existing.includes(t));
                if (unused.length === 0) return null;
                return (
                  <select
                    className="h-6 rounded border border-border bg-background px-1 text-[10px] text-muted-foreground"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) addTimeSignature(e.target.value);
                    }}
                  >
                    <option value="">+ добавить размер…</option>
                    {unused.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** BAR_TICKS (4 * PPQ) — экспортируется для стратегий сборки организмов. */
export const BAR_TICKS = 4 * 480;
