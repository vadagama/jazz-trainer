import type {
  AudioPort,
  ScheduledNote,
  ScheduledClick,
  InputPort,
  MidiInputEvent,
  MidiDeviceInfo,
} from '@jazz/music-core/audio';

// ---------------------------------------------------------------------------
// Type augmentation: Web MIDI API is not in all TS DOM libs.
// ---------------------------------------------------------------------------

declare global {
  interface Navigator {
    requestMIDIAccess(): Promise<MidiAccess>;
  }
}

// ---------------------------------------------------------------------------
// Minimal Web MIDI API types (subset used by this adapter).
// The full DOM types for Web MIDI may not be available in all TS configs,
// so we declare only what we need.
// ---------------------------------------------------------------------------

interface MidiOutput {
  send(data: number[], timestamp?: number): void;
  clear(): void;
  readonly id?: string;
  readonly name?: string;
}

interface MidiInput {
  readonly id?: string;
  readonly name?: string;
  onmidimessage: ((event: MidiMessageEvent) => void) | null;
}

interface MidiMessageEvent {
  readonly data: Uint8Array;
  readonly timeStamp: number;
  readonly target?: MidiInput;
}

interface MidiAccess {
  readonly outputs: { values(): IterableIterator<MidiOutput> };
  readonly inputs: { values(): IterableIterator<MidiInput> };
  onstatechange: (() => void) | null;
}

// ---------------------------------------------------------------------------
// MIDI helpers
// ---------------------------------------------------------------------------

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Convert note name (e.g. "C4") to MIDI note number (e.g. 60). */
function noteToMidi(note: string): number {
  const match = /^([A-G][#b]?)(\d+)$/.exec(note.trim());
  if (!match) throw new Error(`Invalid note name: "${note}"`);
  const [, name, octave] = match;
  const normalized = name!.replace('b', 'b'); // already fine
  const semitone = NOTE_NAMES.indexOf(normalized);
  if (semitone === -1) throw new Error(`Unknown note name: "${name}"`);
  return 12 * (Number(octave) + 1) + semitone;
}

/** Convert MIDI note number (e.g. 60) to note name (e.g. "C4"). */
function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  const name = NOTE_NAMES[semitone];
  if (!name) throw new Error(`Invalid MIDI note: ${midi}`);
  return `${name}${octave}`;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface WebMidiAdapterOptions {
  /** Pre-obtained MIDIAccess (bypasses requestMIDIAccess, useful for testing). */
  midiAccess?: MidiAccess;
  /** MIDI output channel (0–15, default: 0). */
  channel?: number;
  /** MIDI note number for unaccented metronome clicks (default: 76 – high wood block). */
  clickNote?: number;
  /** MIDI note number for accented metronome clicks (default: 77 – low wood block). */
  accentNote?: number;
  /** Velocity for notes (0–127, default: 100). */
  velocity?: number;
}

// ---------------------------------------------------------------------------
// Default MIDI notes for percussion (GM standard, channel 10)
// ---------------------------------------------------------------------------

const DEFAULT_CLICK_NOTE = 76; // high wood block
const DEFAULT_ACCENT_NOTE = 77; // low wood block
const DEFAULT_CHANNEL = 0;
const DEFAULT_VELOCITY = 100;

// ---------------------------------------------------------------------------
// WebMidiAdapter
// ---------------------------------------------------------------------------

/**
 * {@link AudioPort} + {@link InputPort} implementation backed by the
 * Web MIDI API (`navigator.requestMIDIAccess`).
 *
 * Schedules notes/clicks as MIDI note-on/note-off messages via
 * available MIDI outputs. Listens to MIDI inputs for live performance.
 *
 * **Important:** `init()` must be called after a user gesture
 * (browsers require user interaction to access MIDI).
 */
export class WebMidiAdapter implements AudioPort, InputPort {
  // -- state ---------------------------------------------------------------
  private access: MidiAccess | null = null;
  private outputs: MidiOutput[] = [];
  private inputs: MidiInput[] = [];
  private channel: number;
  private clickNote: number;
  private accentNote: number;
  private velocity: number;
  private initialized = false;

  // Transport clock
  private startTime = 0;
  private running = false;

  // Input handlers
  private noteOnHandlers: Array<(event: MidiInputEvent) => void> = [];
  private noteOffHandlers: Array<(event: MidiInputEvent) => void> = [];

  // -- Extended InputPort state (T-002) ------------------------------------
  private activeInputId: string | null = null;
  private channelMask: number | 'all' = 'all';
  private connectionHandlers: Array<(status: 'disconnected' | 'available' | 'connected') => void> =
    [];

  constructor(options: WebMidiAdapterOptions = {}) {
    this.channel = options.channel ?? DEFAULT_CHANNEL;
    this.clickNote = options.clickNote ?? DEFAULT_CLICK_NOTE;
    this.accentNote = options.accentNote ?? DEFAULT_ACCENT_NOTE;
    this.velocity = options.velocity ?? DEFAULT_VELOCITY;

    if (options.midiAccess) {
      this.setup(options.midiAccess);
    }
  }

  // -- Initialization ------------------------------------------------------

  /**
   * Request MIDI access from the browser.
   * Must be called after a user gesture.
   * Safe to call multiple times (idempotent once initialized).
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const access = await navigator.requestMIDIAccess();
      this.setup(access);
    } catch (err) {
      // Browser doesn't support Web MIDI, or user denied permission.
      // The adapter still satisfies the AudioPort/InputPort contract
      // (as a no-op) so exercises don't crash.
      console.warn('[WebMidiAdapter] Web MIDI not available:', err);
      this.initialized = true;
    }
  }

  private setup(access: MidiAccess): void {
    this.access = access;
    this.outputs = Array.from(access.outputs.values());
    this.inputs = Array.from(access.inputs.values());

    // Wire up MIDI input listeners
    for (const input of this.inputs) {
      input.onmidimessage = this.handleMidiMessage;
    }

    // Handle hot-plug of new devices
    access.onstatechange = () => {
      if (!this.access) return;
      this.outputs = Array.from(this.access.outputs.values());

      // Resubscribe inputs
      for (const input of this.inputs) {
        input.onmidimessage = null;
      }
      this.inputs = Array.from(this.access.inputs.values());
      for (const input of this.inputs) {
        input.onmidimessage = this.handleMidiMessage;
      }

      // Auto-switch if active device disconnected
      if (this.activeInputId && !this.inputs.some((i) => (i.id ?? '') === this.activeInputId)) {
        this.activeInputId = null;
      }

      this.notifyConnectionStatus();
    };

    this.initialized = true;
    this.notifyConnectionStatus();
  }

  // -- AudioPort -----------------------------------------------------------

  /** @inheritdoc */
  scheduleNote(note: ScheduledNote): void {
    if (this.outputs.length === 0) return;

    const midiNote = noteToMidi(note.note);
    const vel = Math.round(clamp(note.velocity, 0, 1) * 127);
    const ch = this.channel;

    const noteOnMsg = [0x90 | ch, midiNote, vel];
    const noteOffMsg = [0x80 | ch, midiNote, 0];

    const nowMs = performance.now();

    // Convert relative time (seconds from start) to absolute DOMHighResTimeStamp (ms)
    const absStartMs = (this.startTime + note.time) * 1000;
    const absEndMs = (this.startTime + note.time + note.duration) * 1000;

    for (const output of this.outputs) {
      // Only schedule if the time is in the future
      if (absStartMs > nowMs) {
        output.send(noteOnMsg, absStartMs);
      } else if (this.running) {
        // Send immediately if time is already past
        output.send(noteOnMsg);
      }
      output.send(noteOffMsg, Math.max(absEndMs, nowMs + 1));
    }
  }

  /** @inheritdoc */
  scheduleClick(click: ScheduledClick): void {
    if (this.outputs.length === 0) return;

    // Use GM percussion channel (9 = 0-indexed, MIDI channel 10)
    const drumChannel = 9;
    const noteNum = click.accent ? this.accentNote : this.clickNote;
    const vel = click.accent ? 120 : 90;

    const noteOnMsg = [0x90 | drumChannel, noteNum, vel];
    const noteOffMsg = [0x80 | drumChannel, noteNum, 0];

    const nowMs = performance.now();
    const absTimeMs = (this.startTime + click.time) * 1000;

    for (const output of this.outputs) {
      if (absTimeMs > nowMs) {
        output.send(noteOnMsg, absTimeMs);
      } else if (this.running) {
        output.send(noteOnMsg);
      }
      output.send(noteOffMsg, Math.max(absTimeMs + 100, nowMs + 101));
    }
  }

  /** @inheritdoc */
  start(): void {
    this.startTime = performance.now() / 1000;
    this.running = true;
  }

  /** @inheritdoc */
  stop(): void {
    this.running = false;
    // Send all-notes-off on all channels to silence hanging notes
    this.allNotesOff();
    this.startTime = 0;
  }

  /** @inheritdoc */
  get currentTime(): number {
    if (!this.running) return 0;
    return performance.now() / 1000 - this.startTime;
  }

  /** @inheritdoc */
  clear(): void {
    for (const output of this.outputs) {
      output.clear();
    }
    this.allNotesOff();
  }

  // -- InputPort (core) ----------------------------------------------------

  /** @inheritdoc */
  onNoteOn(handler: (event: MidiInputEvent) => void): () => void {
    this.noteOnHandlers.push(handler);
    return () => {
      const idx = this.noteOnHandlers.indexOf(handler);
      if (idx !== -1) this.noteOnHandlers.splice(idx, 1);
    };
  }

  /** @inheritdoc */
  onNoteOff(handler: (event: MidiInputEvent) => void): () => void {
    this.noteOffHandlers.push(handler);
    return () => {
      const idx = this.noteOffHandlers.indexOf(handler);
      if (idx !== -1) this.noteOffHandlers.splice(idx, 1);
    };
  }

  /** @inheritdoc */
  async devices(): Promise<string[]> {
    if (!this.access) return [];
    return Array.from(this.access.inputs.values()).map((input) => input.name ?? 'Unnamed');
  }

  // -- Extended InputPort (T-002) ------------------------------------------

  async listInputs(): Promise<MidiDeviceInfo[]> {
    if (!this.access) return [];
    return Array.from(this.access.inputs.values()).map((input) => ({
      id: input.id ?? '',
      name: input.name ?? 'Unnamed',
      manufacturer: undefined,
    }));
  }

  selectInput(deviceId: string | null): void {
    this.activeInputId = deviceId;
    this.notifyConnectionStatus();
  }

  get activeDeviceId(): string | null {
    return this.activeInputId;
  }

  setChannelFilter(channel: number | 'all'): void {
    if (channel !== 'all' && (channel < 0 || channel > 15)) {
      throw new Error(`Invalid MIDI channel: ${channel}. Must be 0–15 or 'all'.`);
    }
    this.channelMask = channel;
  }

  get channelFilter(): number | 'all' {
    return this.channelMask;
  }

  get connectionStatus(): 'disconnected' | 'available' | 'connected' {
    if (this.inputs.length === 0) return 'disconnected';
    if (this.activeInputId !== null) {
      return this.inputs.some((i) => (i.id ?? '') === this.activeInputId)
        ? 'connected'
        : 'available';
    }
    return 'available';
  }

  onConnectionChange(
    handler: (status: 'disconnected' | 'available' | 'connected') => void,
  ): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      const idx = this.connectionHandlers.indexOf(handler);
      if (idx !== -1) this.connectionHandlers.splice(idx, 1);
    };
  }

  // -- Internal ------------------------------------------------------------

  private notifyConnectionStatus(): void {
    const status = this.connectionStatus;
    for (const handler of this.connectionHandlers) {
      handler(status);
    }
  }

  private handleMidiMessage = (event: MidiMessageEvent): void => {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0]!;
    const channel = status & 0x0f;

    // Filter by channel
    if (this.channelMask !== 'all' && channel !== this.channelMask) return;

    // Filter by device ID
    if (this.activeInputId !== null && event.target) {
      const deviceId = event.target.id ?? '';
      if (deviceId !== this.activeInputId) return;
    }

    const note = data[1]!;
    const velocity = data[2]!;

    const command = status & 0xf0;

    const midiEvent: MidiInputEvent = {
      note: midiToNote(note),
      midiNote: note,
      velocity,
      timestamp: event.timeStamp,
    };

    if (command === 0x90 && velocity > 0) {
      // Note On
      for (const handler of this.noteOnHandlers) {
        handler(midiEvent);
      }
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      // Note Off (some devices send note-on with velocity 0 instead of note-off)
      for (const handler of this.noteOffHandlers) {
        handler(midiEvent);
      }
    }
  };

  private allNotesOff(): void {
    for (const output of this.outputs) {
      for (let ch = 0; ch < 16; ch++) {
        // All Notes Off (CC 123)
        output.send([0xb0 | ch, 123, 0]);
        // All Sound Off (CC 120)
        output.send([0xb0 | ch, 120, 0]);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
