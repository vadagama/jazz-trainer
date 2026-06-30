import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// MidiIndicator — LED-like MIDI status indicator
//
// Standalone copy for the visual-midi-keyboard plugin.
// ---------------------------------------------------------------------------

export interface MidiIndicatorProps {
  /** Connection status. */
  status: 'disconnected' | 'available' | 'connected';
  /** Whether to show the note-on flash animation. */
  flash?: boolean;
  /** Optional custom label. */
  label?: string;
}

const STATUS_COLORS: Record<MidiIndicatorProps['status'], string> = {
  disconnected: '#ef4444', // red
  available: '#f59e0b', // amber
  connected: '#22c55e', // green
};

const STATUS_LABELS: Record<MidiIndicatorProps['status'], string> = {
  disconnected: 'No MIDI',
  available: 'MIDI Ready',
  connected: 'MIDI Connected',
};

export function MidiIndicator({ status, flash, label }: MidiIndicatorProps): ReactNode {
  const color = STATUS_COLORS[status];
  const ariaLabel = label ?? STATUS_LABELS[status];

  return (
    <div role="status" aria-label={ariaLabel} className="flex items-center gap-2">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
          flash ? 'animate-pulse' : ''
        }`}
        style={{
          backgroundColor: color,
          ...(flash
            ? {
                boxShadow: `0 0 6px 2px ${color}`,
              }
            : {}),
        }}
      />
      <span className="text-xs text-muted-foreground">{ariaLabel}</span>
    </div>
  );
}
