import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import type { UpdateGridInput } from '@jazz/shared';
import { useGrid, useUpdateGrid } from '@/queries/useGrid';
import { useEditorStore } from '@/stores/useEditorStore';
import { EditorTopBar } from '@/components/editor/EditorTopBar';
import { HarmonyGrid } from '@/components/editor/HarmonyGrid';
import { BarEditor } from '@/components/editor/BarEditor';
import { DslModal } from '@/components/editor/DslModal';
import { GeneratorModal } from '@/components/editor/GeneratorModal';
import { Button } from '@/components/ui/button';

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
    addBar,
    removeBar,
    addChordToBar,
    removeChordFromBar,
    updateChordInBar,
    updateChordBeats,
  } = useEditorStore();

  const [dslOpen, setDslOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);

  useEffect(() => {
    if (grid?.content) {
      setContent(grid.content);
    }
  }, [grid?.content, setContent]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Загрузка сетки…
      </div>
    );
  }

  if (isError || !grid) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden" data-testid="editor-page">
      <EditorTopBar
        grid={grid}
        isDirty={isDirty}
        isSaving={updateMutation.isPending}
        barsCount={content.bars.length}
        onAddBar={addBar}
        onRemoveLastBar={handleRemoveLastBar}
        onSave={handleSave}
        onOpenDsl={() => setDslOpen(true)}
        onOpenGenerator={() => setGeneratorOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4">
          <HarmonyGrid
            content={content}
            selectedBarId={selectedBarId}
            onSelectBar={(barId) =>
              selectBar(selectedBarId === barId ? null : barId)
            }
          />
        </main>

        {selectedBar && selectedBarIndex >= 0 && (
          <BarEditor
            bar={selectedBar}
            barIndex={selectedBarIndex}
            onAddChord={(sym) => addChordToBar(selectedBar.id, sym)}
            onRemoveChord={(i) => removeChordFromBar(selectedBar.id, i)}
            onUpdateChord={(i, sym) => updateChordInBar(selectedBar.id, i, sym)}
            onUpdateBeats={(i, beats) => updateChordBeats(selectedBar.id, i, beats)}
            onRemoveBar={() => removeBar(selectedBar.id)}
            onClose={() => selectBar(null)}
          />
        )}
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
