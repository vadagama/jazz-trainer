import { VirtualKeyboard, type VirtualKeyboardProps, type KeyboardMode } from './VirtualKeyboard';

export interface VirtualKeyboardPanelProps {
  keyboardMode: KeyboardMode;
  onKeyboardModeChange: (mode: KeyboardMode) => void;
  showKeyLabels: boolean;
  onToggleKeyLabels: () => void;
  octaveLow: number;
  octaveHigh: number;
  onShiftOctave: (delta: number) => void;
  keyboardWidth: number;
  activeKeys: VirtualKeyboardProps['activeKeys'];
  onKeyClick: VirtualKeyboardProps['onKeyClick'];
  onKeyRelease: VirtualKeyboardProps['onKeyRelease'];
}

export function VirtualKeyboardPanel({
  keyboardMode,
  onKeyboardModeChange,
  showKeyLabels,
  onToggleKeyLabels,
  octaveLow,
  octaveHigh,
  onShiftOctave,
  keyboardWidth,
  activeKeys,
  onKeyClick,
  onKeyRelease,
}: VirtualKeyboardPanelProps) {
  return (
    <div className="shrink-0 border-t border-border bg-card px-4 py-2">
      <div className="mx-auto" style={{ width: keyboardWidth }}>
        <div className="mb-1.5 flex items-center gap-2">
          {(['free', 'scale-highlight', 'chord-highlight'] as KeyboardMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onKeyboardModeChange(m)}
              className={`rounded px-2 py-0.5 text-xs transition-colors ${
                keyboardMode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {m === 'free' ? 'Free' : m === 'scale-highlight' ? 'Scale' : 'Chord'}
            </button>
          ))}

          <span className="text-muted-foreground/30">|</span>

          <button
            type="button"
            onClick={onToggleKeyLabels}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              showKeyLabels
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title="Toggle note names"
          >
            ♩ Names
          </button>

          <span className="text-muted-foreground/30">|</span>

          <button
            type="button"
            onClick={() => onShiftOctave(-1)}
            disabled={octaveLow <= 0}
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            title="Octave down"
          >
            ◄ 8vb
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            C{octaveLow}–B{octaveHigh}
          </span>
          <button
            type="button"
            onClick={() => onShiftOctave(1)}
            disabled={octaveHigh >= 7}
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            title="Octave up"
          >
            8va ►
          </button>
        </div>

        <VirtualKeyboard
          octaveRange={[octaveLow, octaveHigh]}
          mode={keyboardMode}
          showLabels={showKeyLabels}
          activeKeys={activeKeys}
          onKeyClick={onKeyClick}
          onKeyRelease={onKeyRelease}
        />
      </div>
    </div>
  );
}
