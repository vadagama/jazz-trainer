import { PianoKeysIcon } from './PianoKeysIcon';

export interface PlayerMidiControlsProps {
  midiConnectionStatus: 'disconnected' | 'available' | 'connected';
  midiIndicatorFlash: boolean;
  midiInitAttempted: boolean;
  midiConnecting: boolean;
  onMidiClick: () => void;
  keyboardVisible: boolean;
  onToggleKeyboard: () => void;
  children?: React.ReactNode;
}

const MIDI_COLORS: Record<string, string> = {
  disconnected: '#ef4444',
  available: '#f59e0b',
  connected: '#22c55e',
};

const MIDI_NOT_ENABLED_COLOR = '#9ca3af';

const MIDI_STATUS_TITLES: Record<string, string> = {
  disconnected: 'MIDI disconnected',
  available: 'MIDI available',
  connected: 'MIDI connected',
};

export function PlayerMidiControls({
  midiConnectionStatus,
  midiIndicatorFlash,
  midiInitAttempted,
  midiConnecting,
  onMidiClick,
  keyboardVisible,
  onToggleKeyboard,
  children,
}: PlayerMidiControlsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onMidiClick}
        disabled={!midiInitAttempted ? midiConnecting : undefined}
        className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 transition-colors cursor-pointer hover:bg-secondary/80"
        title={
          midiInitAttempted ? 'Настройки соло-инструмента' : MIDI_STATUS_TITLES[midiConnectionStatus]
        }
      >
        <span
          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-300 ${
            midiIndicatorFlash ? 'animate-pulse' : ''
          }`}
          style={{
            backgroundColor: midiInitAttempted
              ? MIDI_COLORS[midiConnectionStatus]
              : MIDI_NOT_ENABLED_COLOR,
            ...(midiIndicatorFlash
              ? { boxShadow: `0 0 6px 2px ${MIDI_COLORS[midiConnectionStatus]}` }
              : {}),
          }}
        />
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          {midiConnecting ? '…' : 'MIDI'}
        </span>
      </button>

      {children}

      <button
        type="button"
        onClick={onToggleKeyboard}
        className={`ml-1 rounded p-1.5 transition-colors ${
          keyboardVisible
            ? 'bg-primary/20 text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title={
          keyboardVisible
            ? 'Hide virtual keyboard'
            : 'Show virtual keyboard (auto-opens when MIDI connects)'
        }
      >
        <PianoKeysIcon className="size-5" />
      </button>
    </>
  );
}
