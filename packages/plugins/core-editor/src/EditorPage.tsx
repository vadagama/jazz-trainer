import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, Pencil, Save } from 'lucide-react';
import type { TimeSignatureString, Key } from '@jazz/shared';
import { transposeSections } from '@jazz/music-core';
import { useGrid, useUpdateGrid } from './queries/useGrid';
import {
  useEditorStore,
  usePlaybackStore,
  useEffectiveSettings,
  usePluginTransport,
} from '@jazz/plugin-sdk';
import { HarmonyGrid, PlayerToolbar, Button, cn } from '@jazz/ui';
import { ChordPalette } from './components/ChordPalette';

// ── Inline composition title editor ──────────────────────────────────────────

function CompositionTitle({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onSave(trimmed);
    else setDraft(name);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(name);
            setEditing(false);
          }
        }}
        className="w-full rounded border border-primary bg-background px-2 py-0.5 text-xl font-bold outline-none"
      />
    );
  }

  return (
    <div
      className="group flex cursor-default items-center gap-2"
      onDoubleClick={() => {
        setDraft(name);
        setEditing(true);
      }}
      title="Двойной клик для переименования"
    >
      <h1 className="text-xl font-bold text-foreground">{name}</h1>
      <Pencil className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

// ── EditorPage ────────────────────────────────────────────────────────────────

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const gridId = id ?? '';

  const { data: grid, isLoading, isError } = useGrid(gridId);
  const updateMutation = useUpdateGrid(gridId);
  const {
    localContent,
    selectedBarId,
    isDirty,
    setContent,
    markClean,
    selectBar,
    addBarToSection,
    removeBar,
    addChordToBar,
    clearBarChords,
    setBarRepeatEnd,
    addSection,
    deleteSection,
    renameSection,
    setSectionTimeSignature,
    insertBarAfter,
  } = useEditorStore();

  const settings = useEffectiveSettings();
  const { status, currentBar, currentBeat, countInActive, countInBeat } = usePlaybackStore();
  const displayBeat = countInActive ? countInBeat : currentBeat;
  const countingInBarIndex = countInActive ? currentBar : undefined;

  const hoveredBarRef = useRef<string | null>(null);
  const handleHoverBar = useCallback((barId: string | null) => {
    hoveredBarRef.current = barId;
  }, []);

  // Compute content/sections early — needed by keyboard handler useEffect below
  const content = localContent ?? grid?.content ?? { version: 1 as const, bars: [], sections: [] };
  const sections = content.sections ?? [];

  const [playerKey, setPlayerKey] = useState<Key>(grid?.key ?? 'C');
  const [localBpm, setLocalBpm] = useState<number | null>(null);
  const [localVolume, setLocalVolume] = useState<number | null>(null);

  useEffect(() => {
    if (grid?.content) {
      setContent(grid.content, grid.timeSignature);
    }
  }, [grid?.content, setContent]);

  useEffect(() => {
    function colsForSection(ts: string): number {
      if (ts === '6/8') return 3;
      return parseInt(ts.split('/')[0] ?? '4', 10);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
      if (e.key === 'Insert') {
        const targetId = hoveredBarRef.current ?? selectedBarId;
        if (targetId) {
          insertBarAfter(targetId);
          return;
        }
      }
      if (!selectedBarId) return;
      if (e.key === 'Escape') {
        clearBarChords(selectedBarId);
        return;
      }
      if (e.key === 'Delete') {
        removeBar(selectedBarId);
        return;
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();

      const allMeta = sections.flatMap((s) => {
        const cols = colsForSection(s.timeSignature);
        return s.bars.map((b, i) => ({ barId: b.id, sectionId: s.id, indexInSection: i, cols }));
      });
      const flatIdx = allMeta.findIndex((m) => m.barId === selectedBarId);
      if (flatIdx === -1) return;
      const cur = allMeta[flatIdx];
      if (!cur) return;

      let targetId: string | null = null;

      if (e.key === 'ArrowLeft') {
        targetId = allMeta[flatIdx - 1]?.barId ?? null;
      } else if (e.key === 'ArrowRight') {
        targetId = allMeta[flatIdx + 1]?.barId ?? null;
      } else {
        const col = cur.indexInSection % cur.cols;
        const row = Math.floor(cur.indexInSection / cur.cols);
        const sectionIdx = sections.findIndex((s) => s.id === cur.sectionId);

        if (e.key === 'ArrowUp') {
          if (row > 0) {
            const targetInSection = (row - 1) * cur.cols + col;
            targetId =
              allMeta.find(
                (m) => m.sectionId === cur.sectionId && m.indexInSection === targetInSection,
              )?.barId ?? null;
          } else if (sectionIdx > 0) {
            const prev = sections[sectionIdx - 1]!;
            const prevCols = colsForSection(prev.timeSignature);
            const prevLastRow = Math.ceil(prev.bars.length / prevCols) - 1;
            const clampedCol = Math.min(col, prevCols - 1);
            const idx = Math.min(prevLastRow * prevCols + clampedCol, prev.bars.length - 1);
            targetId = prev.bars[idx]?.id ?? null;
          }
        } else {
          // ArrowDown
          const nextRow = row + 1;
          const targetInSection = nextRow * cur.cols + col;
          const sectionBarCount = sections.find((s) => s.id === cur.sectionId)?.bars.length ?? 0;
          if (targetInSection < sectionBarCount) {
            targetId =
              allMeta.find(
                (m) => m.sectionId === cur.sectionId && m.indexInSection === targetInSection,
              )?.barId ?? null;
          } else if (nextRow * cur.cols >= sectionBarCount && sectionIdx < sections.length - 1) {
            const next = sections[sectionIdx + 1]!;
            const nextCols = colsForSection(next.timeSignature);
            const clampedCol = Math.min(col, nextCols - 1);
            targetId = next.bars[clampedCol]?.id ?? null;
          }
        }
      }

      if (targetId) selectBar(targetId);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedBarId, clearBarChords, removeBar, insertBarAfter, sections, selectBar]);

  useEffect(() => {
    if (grid?.key) setPlayerKey(grid.key);
  }, [grid?.key]);

  // Compute transport params with safe fallbacks (must be before early returns)
  const originalKey: Key = grid?.key ?? 'C';
  const displaySections = useMemo(
    () => transposeSections(sections, originalKey, playerKey),
    [sections, originalKey, playerKey],
  );
  const defaultTimeSignature: TimeSignatureString =
    sections[0]?.timeSignature ?? grid?.timeSignature ?? '4/4';
  const effectiveBpm = localBpm ?? settings.bpm;
  const effectiveVolume = localVolume ?? settings.volume;
  const effectiveTimeSig = defaultTimeSignature;
  const totalBars = sections.reduce((sum, s) => sum + s.bars.length, 0);

  const transport = usePluginTransport({
    settings: { ...settings, bpm: effectiveBpm, volume: effectiveVolume },
    timeSignature: effectiveTimeSig,
    totalBars,
    sections: displaySections,
  });

  const playingBarIndex = !countInActive && status !== 'idle' ? currentBar : undefined;
  const allBars = useMemo(() => sections.flatMap((s) => s.bars), [sections]);
  const selectedBarFlatIndex =
    selectedBarId != null ? allBars.findIndex((b) => b.id === selectedBarId) : undefined;

  const handlePrevBar = useCallback(() => {
    const effectiveIndex =
      selectedBarFlatIndex !== undefined && selectedBarFlatIndex >= 0
        ? selectedBarFlatIndex
        : currentBar;
    const newIndex = Math.max(0, effectiveIndex - 1);
    const bar = allBars[newIndex];
    if (bar) selectBar(bar.id);
    transport.prevBar();
  }, [allBars, selectedBarFlatIndex, currentBar, selectBar, transport]);

  const handleNextBar = useCallback(() => {
    const effectiveIndex =
      selectedBarFlatIndex !== undefined && selectedBarFlatIndex >= 0
        ? selectedBarFlatIndex
        : currentBar;
    const newIndex = Math.min(allBars.length - 1, effectiveIndex + 1);
    const bar = allBars[newIndex];
    if (bar) selectBar(bar.id);
    transport.nextBar();
  }, [allBars, selectedBarFlatIndex, currentBar, selectBar, transport]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Загрузка сетки…
      </div>
    );
  }

  if (isError || !grid) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-center">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-sm text-muted-foreground">Не удалось загрузить сетку</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/my">← Мои сетки</Link>
        </Button>
      </div>
    );
  }

  async function handleSave() {
    await updateMutation.mutateAsync({
      name: grid!.name,
      timeSignature: grid!.timeSignature,
      key: grid!.key,
      content,
    });
    markClean();
  }

  async function handleSaveTitle(name: string) {
    await updateMutation.mutateAsync({ name });
  }

  function handleAddChordFromPalette(symbol: string) {
    if (!selectedBarId) return;
    addChordToBar(selectedBarId, symbol);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chord Palette — slides in when a bar is selected */}
        <div
          className={cn(
            'min-w-0 overflow-hidden transition-all duration-300 ease-in-out',
            selectedBarId && status === 'idle' && !countInActive ? 'w-60' : 'w-0',
          )}
        >
          <ChordPalette
            selectedBarId={selectedBarId}
            onAddChord={handleAddChordFromPalette}
            onDeleteBar={() => selectedBarId && removeBar(selectedBarId)}
            onClearBar={() => selectedBarId && clearBarChords(selectedBarId)}
          />
        </div>

        {/* Center: sections + title */}
        <main
          className="flex-1 overflow-y-auto"
          data-testid="editor-page"
          onClick={() => selectBar(null)}
        >
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 px-6 py-2 text-sm">
            <Link
              to="/my"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Мои сетки
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="truncate font-medium text-foreground">{grid.name}</span>
          </nav>

          <div className="py-4">
            <div className="mx-auto max-w-6xl px-4">
              {/* CURRENTLY EDITING header */}
              <div className="mb-6">
                <div className="mb-2 flex items-center gap-1.5">
                  <Pencil className="size-3.5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Currently Editing
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <CompositionTitle name={grid.name} onSave={handleSaveTitle} />
                  <div className="flex shrink-0 items-center gap-2">
                    {(isDirty || updateMutation.isPending) && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        data-testid="save-button"
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Save className="size-3.5" />
                        )}
                        Save
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <HarmonyGrid
                sections={displaySections}
                selectedBarId={selectedBarId}
                playingBarIndex={playingBarIndex}
                countingInBarIndex={countingInBarIndex}
                onSelectBar={(barId) => {
                  const newBarId = selectedBarId === barId ? null : barId;
                  selectBar(newBarId);
                  if (newBarId !== null) {
                    const idx = allBars.findIndex((b) => b.id === newBarId);
                    if (idx >= 0) transport.selectBar(idx);
                  }
                }}
                onRenameSection={renameSection}
                onSetSectionTimeSignature={setSectionTimeSignature}
                onAddBarToSection={addBarToSection}
                onDeleteSection={deleteSection}
                onSetBarRepeatEnd={setBarRepeatEnd}
                onHoverBar={handleHoverBar}
                onAddSection={() => addSection(defaultTimeSignature)}
              />
            </div>
          </div>
        </main>
      </div>

      <PlayerToolbar
        status={countInActive ? 'playing' : status}
        currentBeat={displayBeat}
        currentBar={currentBar}
        totalBars={totalBars}
        selectedBarIndex={
          selectedBarFlatIndex !== undefined && selectedBarFlatIndex >= 0
            ? selectedBarFlatIndex
            : undefined
        }
        totalBeats={parseInt(effectiveTimeSig.split('/')[0] ?? '4', 10)}
        bpm={effectiveBpm}
        currentKey={playerKey}
        onPlay={transport.play}
        onPause={transport.pause}
        onStop={transport.stop}
        onPrevBar={handlePrevBar}
        onNextBar={handleNextBar}
        onBpmChange={setLocalBpm}
        onKeyChange={setPlayerKey}
        volume={effectiveVolume}
        onVolumeChange={setLocalVolume}
      />
    </div>
  );
}

export default EditorPage;
