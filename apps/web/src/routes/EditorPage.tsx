import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import type { UpdateGridInput } from '@jazz/shared';
import { useGrid, useUpdateGrid } from '@/queries/useGrid';
import { useEditorStore } from '@/stores/useEditorStore';
import { useTheme } from '@/hooks/useTheme';
import { EditorTopBar } from '@/components/editor/EditorTopBar';
import { HarmonyGrid } from '@/components/editor/HarmonyGrid';
import { BarEditor } from '@/components/editor/BarEditor';
import { ChordPalette } from '@/components/editor/ChordPalette';
import { DslModal } from '@/components/editor/DslModal';
import { GeneratorModal } from '@/components/editor/GeneratorModal';
import { Button } from '@/components/ui/button';

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const gridId = id ?? '';

  const { data: grid, isLoading, isError } = useGrid(gridId);
  const updateMutation = useUpdateGrid(gridId);
  const { theme, toggle: toggleTheme } = useTheme();

  const {
    localContent,
    selectedBarId,
    isDirty,
    setContent,
    loadExternalContent,
    markClean,
    selectBar,
    addBar,
    removeBar,
    addChordToBar,
    removeChordFromBar,
    updateChordInBar,
    updateChordBeats,
  } = useEditorStore();

  const [dslOpen, setDslOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  useEffect(() => {
    if (grid?.content) {
      setContent(grid.content);
    }
  }, [grid?.content, setContent]);

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

  const content = localContent ?? grid.content;

  const selectedBar = selectedBarId
    ? content.bars.find((b) => b.id === selectedBarId) ?? null
    : null;

  const selectedBarIndex = selectedBarId
    ? content.bars.findIndex((b) => b.id === selectedBarId)
    : -1;

  async function handleSave(meta: UpdateGridInput) {
    await updateMutation.mutateAsync({ ...meta, content });
    markClean();
  }

  function handleRemoveLastBar() {
    const bars = content.bars;
    if (bars.length === 0) return;
    const lastBar = bars[bars.length - 1]!;
    removeBar(lastBar.id);
  }

  function handleAddChordFromPalette(symbol: string) {
    if (!selectedBarId) return;
    addChordToBar(selectedBarId, symbol);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <EditorTopBar
        grid={grid}
        isDirty={isDirty}
        isSaving={updateMutation.isPending}
        barsCount={content.bars.length}
        theme={theme}
        onAddBar={addBar}
        onRemoveLastBar={handleRemoveLastBar}
        onSave={handleSave}
        onOpenDsl={() => setDslOpen(true)}
        onOpenGenerator={() => setGeneratorOpen(true)}
        onToggleTheme={toggleTheme}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chord Palette */}
        <ChordPalette
          selectedBarId={selectedBarId}
          onAddChord={handleAddChordFromPalette}
        />

        {/* Center: Harmony Grid */}
        <main className="flex-1 overflow-y-auto p-6" data-testid="editor-page">
          <HarmonyGrid
            content={content}
            selectedBarId={selectedBarId}
            onSelectBar={(barId) => selectBar(selectedBarId === barId ? null : barId)}
          />
        </main>

        {/* Right: Collapsible Bar Editor */}
        <BarEditor
          bar={selectedBar}
          barIndex={selectedBarIndex}
          isOpen={rightPanelOpen}
          onToggle={() => setRightPanelOpen((v) => !v)}
          onAddChord={(sym) => selectedBarId && addChordToBar(selectedBarId, sym)}
          onRemoveChord={(i) => selectedBarId && removeChordFromBar(selectedBarId, i)}
          onUpdateChord={(i, sym) => selectedBarId && updateChordInBar(selectedBarId, i, sym)}
          onUpdateBeats={(i, beats) => selectedBarId && updateChordBeats(selectedBarId, i, beats)}
          onRemoveBar={() => selectedBarId && removeBar(selectedBarId)}
          onClose={() => selectBar(null)}
        />
      </div>

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
