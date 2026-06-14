import { Play, Square, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { useState, useEffect } from 'react';
import { KEYS } from '@jazz/shared';
import type { Key, Style } from '@jazz/shared';
import type { PlaybackStatus } from '@jazz/music-core';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Slider } from './slider';
import { cn } from './utils';
import { StyleSelector } from './StyleSelector';

interface PlayerToolbarProps {
  status?: PlaybackStatus;
  currentBeat?: number;
  totalBeats?: number;
  currentBar?: number;
  totalBars?: number;
  selectedBarIndex?: number;
  bpm?: number;
  volume?: number;
  currentKey: Key;
  style?: Style;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onPrevBar?: () => void;
  onNextBar?: () => void;
  onBpmChange?: (bpm: number) => void;
  onKeyChange?: (key: Key) => void;
  onVolumeChange?: (volume: number) => void;
  onStyleChange?: (style: Style) => void;
}

function ToolbarLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-center text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </span>
  );
}

function Divider() {
  return <div className="mx-1 h-8 w-px shrink-0 bg-border" />;
}

export function PlayerToolbar({
  status = 'idle',
  currentBeat = 0,
  totalBeats = 4,
  currentBar: _currentBar,
  selectedBarIndex: _selectedBarIndex,
  bpm = 120,
  volume: volumeProp = 0.8,
  currentKey,
  style,
  onPlay,
  onPause: _onPause,
  onStop,
  onPrevBar,
  onNextBar,
  onBpmChange,
  onKeyChange,
  onVolumeChange,
  onStyleChange,
}: PlayerToolbarProps) {
  const volumePct = Math.round(volumeProp * 100);
  const isMuted = volumeProp === 0;
  const isPlaying = status === 'playing';

  const [bpmInput, setBpmInput] = useState(String(bpm));

  useEffect(() => setBpmInput(String(bpm)), [bpm]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'combobox' ||
        target.getAttribute('role') === 'option' ||
        target.closest('[role="listbox"]')
      )
        return;
      e.preventDefault();
      void (isPlaying ? onStop?.() : onPlay?.());
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onPlay, onStop]);

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBpmInput(e.target.value.replace(/\D/g, ''));
  }

  function commitBpm() {
    const val = parseInt(bpmInput, 10);
    if (!isNaN(val) && val >= 20 && val <= 400) onBpmChange?.(val);
    else setBpmInput(String(bpm));
  }

  function adjustBpm(delta: number) {
    onBpmChange?.(Math.min(400, Math.max(20, bpm + delta)));
  }

  return (
    <footer className="flex h-24 shrink-0 items-center gap-3 border-t border-border bg-card px-4">
      {/* Left: BPM / SIG / KEY labeled blocks */}
      <div className="flex items-stretch gap-1.5">
        {/* BPM */}
        <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
          <button
            onClick={() => adjustBpm(-5)}
            className="flex size-7 items-center justify-center rounded text-base font-medium text-muted-foreground hover:text-foreground active:scale-95"
            aria-label="BPM -5"
          >
            −
          </button>
          <div className="flex min-w-[56px] flex-col items-center">
            <ToolbarLabel>BPM</ToolbarLabel>
            <input
              type="text"
              inputMode="numeric"
              value={bpmInput}
              onChange={handleBpmChange}
              onBlur={commitBpm}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums text-foreground focus:outline-none"
              aria-label="BPM"
            />
          </div>
          <button
            onClick={() => adjustBpm(5)}
            className="flex size-7 items-center justify-center rounded text-base font-medium text-muted-foreground hover:text-foreground active:scale-95"
            aria-label="BPM +5"
          >
            +
          </button>
        </div>

        {/* KEY */}
        <div className="flex flex-col items-center justify-center rounded-md bg-secondary px-2 py-1">
          <ToolbarLabel>KEY</ToolbarLabel>
          <Select value={currentKey} onValueChange={(v) => onKeyChange?.(v as Key)}>
            <SelectTrigger
              className="h-5 min-w-[64px] border-none bg-transparent p-0 text-xs font-semibold text-foreground shadow-none focus:ring-0"
              aria-label="Тональность"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* STYLE */}
        {style !== undefined && onStyleChange && (
          <div className="flex flex-col items-center justify-center rounded-md bg-secondary px-2 py-1">
            <ToolbarLabel>STYLE</ToolbarLabel>
            <StyleSelector value={style} onChange={onStyleChange} />
          </div>
        )}
      </div>

      <Divider />

      {/* Center: Transport */}
      <div className="flex flex-1 items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          onClick={onPrevBar}
          disabled={isPlaying}
          aria-label="Предыдущий такт"
        >
          <SkipBack className="size-6" />
        </Button>

        <Button
          size="icon"
          className={cn(
            'size-14 rounded-full',
            isPlaying ? 'bg-primary text-primary-foreground hover:bg-primary/90' : '',
          )}
          variant={isPlaying ? 'default' : 'ghost'}
          onClick={isPlaying ? onStop : onPlay}
          aria-label={isPlaying ? 'Стоп' : 'Воспроизвести'}
        >
          {isPlaying ? <Square className="size-6" /> : <Play className="size-6" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          onClick={onNextBar}
          disabled={isPlaying}
          aria-label="Следующий такт"
        >
          <SkipForward className="size-6" />
        </Button>

        {/* Beat dots — no background, inline with transport */}
        <div className="ml-2 flex items-center gap-1.5">
          {Array.from({ length: totalBeats }, (_, i) => (
            <div
              key={i}
              className={cn(
                'size-2 rounded-full transition-colors duration-75',
                isPlaying && i === currentBeat ? 'bg-primary' : 'bg-muted-foreground/35',
              )}
            />
          ))}
        </div>

        <span className="ml-2 text-sm tabular-nums text-muted-foreground">
          {currentBeat + 1} / {totalBeats}
        </span>
      </div>

      <Divider />

      {/* Right: Volume */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => onVolumeChange?.(isMuted ? 0.8 : 0)}
          aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
        >
          {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[volumePct]}
          onValueChange={(vals) => onVolumeChange?.((vals[0] ?? volumePct) / 100)}
          className="w-24"
          aria-label="Громкость"
        />
        <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
          {volumePct}%
        </span>
      </div>
    </footer>
  );
}
