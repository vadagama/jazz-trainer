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

/**
 * Abstraction over MIDI input.
 *
 * Implementations wrap Web MIDI API or other input sources.
 */
export interface InputPort {
  /** Register a note-on handler. Returns an unsubscribe function. */
  onNoteOn: (handler: (event: MidiInputEvent) => void) => () => void;

  /** Register a note-off handler. Returns an unsubscribe function. */
  onNoteOff: (handler: (event: MidiInputEvent) => void) => () => void;

  /** List available MIDI input device names. */
  devices: () => Promise<string[]>;
}
