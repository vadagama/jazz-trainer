/**
 * MIDI + computer keyboard singleton setup for Jazz Trainer.
 *
 * Exposes a multiplexed input port via `window.__midiInputPort`
 * that combines Web MIDI and laptop keyboard input.
 *
 * `initMidi()` must be called after a user gesture
 * (browsers require user interaction for Web MIDI API access).
 */

import { WebMidiAdapter } from '@jazz/webmidi-adapter';
import { ComputerKeyboardAdapter } from './ComputerKeyboardAdapter';
import { MuxInputPort } from './MuxInputPort';

/** Lazily import Tone so midiSetup doesn't pull it into the critical path. */
async function ensureAudioContext(): Promise<void> {
  try {
    const Tone = await import('tone');
    await Tone.start();
  } catch {
    // AudioContext resume may fail if not in user gesture — warmAudioContext handles it.
  }
}

// Singleton adapters
const midiAdapter = new WebMidiAdapter();
const keyboardAdapter = new ComputerKeyboardAdapter();

// Mux: all note events flow through this to consumers (MidiSoloProvider, visualizers, etc.)
const muxPort = new MuxInputPort(midiAdapter, [keyboardAdapter]);

// Expose to plugins via global window
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__midiInputPort = muxPort;
  (window as unknown as Record<string, unknown>).__midiInitMidi = initMidi;
  (window as unknown as Record<string, unknown>).__computerKeyboardPort = keyboardAdapter;
}

let midiInitPromise: Promise<void> | null = null;

/**
 * Initialize MIDI access.
 * Must be called after a user gesture (click, keydown, etc.).
 * Safe to call multiple times — concurrent calls share the same promise.
 */
export async function initMidi(): Promise<void> {
  if (midiInitPromise) return midiInitPromise;

  midiInitPromise = (async () => {
    await Promise.all([midiAdapter.init(), ensureAudioContext()]);
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__midiInitialized = true;
    }
  })();

  return midiInitPromise;
}
