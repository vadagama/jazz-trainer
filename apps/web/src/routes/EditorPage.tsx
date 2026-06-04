import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, Pencil, Save } from 'lucide-react';
import type { TimeSignatureString, Key } from '@jazz/shared';
import { transposeSections } from '@jazz/music-core';
import { useGrid, useUpdateGrid } from '@/queries/useGrid';
import { useEditorStore } from '@/stores/useEditorStore';
import { usePlaybackStore } from '@/stores/usePlaybackStore';
import { useEffectiveSettings } from '@/queries/useEffectiveSettings';
import { useTransport } from '@/engine/useTransport';
import { Header } from '@/components/layout/Header';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { GridContainer } from '@/components/layout/GridContainer';
import { HarmonyGrid } from '@/components/editor/HarmonyGrid';
import { ChordPalette } from '@/components/editor/ChordPalette';
import { PlayerToolbar } from '@/components/editor/PlayerToolbar';
import { DslModal } from '@/components/editor/DslModal';
import { GeneratorModal } from '@/components/editor/GeneratorModal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Inline composition title editor ──────────────────────────────────────────

function CompositionTitle({
  name,
  onSave,
}: {
  name: string;
  onSave: (name: string) => void;
}) {
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
          if (e.key === 'Escape') { setDraft(name); setEditing(false); }
        }}
        className="w-full rounded border border-primary bg-background px-2 py-0.5 text-xl font-bold outline-none"
      />
    );
  }

  return (
    <div
      className="group flex cursor-default items-center gap-2"
      onDoubleClick={() => { setDraft(name); setEditing(true); }}
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
    loadExternalContent,
    markClean,
    selectBar,
    addBarToSection,
    addChordToBar,
    clearBarChords,
    setBarRepeatEnd,
    addSection,
    renameSection,
    setSectionTimeSignature,
  } = useEditorStore();

  const settings = useEffectiveSettings();
  const { status, currentBar, currentBeat, countInActive, countInBeat } = usePlaybackStore();
  const displayBeat = countInActive ? countInBeat : currentBeat;
  const countingInBarIndex = countInActive ? currentBar : undefined;

  const [dslOpen, setDslOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [playerKey, setPlayerKey] = useState<Key>(grid?.key ?? 'C');
  const [localBpm, setLocalBpm] = useState<number | null>(null);
  const [localVolume, setLocalVolume] = useState<number | null>(null);

  useEffect(() => {
    if (grid?.content) {
      setContent(grid.content, grid.timeSignature);
    }
  }, [grid?.content, setContent]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape' || !selectedBarId) return;
      if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
      clearBarChords(selectedBarId);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedBarId, clearBarChords]);

  useEffect(() => {
    if (grid?.key) setPlayerKey(grid.key);
  }, [grid?.key]);

  // Compute transport params with safe fallbacks (must be before early returns)
  const content = localContent ?? grid?.content ?? { version: 1 as const, bars: [], sections: [] };
  const sections = content.sections ?? [];
  const originalKey: Key = grid?.key ?? 'C';
  const displaySections = transposeSections(sections, originalKey, playerKey);
  const defaultTimeSignature: TimeSignatureString =
    sections[0]?.timeSignature ?? grid?.timeSignature ?? '4/4';
  const effectiveBpm = localBpm ?? settings.bpm;
  const effectiveVolume = localVolume ?? settings.volume;
  const effectiveTimeSig = defaultTimeSignature;
  const totalBars = sections.reduce((sum, s) => sum + s.bars.length, 0);

  const transport = useTransport({
    settings: { ...settings, bpm: effectiveBpm, volume: effectiveVolume },
    timeSignature: effectiveTimeSig,
    totalBars,
    sections,
  });

  const playingBarIndex = !countInActive && status !== 'idle' ? currentBar : undefined;

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
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header
        editorMode
        onOpenDsl={() => setDslOpen(true)}
        onOpenGenerator={() => setGeneratorOpen(true)}
      />
      <Breadcrumbs items={[{ label: 'Мои сетки', href: '/my' }, { label: grid.name }]} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chord Palette — slides in when a bar is selected */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            selectedBarId ? 'w-60' : 'w-0',
          )}
        >
          <ChordPalette
            selectedBarId={selectedBarId}
            onAddChord={handleAddChordFromPalette}
          />
        </div>

        {/* Center: sections + title */}
        <main
          className="flex-1 overflow-y-auto py-6 pb-24"
          data-testid="editor-page"
          onClick={() => selectBar(null)}
        >
          <GridContainer>
            <div className="mb-6">
              <CompositionTitle name={grid.name} onSave={handleSaveTitle} />
            </div>

            <HarmonyGrid
              sections={displaySections}
              selectedBarId={selectedBarId}
              playingBarIndex={playingBarIndex}
              countingInBarIndex={countingInBarIndex}
              onSelectBar={(barId) => selectBar(selectedBarId === barId ? null : barId)}
              onRenameSection={renameSection}
              onSetSectionTimeSignature={setSectionTimeSignature}
              onAddBarToSection={addBarToSection}
              onSetBarRepeatEnd={setBarRepeatEnd}
              onAddSection={() => addSection(defaultTimeSignature)}
            />

            {isDirty && (
              <div className="mt-4 flex justify-end">
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
                  Сохранить
                </Button>
              </div>
            )}
          </GridContainer>
        </main>
      </div>

      <PlayerToolbar
        status={countInActive ? 'playing' : status}
        currentBeat={displayBeat}
        currentBar={currentBar}
        totalBars={totalBars}
        totalBeats={parseInt(effectiveTimeSig.split('/')[0] ?? '4', 10)}
        bpm={effectiveBpm}
        currentKey={playerKey}
        onPlay={transport.play}
        onPause={transport.pause}
        onStop={transport.stop}
        onPrevBar={transport.prevBar}
        onNextBar={transport.nextBar}
        onBpmChange={setLocalBpm}
        onKeyChange={setPlayerKey}
        volume={effectiveVolume}
        onVolumeChange={setLocalVolume}
      />

      <DslModal
        open={dslOpen}
        content={content}
        onImport={(imported) => loadExternalContent(imported)}
        onClose={() => setDslOpen(false)}
      />

      <GeneratorModal
        open={generatorOpen}
        onApply={(generated) => loadExternalContent(generated)}
        onClose={() => setGeneratorOpen(false)}
      />
    </div>
  );
}
