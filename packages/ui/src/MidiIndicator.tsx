import type { ReactNode } from 'react';

export interface MidiIndicatorProps {
  status: 'disconnected' | 'available' | 'connected';
  flash?: boolean;
  label?: string;
  hideLabel?: boolean;
  midiInitAttempted?: boolean;
}

const STATUS_COLORS: Record<MidiIndicatorProps['status'], string> = {
  disconnected: '#ef4444',
  available: '#f59e0b',
  connected: '#22c55e',
};

const STATUS_LABELS: Record<MidiIndicatorProps['status'], string> = {
  disconnected: 'No MIDI',
  available: 'MIDI Ready',
  connected: 'MIDI Connected',
};

const NOT_ENABLED_COLOR = '#9ca3af';
const NOT_ENABLED_LABEL = 'MIDI not enabled';

export function MidiIndicator({
  status,
  flash,
  label,
  hideLabel,
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
        {!hideLabel && <span className="text-xs text-muted-foreground">{NOT_ENABLED_LABEL}</span>}
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
          ...(flash ? { boxShadow: `0 0 6px 2px ${color}` } : {}),
        }}
      />
      {!hideLabel && <span className="text-xs text-muted-foreground">{ariaLabel}</span>}
    </div>
  );
}
