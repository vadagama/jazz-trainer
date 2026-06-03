import { useState } from 'react';
import { Play, Pause, Square, Volume2, VolumeX } from 'lucide-react';
import { KEYS } from '@jazz/shared';
import type { Key } from '@jazz/shared';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type PlaybackState = 'playing' | 'paused' | 'stopped';

interface PlayerToolbarProps {
  playbackState?: PlaybackState;
  currentKey: Key;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onKeyChange?: (key: Key) => void;
}

export function PlayerToolbar({
  playbackState = 'stopped',
  currentKey,
  onPlay,
  onPause,
  onStop,
  onKeyChange,
}: PlayerToolbarProps) {
  const [volume, setVolume] = useState(80);
  const isMuted = volume === 0;

  function toggleMute() {
    setVolume((v) => (v === 0 ? 80 : 0));
  }

  return (
    <footer className="flex h-20 shrink-0 items-center justify-center gap-3 border-t border-border bg-card px-4">
      {/* Transport controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-8', playbackState === 'playing' && 'text-primary')}
          onClick={onPlay}
          disabled={playbackState === 'playing'}
          aria-label="Воспроизвести"
          title="Воспроизвести"
        >
          <Play className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn('size-8', playbackState === 'paused' && 'text-primary')}
          onClick={onPause}
          disabled={playbackState !== 'playing'}
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
          disabled={playbackState === 'stopped'}
          aria-label="Стоп"
          title="Стоп"
        >
          <Square className="size-4" />
        </Button>
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
