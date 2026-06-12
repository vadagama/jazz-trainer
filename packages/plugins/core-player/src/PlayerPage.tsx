import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Key, Section } from '@jazz/shared';
import { transposeSections } from '@jazz/music-core';
import { usePublicGrid } from './queries/usePublicGrids';
import {
  useEffectiveSettings,
  usePlaybackStore,
  usePluginTransport,
} from '@jazz/plugin-sdk';
import { HarmonyGrid, PlayerToolbar } from '@jazz/ui';

export function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const { data: grid, isLoading, isError } = usePublicGrid(id ?? '');
  const settings = useEffectiveSettings();
  const { status, currentBar, currentBeat, countInActive, countInBeat } = usePlaybackStore();
  const displayBeat = countInActive ? countInBeat : currentBeat;
  const countingInBarIndex = countInActive ? currentBar : undefined;

  const [localBpm, setLocalBpm] = useState<number | null>(null);
  const [localKey, setLocalKey] = useState<Key | null>(null);
  const [localVolume, setLocalVolume] = useState<number | null>(null);

  const effectiveBpm = localBpm ?? settings.bpm;
  const effectiveVolume = localVolume ?? settings.volume;
  const effectiveTimeSig = grid?.timeSignature ?? '4/4';
  const effectiveKey = localKey ?? grid?.key ?? 'C';

  const rawContent = grid?.content ?? { version: 1 as const, bars: [] };
  const sections: Section[] =
    rawContent.sections && rawContent.sections.length > 0
      ? rawContent.sections
      : rawContent.bars.length > 0
        ? [
            {
              id: 'section-main',
              name: 'A',
              timeSignature: effectiveTimeSig,
              bars: rawContent.bars,
            },
          ]
        : [];
  const originalKey = grid?.key ?? 'C';
  const displaySections = useMemo(
    () => transposeSections(sections, originalKey, effectiveKey),
    [sections, originalKey, effectiveKey],
  );
  const totalBars =
    sections.length > 0
      ? sections.reduce((s, sec) => s + sec.bars.length, 0)
      : (grid?.barsCount ?? 0);

  const transport = usePluginTransport({
    settings: { ...settings, bpm: effectiveBpm, volume: effectiveVolume },
    timeSignature: effectiveTimeSig,
    totalBars,
    sections: displaySections,
  });

  const playingBarIndex = !countInActive && status !== 'idle' ? currentBar : undefined;

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
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Breadcrumbs */}
      <nav className="flex shrink-0 items-center gap-1.5 px-6 py-2 text-sm">
        <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
          Каталог
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="truncate font-medium text-foreground">{grid.name}</span>
      </nav>

      {/* Grid (read-only) */}
      <main className="flex-1 overflow-y-auto py-4">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="mb-6 text-xl font-bold text-foreground">{grid.name}</h1>
          {sections.length > 0 && (
            <HarmonyGrid
              sections={displaySections}
              selectedBarId={null}
              playingBarIndex={playingBarIndex}
              countingInBarIndex={countingInBarIndex}
              readonly
              onSelectBar={() => {}}
              onRenameSection={() => {}}
              onSetSectionTimeSignature={() => {}}
              onAddBarToSection={() => {}}
              onDeleteSection={() => {}}
              onSetBarRepeatEnd={() => {}}
              onAddSection={() => {}}
            />
          )}
        </div>
      </main>

      <PlayerToolbar
        status={countInActive ? 'playing' : status}
        currentBeat={displayBeat}
        currentBar={currentBar}
        totalBars={totalBars}
        totalBeats={parseInt(effectiveTimeSig.split('/')[0] ?? '4', 10)}
        bpm={effectiveBpm}
        currentKey={effectiveKey}
        onPlay={transport.play}
        onPause={transport.pause}
        onStop={transport.stop}
        onPrevBar={transport.prevBar}
        onNextBar={transport.nextBar}
        onBpmChange={setLocalBpm}
        onKeyChange={setLocalKey}
        volume={effectiveVolume}
        onVolumeChange={setLocalVolume}
      />
    </div>
  );
}

export default PlayerPage;
