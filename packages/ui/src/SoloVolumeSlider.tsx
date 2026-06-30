import type { ReactNode } from 'react';

export interface SoloVolumeSliderProps {
  /** Current volume 0–1. */
  volume: number;
  /** Callback when volume changes. */
  onVolumeChange: (value: number) => void;
}

/**
 * Slider controlling the solo instrument volume.
 */
export function SoloVolumeSlider({ volume, onVolumeChange }: SoloVolumeSliderProps): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="solo-volume" className="text-xs text-muted-foreground">
        Solo Vol:
      </label>
      <input
        id="solo-volume"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="h-4 w-20"
      />
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}
