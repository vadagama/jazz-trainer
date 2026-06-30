/** A note scheduled for playback at a specific time. */
export interface ScheduledNote {
  /** Time in seconds from the start of playback. */
  time: number;
  /** Note name, e.g. "C4", "Eb4". */
  note: string;
  /** Duration in seconds. */
  duration: number;
  /** Velocity 0–1. */
  velocity: number;
  /** Optional voice name, e.g. "bass", "rhodes". */
  voice?: string;
}

/** A metronome click scheduled for playback. */
export interface ScheduledClick {
  /** Time in seconds from the start of playback. */
  time: number;
  /** Whether this is an accented (downbeat) click. */
  accent: boolean;
  /** Subdivision denominator, e.g. 4 for quarter notes. */
  subdivision: number;
}

/**
 * Abstraction over audio playback.
 *
 * Implementations wrap a specific audio engine (Tone.js, Web Audio, etc.)
 * and translate scheduled events into sound.
 */
export interface AudioPort {
  /** Schedule a note at the specified time. */
  scheduleNote(note: ScheduledNote): void;

  /** Schedule a metronome click at the specified time. */
  scheduleClick(click: ScheduledClick): void;

  /** Start or resume playback. */
  start(): void;

  /** Stop playback and reset position. */
  stop(): void;

  /** Current playback position in seconds. */
  readonly currentTime: number;

  /** Clear all scheduled events. */
  clear(): void;
}

/** A single MIDI input event from an external device. */
export interface MidiInputEvent {
  /** Note name, e.g. "C4". */
  note: string;
  /** Velocity 0–127. */
  velocity: number;
  /** High-resolution timestamp (performance.now() in browsers). */
  timestamp: number;
}

/** Information about a MIDI input device. */
export interface MidiDeviceInfo {
  /** Unique device ID (from Web MIDI API). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Optional manufacturer string. */
  manufacturer?: string;
}

/**
 * Abstraction over MIDI input.
 *
 * Implementations wrap Web MIDI API or other input sources.
 */
export interface InputPort {
  // ── Existing methods (unchanged) ──

  /** Register a note-on handler. Returns an unsubscribe function. */
  onNoteOn: (handler: (event: MidiInputEvent) => void) => () => void;

  /** Register a note-off handler. Returns an unsubscribe function. */
  onNoteOff: (handler: (event: MidiInputEvent) => void) => () => void;

  /** @deprecated Use {@link listInputs} instead. */
  devices: () => Promise<string[]>;

  // ── New methods (device selection, channel filter, connection status) ──

  /** List available MIDI input devices with metadata. */
  listInputs(): Promise<MidiDeviceInfo[]>;

  /**
   * Select the active input device by ID.
   * Pass `null` to listen to all devices.
   */
  selectInput(deviceId: string | null): void;

  /** ID of the currently selected input device, or `null` for all. */
  readonly activeDeviceId: string | null;

  /** Set MIDI channel filter: 0–15 or 'all'. */
  setChannelFilter(channel: number | 'all'): void;

  /** Current channel filter. */
  readonly channelFilter: number | 'all';

  /** Connection status: 'disconnected' | 'available' | 'connected'. */
  readonly connectionStatus: 'disconnected' | 'available' | 'connected';

  /** Callback on connection state change (hot-plug). Returns unsubscribe. */
  onConnectionChange(
    handler: (status: 'disconnected' | 'available' | 'connected') => void,
  ): () => void;
}
