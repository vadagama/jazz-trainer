import { type ReactNode, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// MidiLog — collapsible panel showing recent MIDI notes
// ---------------------------------------------------------------------------

export interface MidiLogEntry {
  note: string;
  velocity: number;
  timestamp: number;
}

export interface MidiLogProps {
  /** Recent note events (most recent first). */
  entries: MidiLogEntry[];
  /** Maximum entries to display. Default: 10. */
  maxEntries?: number;
  /** Whether the panel is expanded. */
  expanded?: boolean;
  /** Called when the expand toggle is clicked. */
  onToggle?: () => void;
}

export function MidiLog({
  entries,
  maxEntries = 10,
  expanded = false,
  onToggle,
}: MidiLogProps): ReactNode {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest entry when expanded
  useEffect(() => {
    if (expanded && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [entries, expanded]);

  const visibleEntries = entries.slice(0, maxEntries);

  if (entries.length === 0 && !expanded) return null;

  return (
    <div className="rounded border border-border bg-card text-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
        onClick={onToggle}
      >
        <span>MIDI Log ({entries.length})</span>
        <span className="text-muted-foreground">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div
          ref={listRef}
          className="max-h-40 overflow-y-auto border-t border-border px-3 py-1.5 font-mono text-xs"
        >
          {visibleEntries.length === 0 ? (
            <span className="text-muted-foreground">No events yet</span>
          ) : (
            visibleEntries.map((entry, i) => (
              <div key={`${entry.timestamp}-${i}`} className="flex items-center gap-1.5 py-0.5">
                <span className="min-w-[2.5rem] font-medium">{entry.note}</span>
                <span className="text-muted-foreground">vel:{entry.velocity}</span>
                {i < visibleEntries.length - 1 && (
                  <span className="text-muted-foreground/50">→</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
