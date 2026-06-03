import { useState } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { KEYS, TIME_SIGNATURES } from '@jazz/shared';
import type { Key, TimeSignatureString } from '@jazz/shared';
import type { PlaybackStatus } from '@jazz/music-core';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PlayerToolbarProps {
  status?: PlaybackStatus;
  currentBeat?: number;
  totalBeats?: number;
  currentBar?: number;
  totalBars?: number;
  bpm?: number;
  timeSignature?: TimeSignatureString;
  currentKey: Key;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onPrevBar?: () => void;
  onNextBar?: () => void;
  onBpmChange?: (bpm: number) => void;
  onTimeSigChange?: (ts: TimeSignatureString) => void;
  onKeyChange?: (key: Key) => void;
}

export function PlayerToolbar({
  status = 'idle',
  currentBeat = 0,
  totalBeats = 4,
  currentBar,
  totalBars,
  bpm = 120,
  timeSignature = '4/4',
  currentKey,
  onPlay,
  onPause,
  onStop,
  onPrevBar,
  onNextBar,
  onBpmChange,
  onTimeSigChange,
  onKeyChange,
}: PlayerToolbarProps) {
  const [volume, setVolume] = useState(80);
  const isMuted = volume === 0;

  const isPlaying = status === 'playing';
  const isIdle = status === 'idle';

  function toggleMute() {
    setVolume((v) => (v === 0 ? 80 : 0));
  }

  function handleBpmInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 20 && val <= 400) onBpmChange?.(val);
  }

  function adjustBpm(delta: number) {
    const next = Math.min(400, Math.max(20, bpm + delta));
    onBpmChange?.(next);
  }

  return (
    <footer className="flex h-20 shrink-0 items-center justify-center gap-3 border-t border-border bg-card px-4 flex-wrap">
      {/* Prev bar */}
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onPrevBar}
        aria-label="Предыдущий такт"
        title="Предыдущий такт"
      >
        <SkipBack className="size-4" />
      </Button>

      {/* Transport controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-8', isPlaying && 'text-primary')}
          onClick={onPlay}
          disabled={isPlaying}
          aria-label="Воспроизвести"
          title="Воспроизвести"
        >
          <Play className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn('size-8', status === 'paused' && 'text-primary')}
          onClick={onPause}
          disabled={!isPlaying}
          aria-label="Пауза"
          title="Пауза"
        >
          <Pause className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onStop}
          disabled={isIdle}
          aria-label="Стоп"
          title="Стоп"
        >
          <Square className="size-4" />
        </Button>
      </div>

      {/* Next bar */}
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onNextBar}
        aria-label="Следующий такт"
        title="Следующий такт"
      >
        <SkipForward className="size-4" />
      </Button>

      <div className="h-4 w-px bg-border" />

      {/* Beat indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalBeats }, (_, i) => (
            <div
              key={i}
              className={cn(
                'size-2 rounded-full transition-colors',
                isPlaying && i === currentBeat
                  ? 'bg-primary'
                  : 'bg-border',
              )}
            />
          ))}
        </div>
        {currentBar != null && totalBars != null && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {currentBar + 1}/{totalBars}
          </span>
        )}
      </div>

      <div className="h-4 w-px bg-border" />

      {/* BPM */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-7 px-0 text-xs"
          onClick={() => adjustBpm(-5)}
          aria-label="BPM -5"
          title="BPM -5"
        >
          −5
        </Button>
        <input
          type="number"
          min={20}
          max={400}
          value={bpm}
          onChange={handleBpmInput}
          className="h-7 w-16 rounded border border-border bg-background px-1.5 text-center text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="BPM"
          title="Темп (BPM)"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-7 px-0 text-xs"
          onClick={() => adjustBpm(5)}
          aria-label="BPM +5"
          title="BPM +5"
        >
          +5
        </Button>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Time signature */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Размер</span>
        <Select value={timeSignature} onValueChange={(v) => onTimeSigChange?.(v as TimeSignatureString)}>
          <SelectTrigger className="h-7 w-20 text-xs" aria-label="Размер">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_SIGNATURES.map((ts) => (
              <SelectItem key={ts} value={ts}>
                {ts}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Key selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Тональность</span>
        <Select value={currentKey} onValueChange={(v) => onKeyChange?.(v as Key)}>
          <SelectTrigger className="h-7 w-20 text-xs" aria-label="Тональность">
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

      <div className="h-4 w-px bg-border" />

      {/* Volume control */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={toggleMute}
          aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
          title={isMuted ? 'Включить звук' : 'Выключить звук'}
        >
          {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </Button>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-border accent-primary"
          aria-label="Громкость"
          title={`Громкость: ${volume}%`}
        />
        <span className="w-7 text-right text-xs tabular-nums text-muted-foreground">{volume}%</span>
      </div>
    </footer>
  );
}
