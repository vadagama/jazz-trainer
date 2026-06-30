import type { ReactNode } from 'react';

export interface DuckingToggleProps {
  /** Whether ducking is currently enabled. */
  enabled: boolean;
  /** Callback when toggle changes. */
  onToggle: (enabled: boolean) => void;
}

/**
 * Checkbox toggle for auto-ducking.
 * When enabled, accompaniment volume is automatically reduced
 * while the solo instrument is playing.
 */
export function DuckingToggle({ enabled, onToggle }: DuckingToggleProps): ReactNode {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="size-3.5 rounded border-border accent-primary"
      />
      <span className="text-xs text-muted-foreground">Auto-duck</span>
    </label>
  );
}
