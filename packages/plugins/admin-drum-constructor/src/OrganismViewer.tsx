import { useState } from 'react';
import { Play, Square, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, cn } from '@jazz/ui';
import {
  DrumPatternEngine,
  type DrumCell,
  type DrumHit,
  type DrumMolecule,
  type DrumOrganism,
  type OrganismSection,
} from '@jazz/music-core';
import {
  SECTION_TYPES,
  SECTION_TYPE_LABELS,
  SECTION_TYPE_COLORS,
  type SectionType,
} from '@jazz/shared';

const PREVIEW_SEED = 12345;
const BAR_TICKS = 4 * 480;

const TIME_SIGNATURES = ['3/4', '4/4', '5/4', '6/8', '7/8'] as const;

interface OrganismViewerProps {
  organism: DrumOrganism;
  onChange: (next: DrumOrganism) => void;
  onDelete: () => void;
  cells: Record<string, DrumCell>;
  moleculeOverrides: Record<string, DrumMolecule>;
  isPlaying: boolean;
  currentBar: number;
  onPlay: (hits: DrumHit[], loopBars: number) => void;
  onStop: () => void;
  bpm: number;
  swing: number;
}

function resolveOrganismLayoutV3(
  organism: DrumOrganism,
  cells: Record<string, DrumCell>,
  moleculeOverrides: Record<string, DrumMolecule>,
  swing: number,
): { hits: DrumHit[]; totalBars: number } {
  const engine = new DrumPatternEngine();
  const hits: DrumHit[] = [];
  let barOffset = 0;

  const sections: OrganismSection[] =
    organism.defaultForm && organism.defaultForm.length > 0
      ? organism.defaultForm
      : Object.entries(organism.sectionMap).map(([type, pool]) => ({
          label: SECTION_TYPE_LABELS[type as SectionType] ?? type,
          type: type as SectionType,
          cellPool: pool,
        }));

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]!;
    const repeats = section.repeats ?? 1;

    // Resolve section cell pool → first cell (default time signature '4/4').
    const pool = engine.resolveSectionCells(organism, section.type, '4/4');
    const cellId = pool[0] ?? section.cellPool[0];
    const cell = cellId ? cells[cellId] : undefined;
    if (!cell) continue;

    for (let r = 0; r < repeats; r++) {
      for (let bar = 0; bar < cell.length; bar++) {
        const barHits = engine.assembleBar(cell, bar, swing);
        for (const h of barHits) {
          hits.push({ ...h, atTick: h.atTick + (barOffset + bar) * BAR_TICKS });
        }
      }
      barOffset += cell.length;
    }
  }

  return { hits, totalBars: barOffset };
}

export function OrganismViewer({
  organism,
  onChange,
  onDelete,
  cells,
  moleculeOverrides,
  isPlaying,
  currentBar,
  onPlay,
  onStop,
  swing,
}: OrganismViewerProps) {
  const [showOverrides, setShowOverrides] = useState(false);
  const [showDefaultForm, setShowDefaultForm] = useState(false);

  const styleCells = Object.values(cells).filter((c) => c.style === organism.style);
  const activeSectionTypes = Object.keys(organism.sectionMap) as SectionType[];
  const unusedSectionTypes = SECTION_TYPES.filter((t) => !activeSectionTypes.includes(t));

  function play() {
    const { hits, totalBars } = resolveOrganismLayoutV3(organism, cells, moleculeOverrides, swing);
    onPlay(hits, totalBars);
  }

  // ── sectionMap mutators ──────────────────────────────────────────────────

  function addSectionType(type: SectionType) {
    onChange({ ...organism, sectionMap: { ...organism.sectionMap, [type]: [] } });
  }

  function removeSectionType(type: SectionType) {
    const next = { ...organism.sectionMap };
    delete next[type];
    onChange({ ...organism, sectionMap: next });
  }

  function addCellToSection(type: SectionType, cellId: string) {
    const pool = [...(organism.sectionMap[type] ?? []), cellId];
    onChange({ ...organism, sectionMap: { ...organism.sectionMap, [type]: pool } });
  }

  function removeCellFromSection(type: SectionType, cellId: string) {
    const pool = (organism.sectionMap[type] ?? []).filter((id) => id !== cellId);
    if (pool.length === 0) {
      removeSectionType(type);
    } else {
      onChange({ ...organism, sectionMap: { ...organism.sectionMap, [type]: pool } });
    }
  }

  // ── timeSignatureOverrides mutators ──────────────────────────────────────

  function addTimeSignature(ts: string) {
    const overrides = { ...(organism.timeSignatureOverrides ?? {}), [ts]: {} };
    onChange({ ...organism, timeSignatureOverrides: overrides });
  }

  function removeTimeSignature(ts: string) {
    const overrides = { ...organism.timeSignatureOverrides };
    delete overrides[ts];
    onChange({
      ...organism,
      timeSignatureOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    });
  }

  function addCellToOverride(ts: string, type: SectionType, cellId: string) {
    const overrides = { ...(organism.timeSignatureOverrides ?? {}) };
    const tsMap = { ...(overrides[ts] ?? {}) };
    tsMap[type] = [...(tsMap[type] ?? []), cellId];
    overrides[ts] = tsMap;
    onChange({ ...organism, timeSignatureOverrides: overrides });
  }

  function removeCellFromOverride(ts: string, type: SectionType, cellId: string) {
    const overrides = { ...(organism.timeSignatureOverrides ?? {}) };
    const tsMap = { ...(overrides[ts] ?? {}) };
    tsMap[type] = (tsMap[type] ?? []).filter((id) => id !== cellId);
    if (Object.keys(tsMap).length === 0) {
      removeTimeSignature(ts);
    } else {
      overrides[ts] = tsMap;
      onChange({ ...organism, timeSignatureOverrides: overrides });
    }
  }

  function removeOverrideSection(ts: string, type: SectionType) {
    const overrides = { ...(organism.timeSignatureOverrides ?? {}) };
    const tsMap = { ...(overrides[ts] ?? {}) };
    delete tsMap[type];
    if (Object.keys(tsMap).length === 0) {
      removeTimeSignature(ts);
    } else {
      overrides[ts] = tsMap;
      onChange({ ...organism, timeSignatureOverrides: overrides });
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  function availableCellsForSection(type: SectionType): DrumCell[] {
    const used = organism.sectionMap[type] ?? [];
    return styleCells.filter((c) => !used.includes(c.id));
  }

  function availableCellsForOverride(ts: string, type: SectionType): DrumCell[] {
    const used = organism.timeSignatureOverrides?.[ts]?.[type] ?? [];
    return styleCells.filter((c) => !used.includes(c.id));
  }

  // ── Preview timeline (from defaultForm) ──────────────────────────────────

  const previewSections: OrganismSection[] =
    organism.defaultForm && organism.defaultForm.length > 0
      ? organism.defaultForm
      : Object.entries(organism.sectionMap).map(([type, pool]) => ({
          label: SECTION_TYPE_LABELS[type as SectionType] ?? type,
          type: type as SectionType,
          cellPool: pool,
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
                const { totalBars } = resolveOrganismLayoutV3(
                  organism,
                  cells,
                  moleculeOverrides,
                  swing,
                );
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

        {/* ── Section Map editor ────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Карта секций (sectionMap):</p>

          {activeSectionTypes.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Нет секций. Добавьте тип секции.</p>
          )}

          <div className="space-y-2">
            {activeSectionTypes.map((type) => {
              const pool = organism.sectionMap[type] ?? [];
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
              <span className="text-[10px]">
                ({Object.keys(organism.timeSignatureOverrides).length})
              </span>
            )}
          </button>

          {showOverrides && (
            <div className="space-y-3 pl-4 border-l-2 border-border">
              {organism.timeSignatureOverrides &&
                Object.entries(organism.timeSignatureOverrides).map(([ts, tsMap]) => (
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
                          SECTION_TYPE_COLORS[secType as SectionType] ??
                            'border-border bg-muted/20',
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
                          {pool.map((cellId) => (
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
                const existing = Object.keys(organism.timeSignatureOverrides ?? {});
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

        {/* ── Default Form preview ───────────────────────────────────────── */}
        <div className="space-y-2">
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setShowDefaultForm(!showDefaultForm)}
          >
            {showDefaultForm ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Форма по умолчанию (defaultForm)
            <span className="text-[10px]">({previewSections.length} секций)</span>
          </button>

          {showDefaultForm && (
            <div className="space-y-2 pl-4 border-l-2 border-border">
              {/* Timeline */}
              <div className="overflow-x-auto">
                <div className="flex gap-0 min-w-max rounded-lg border border-border overflow-hidden">
                  {previewSections.map((section, si) => {
                    const repeats = section.repeats ?? 1;
                    const cellId = section.cellPool[0] ?? '?';
                    const resolvedCell = cells[cellId];
                    const barLen = resolvedCell ? resolvedCell.length * repeats : repeats * 8;

                    let startBar = 0;
                    for (let j = 0; j < si; j++) {
                      const prev = previewSections[j]!;
                      const prevRepeats = prev.repeats ?? 1;
                      const prevCellId = prev.cellPool[0] ?? '?';
                      const prevCell = cells[prevCellId];
                      startBar += prevCell ? prevCell.length * prevRepeats : prevRepeats * 8;
                    }

                    const endBar = startBar + barLen;
                    const isActive = isPlaying && currentBar >= startBar && currentBar < endBar;

                    return (
                      <div
                        key={si}
                        className={cn(
                          'relative flex flex-col items-center justify-center gap-1 border-r border-border px-2 py-2 text-center transition-colors',
                          SECTION_TYPE_COLORS[section.type] ?? 'bg-muted/30',
                          isActive && 'ring-2 ring-primary ring-inset',
                        )}
                        style={{
                          minWidth: Math.max(barLen * 16, 80),
                          flex: `0 0 ${barLen * 16}px`,
                        }}
                        title={`${section.label} · ${section.type} · ${cellId} ×${repeats}`}
                      >
                        <span className="text-[10px] font-semibold">{section.label}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {SECTION_TYPE_LABELS[section.type] ?? section.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {cellId}
                          {section.cellPool.length > 1 ? ` +${section.cellPool.length - 1}` : ''}
                          {' · '}×{repeats}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section list */}
              <div className="grid gap-1">
                {previewSections.map((section, si) => (
                  <div
                    key={si}
                    className={cn(
                      'flex items-center gap-3 rounded-md border px-3 py-1.5 text-xs',
                      SECTION_TYPE_COLORS[section.type] ?? 'border-border bg-muted/20',
                    )}
                  >
                    <span className="w-6 text-center font-mono text-[10px] text-muted-foreground">
                      {si + 1}
                    </span>
                    <span className="font-medium w-16">{section.label}</span>
                    <Badge variant="outline" className="text-[9px]">
                      {SECTION_TYPE_LABELS[section.type] ?? section.type}
                    </Badge>
                    <span className="text-muted-foreground flex-1 text-[10px]">
                      [{section.cellPool.join(', ')}]
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      ×{section.repeats ?? 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
