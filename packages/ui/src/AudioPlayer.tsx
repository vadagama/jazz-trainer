import { useRef, useState, useCallback, type ReactNode, type ChangeEvent } from 'react';
import { Button } from './button';

// ---------------------------------------------------------------------------
// AudioPlayer — embedded audio player with custom controls
// ---------------------------------------------------------------------------

export interface AudioPlayerProps {
  src: string;
  waveform?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ src }: AudioPlayerProps): ReactNode {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch((e) => setError(String(e)));
    } else {
      audio.pause();
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const onEnded = useCallback(() => {
    setPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  const onSeek = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const onPlay = useCallback(() => setPlaying(true), []);
  const onPause = useCallback(() => setPlaying(false), []);

  return (
    <div className="my-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
      {/* AudioPlayer: caption not needed for embedded player */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onPlay={onPlay}
        onPause={onPause}
        onError={() => setError('Failed to load audio')}
      />

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={togglePlay} className="h-9 w-9 p-0">
          {playing ? '⏸' : '▶'}
        </Button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-gray-500 w-10 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={onSeek}
            className="flex-1 h-1 accent-amber-500"
          />
          <span className="text-xs text-gray-500 w-10 tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
