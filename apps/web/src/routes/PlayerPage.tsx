import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Key, TimeSignatureString } from '@jazz/shared';
import { usePublicGrid, usePublicGrids } from '@/queries/usePublicGrids';
import { useEffectiveSettings } from '@/queries/useEffectiveSettings';
import { usePlaybackStore } from '@/stores/usePlaybackStore';
import { useTransport } from '@/engine/useTransport';
import { HarmonyGrid } from '@/components/editor/HarmonyGrid';
import { PlayerToolbar } from '@/components/editor/PlayerToolbar';

export function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: grid, isLoading, isError } = usePublicGrid(id ?? '');
  const { data: allGrids } = usePublicGrids({ sort: 'updated', limit: 200 });

  const sortedGrids = [...(allGrids ?? [])].sort((a, b) => a.updatedAt - b.updatedAt);
  const currentIdx = sortedGrids.findIndex((g) => g.id === id);
  const prevGrid = currentIdx > 0 ? sortedGrids[currentIdx - 1] : null;
  const nextGrid = currentIdx < sortedGrids.length - 1 ? sortedGrids[currentIdx + 1] : null;

  const settings = useEffectiveSettings();
  const { status, currentBar, currentBeat } = usePlaybackStore();

  const [localBpm, setLocalBpm] = useState<number | null>(null);
  const [localKey, setLocalKey] = useState<Key | null>(null);
  const [localTimeSig, setLocalTimeSig] = useState<TimeSignatureString | null>(null);

  const effectiveBpm = localBpm ?? settings.bpm;
  const effectiveTimeSig = localTimeSig ?? grid?.timeSignature ?? '4/4';
  const effectiveKey = localKey ?? grid?.key ?? 'C';

  const sections = grid?.content.sections ?? [];
  const totalBars = sections.length > 0
    ? sections.reduce((s, sec) => s + sec.bars.length, 0)
    : (grid?.barsCount ?? 0);

  const transport = useTransport({
    settings: { ...settings, bpm: effectiveBpm },
    timeSignature: effectiveTimeSig,
    totalBars,
  });

  const playingBarIndex = status !== 'idle' ? currentBar : undefined;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (isError || !grid) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-center">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-sm text-muted-foreground">Не удалось загрузить сетку</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top nav */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <button
          onClick={() => prevGrid && navigate(`/play/${prevGrid.id}`)}
          disabled={!prevGrid}
          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          ← Пред.
        </button>
        <h1 className="text-lg font-semibold">{grid.name}</h1>
        <button
          onClick={() => nextGrid && navigate(`/play/${nextGrid.id}`)}
          disabled={!nextGrid}
          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          След. →
        </button>
      </div>

      {/* Grid (read-only) */}
      <main className="flex-1 overflow-y-auto p-6">
        {sections.length > 0 && (
          <HarmonyGrid
            sections={sections}
            selectedBarId={null}
            playingBarIndex={playingBarIndex}
            onSelectBar={() => {}}
            onRenameSection={() => {}}
            onSetSectionTimeSignature={() => {}}
            onAddBarToSection={() => {}}
            onSetBarRepeatEnd={() => {}}
            onAddSection={() => {}}
          />
        )}
      </main>

      <PlayerToolbar
        status={status}
        currentBeat={currentBeat}
        currentBar={currentBar}
        totalBars={totalBars}
        totalBeats={parseInt(effectiveTimeSig.split('/')[0] ?? '4', 10)}
        bpm={effectiveBpm}
        timeSignature={effectiveTimeSig}
        currentKey={effectiveKey}
        onPlay={transport.play}
        onPause={transport.pause}
        onStop={transport.stop}
        onPrevBar={transport.prevBar}
        onNextBar={transport.nextBar}
        onBpmChange={setLocalBpm}
        onTimeSigChange={setLocalTimeSig}
        onKeyChange={setLocalKey}
      />
    </div>
  );
}
