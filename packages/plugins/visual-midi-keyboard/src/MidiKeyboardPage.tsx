import { useState, useCallback } from 'react';
import type { InputPort } from '@jazz/music-core';
import { useMidiVisualizer, type KeyboardMode } from '@jazz/plugin-sdk';
import { VirtualKeyboard } from '@jazz/ui';
import { MidiIndicator } from './MidiIndicator';
import { MidiLog } from './MidiLog';

// ---------------------------------------------------------------------------
// MidiKeyboardPage — standalone MIDI keyboard visualizer page
// ---------------------------------------------------------------------------

export function MidiKeyboardPage() {
  const [mode, setMode] = useState<KeyboardMode>('free');
  const [compact, setCompact] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);

  // For now, we try to get the MIDI input port from window.__midiInputPort
  // (set by the app shell once Phase A wiring is complete).
  // Falls back to null (disconnected state).
  const inputPort: InputPort | null =
    typeof window !== 'undefined'
      ? (((window as unknown as Record<string, unknown>).__midiInputPort as InputPort | null) ??
        null)
      : null;

  const { activeKeys, recentNotes, connectionStatus, indicatorFlash } = useMidiVisualizer(
    inputPort,
    { mode },
  );

  const handleModeChange = useCallback((newMode: KeyboardMode) => {
    setMode(newMode);
  }, []);

  const handleKeyClick = useCallback((midiNote: number) => {
    // Visual feedback only — no sound output from virtual keyboard clicks yet.
    void midiNote;
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold">MIDI Keyboard</h1>
        <MidiIndicator status={connectionStatus} flash={indicatorFlash} />
      </div>

      {/* Mode selector */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Mode:</span>
        {(['free', 'scale-highlight', 'chord-highlight'] as KeyboardMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {m === 'free' ? 'Free' : m === 'scale-highlight' ? 'Scale' : 'Chord'}
          </button>
        ))}

        <span className="mx-1 text-muted-foreground/30">|</span>

        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={compact}
            onChange={(e) => setCompact(e.target.checked)}
            className="size-3.5"
          />
          Compact
        </label>
      </div>

      {/* Virtual keyboard */}
      <div className="shrink-0 rounded-lg border bg-card p-4">
        <VirtualKeyboard
          octaveRange={[3, 5]}
          mode={mode}
          compact={compact}
          activeKeys={activeKeys}
          onKeyClick={handleKeyClick}
        />
      </div>

      {/* MIDI Log */}
      <div className="shrink-0">
        <MidiLog
          entries={recentNotes}
          maxEntries={10}
          expanded={logExpanded}
          onToggle={() => setLogExpanded((p) => !p)}
        />
      </div>

      {/* Info when no MIDI */}
      {connectionStatus === 'disconnected' && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          <p>
            No MIDI device detected. Connect a MIDI keyboard or controller to see real-time key
            highlighting.
          </p>
          <p className="mt-1 text-xs">
            You can still explore the keyboard layout by clicking keys.
          </p>
        </div>
      )}
    </div>
  );
}

export default MidiKeyboardPage;
