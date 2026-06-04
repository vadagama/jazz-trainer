import { Play, Square, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { useState, useEffect } from 'react';
import { KEYS } from '@jazz/shared';
import type { Key } from '@jazz/shared';
import type { PlaybackStatus } from '@jazz/music-core';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface PlayerToolbarProps {
  status?: PlaybackStatus;
  currentBeat?: number;
  totalBeats?: number;
  currentBar?: number;
  totalBars?: number;
  bpm?: number;
  volume?: number; // 0–1
  currentKey: Key;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onPrevBar?: () => void;
  onNextBar?: () => void;
  onBpmChange?: (bpm: number) => void;
  onKeyChange?: (key: Key) => void;
  onVolumeChange?: (volume: number) => void; // 0–1
}

export function PlayerToolbar({
  status = 'idle',
  currentBeat = 0,
  totalBeats = 4,
  currentBar,
  totalBars,
  bpm = 120,
  volume: volumeProp = 0.8,
  currentKey,
  onPlay,
  onPause,
  onStop,
  onPrevBar,
  onNextBar,
  onBpmChange,
  onKeyChange,
  onVolumeChange,
}: PlayerToolbarProps) {
  const volumePct = Math.round(volumeProp * 100);
  const isMuted = volumeProp === 0;

  const isPlaying = status === 'playing';
  const isIdle = status === 'idle';

  const [bpmInput, setBpmInput] = useState(String(bpm));

  useEffect(() => {
    setBpmInput(String(bpm));
  }, [bpm]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        (target as HTMLElement).isContentEditable
      ) return;
      e.preventDefault();
      if (isPlaying) {
        onStop?.();
      } else {
        onPlay?.();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onPlay, onStop]);

  function toggleMute() {
    onVolumeChange?.(isMuted ? 0.8 : 0);
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    setBpmInput(raw);
  }

  function commitBpm() {
    const val = parseInt(bpmInput, 10);
    if (!isNaN(val) && val >= 20 && val <= 400) {
      onBpmChange?.(val);
    } else {
      setBpmInput(String(bpm));
    }
  }

  function handleBpmKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  }

  function adjustBpm(delta: number) {
    const next = Math.min(400, Math.max(20, bpm + delta));
    onBpmChange?.(next);
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 flex h-24 items-center justify-center gap-4 border-t border-border bg-card px-4 flex-wrap">
      {/* Prev bar */}
      <Button
        variant="ghost"
        size="icon"
        className="size-10"
        onClick={onPrevBar}
        disabled={isPlaying}
        aria-label="Предыдущий такт"
        title="Предыдущий такт"
      >
        <SkipBack className="size-5" />
      </Button>

      {/* Transport controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-10', isPlaying && 'text-primary')}
          onClick={onPlay}
          disabled={isPlaying}
          aria-label="Воспроизвести"
          title="Воспроизвести"
        >
          <Play className="size-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={onStop}
          disabled={isIdle}
          aria-label="Стоп"
          title="Стоп"
        >
          <Square className="size-5" />
        </Button>
      </div>

      {/* Next bar */}
      <Button
        variant="ghost"
        size="icon"
        className="size-10"
        onClick={onNextBar}
        disabled={isPlaying}
        aria-label="Следующий такт"
        title="Следующий такт"
      >
        <SkipForward className="size-5" />
      </Button>

      <div className="h-6 w-px bg-border" />

      {/* Beat indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalBeats }, (_, i) => (
            <div
              key={i}
              className={cn(
                'size-3 rounded-full transition-colors',
                isPlaying && i === currentBeat
                  ? 'bg-primary'
                  : 'bg-border',
              )}
            />
          ))}
        </div>
        {currentBar != null && totalBars != null && (
          <span className="text-sm tabular-nums text-muted-foreground">
            <span className="inline-block w-[2ch] text-right">{currentBar + 1}</span>
            /
            <span className="inline-block w-[2ch] text-left">{totalBars}</span>
          </span>
        )}
      </div>

      <div className="h-6 w-px bg-border" />

      {/* BPM */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-9 px-0 text-sm"
          onClick={() => adjustBpm(-5)}
          aria-label="BPM -5"
          title="BPM -5"
        >
          −5
        </Button>
        <input
          type="text"
          inputMode="numeric"
          value={bpmInput}
          onChange={handleBpmChange}
          onBlur={commitBpm}
          onKeyDown={handleBpmKeyDown}
          className="h-9 w-20 rounded border border-border bg-background px-2 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="BPM"
          title="Темп (BPM)"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-9 px-0 text-sm"
          onClick={() => adjustBpm(5)}
          aria-label="BPM +5"
          title="BPM +5"
        >
          +5
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Key selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Тональность</span>
        <Select value={currentKey} onValueChange={(v) => onKeyChange?.(v as Key)}>
          <SelectTrigger className="h-9 w-24 text-sm" aria-label="Тональность">
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

      <div className="h-6 w-px bg-border" />

      {/* Volume control */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          onClick={toggleMute}
          aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
          title={isMuted ? 'Включить звук' : 'Выключить звук'}
        >
          {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </Button>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[volumePct]}
          onValueChange={(vals) => onVolumeChange?.((vals[0] ?? volumePct) / 100)}
          className="w-32"
          aria-label="Громкость"
        />
        <span className="w-9 text-right text-sm tabular-nums text-muted-foreground">{volumePct}%</span>
      </div>
    </footer>
  );
}
