import type { ReactNode } from 'react';

export interface MidiIndicatorProps {
  /** Connection status. */
  status: 'disconnected' | 'available' | 'connected';
  /** Whether to show the note-on flash animation. */
  flash?: boolean;
  /** Optional custom label. */
  label?: string;
  /** Whether MIDI initialization has been attempted. */
  midiInitAttempted?: boolean;
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

const NOT_ENABLED_COLOR = '#9ca3af'; // gray-400
const NOT_ENABLED_LABEL = 'MIDI not enabled';

/**
 * Small LED-like indicator showing MIDI connection status
 * with a flash animation on note-on events.
 */
export function MidiIndicator({
  status,
  flash,
  label,
  midiInitAttempted,
}: MidiIndicatorProps): ReactNode {
  if (midiInitAttempted === false) {
    const ariaLabel = "MIDI not enabled — click 'Enable MIDI' to connect";
    return (
      <div role="status" aria-label={ariaLabel} className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: NOT_ENABLED_COLOR }}
        />
        <span className="text-xs text-muted-foreground">{NOT_ENABLED_LABEL}</span>
      </div>
    );
  }

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
