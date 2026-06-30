import type { InputPort, MidiInputEvent, MidiDeviceInfo } from '@jazz/music-core';
import type { ComputerKeyMap } from '@jazz/music-core/audio';

// ---------------------------------------------------------------------------
// ComputerKeyboardAdapter — InputPort backed by laptop keyboard events
// ---------------------------------------------------------------------------

const VIRTUAL_DEVICE: MidiDeviceInfo = {
  id: 'computer-keyboard',
  name: 'Клавиатура компьютера',
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]!}${octave}`;
}

export class ComputerKeyboardAdapter implements InputPort {
  private keyMap: ComputerKeyMap = {};
  private _enabled = false;
  private pressedKeys = new Set<string>();

  private noteOnHandlers: Array<(e: MidiInputEvent) => void> = [];
  private noteOffHandlers: Array<(e: MidiInputEvent) => void> = [];
  private connectionHandlers: Array<(s: 'disconnected' | 'available' | 'connected') => void> = [];

  // ── InputPort ─────────────────────────────────────────────────────────────

  onNoteOn(handler: (e: MidiInputEvent) => void): () => void {
    this.noteOnHandlers.push(handler);
    return () => {
      const i = this.noteOnHandlers.indexOf(handler);
      if (i !== -1) this.noteOnHandlers.splice(i, 1);
    };
  }

  onNoteOff(handler: (e: MidiInputEvent) => void): () => void {
    this.noteOffHandlers.push(handler);
    return () => {
      const i = this.noteOffHandlers.indexOf(handler);
      if (i !== -1) this.noteOffHandlers.splice(i, 1);
    };
  }

  async devices(): Promise<string[]> {
    return this._enabled ? [VIRTUAL_DEVICE.name] : [];
  }

  async listInputs(): Promise<MidiDeviceInfo[]> {
    return this._enabled ? [VIRTUAL_DEVICE] : [];
  }

  selectInput(_deviceId: string | null): void {
    // Single virtual device — no-op.
  }

  get activeDeviceId(): string | null {
    return null;
  }

  setChannelFilter(_channel: number | 'all'): void {
    // No MIDI channel concept for keyboard input.
  }

  get channelFilter(): number | 'all' {
    return 'all';
  }

  get connectionStatus(): 'disconnected' | 'available' | 'connected' {
    return this._enabled ? 'available' : 'disconnected';
  }

  onConnectionChange(handler: (s: 'disconnected' | 'available' | 'connected') => void): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      const i = this.connectionHandlers.indexOf(handler);
      if (i !== -1) this.connectionHandlers.splice(i, 1);
    };
  }

  // ── Control ───────────────────────────────────────────────────────────────

  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;
    console.debug(
      '[ComputerKeyboardAdapter]',
      enabled ? 'ENABLED' : 'DISABLED',
      'keyMap entries:',
      Object.keys(this.keyMap).length,
    );

    if (enabled) {
      document.addEventListener('keydown', this.handleKeyDown);
      document.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.handleWindowBlur);
    } else {
      document.removeEventListener('keydown', this.handleKeyDown);
      document.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleWindowBlur);
      this.releaseAll();
    }

    this.notifyConnectionChange();
  }

  updateKeyMap(map: ComputerKeyMap): void {
    this.releaseAll();
    this.keyMap = map;
    console.debug('[ComputerKeyboardAdapter] keyMap updated:', Object.keys(map).length, 'keys');
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private notifyConnectionChange(): void {
    const status = this.connectionStatus;
    for (const h of this.connectionHandlers) h(status);
  }

  private releaseAll(): void {
    for (const key of this.pressedKeys) {
      const midiNote = this.keyMap[key];
      if (midiNote !== undefined) {
        const event: MidiInputEvent = {
          note: midiToNote(midiNote),
          velocity: 0,
          timestamp: performance.now(),
        };
        for (const h of this.noteOffHandlers) h(event);
      }
    }
    this.pressedKeys.clear();
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (isInputTarget(e)) {
      console.debug('[ComputerKeyboardAdapter] keydown ignored: input target');
      return;
    }
    if (e.repeat) return;

    const key = e.key.toLowerCase();
    const midiNote = this.keyMap[key];
    if (midiNote === undefined) return;

    e.preventDefault();
    this.pressedKeys.add(key);

    const noteName = midiToNote(midiNote);
    console.debug(
      '[ComputerKeyboardAdapter] keydown:',
      key,
      '→',
      noteName,
      'noteOn handlers:',
      this.noteOnHandlers.length,
    );

    const event: MidiInputEvent = {
      note: noteName,
      velocity: 80,
      timestamp: performance.now(),
    };
    for (const h of this.noteOnHandlers) h(event);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    const midiNote = this.keyMap[key];
    if (midiNote === undefined) return;
    if (!this.pressedKeys.has(key)) return;

    this.pressedKeys.delete(key);

    const event: MidiInputEvent = {
      note: midiToNote(midiNote),
      velocity: 0,
      timestamp: performance.now(),
    };
    for (const h of this.noteOffHandlers) h(event);
  };

  private handleWindowBlur = (): void => {
    this.releaseAll();
  };
}

function isInputTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
