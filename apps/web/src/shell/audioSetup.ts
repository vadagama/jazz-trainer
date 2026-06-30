/**
 * Audio singleton setup for Jazz Trainer.
 *
 * Creates ToneAudioAdapter + SoloInstrumentFactories + SoloInstrumentHost
 * on first call, independently of the full transport. This enables the
 * "Test Sound" button on the Settings → MIDI tab to work without visiting
 * editor/player pages first.
 *
 * If useTransport already initialized the adapters, this is a no-op.
 *
 * `ensureAudioReady()` must be called after a user gesture
 * (browsers require user interaction to start AudioContext).
 */

import type { SoloInstrumentFactories } from '@jazz/music-core/audio';

let ready = false;
let initPromise: Promise<void> | null = null;

function getWindow() {
  return window as unknown as Record<string, unknown>;
}

export async function ensureAudioReady(): Promise<void> {
  if (ready) return;
  if (initPromise) return initPromise;

  // If transport already set up the adapters (e.g., user visited editor first),
  // mark as ready and skip.
  const w = getWindow();
  if (w.__toneAudioAdapter && w.__soloInstrumentFactories && w.__soloInstrumentHost) {
    ready = true;
    return;
  }

  initPromise = (async () => {
    const Tone = await import('tone');
    await Tone.start();

    const { ToneAudioAdapter: Adapter, createSoloInstrumentFactories } =
      await import('@jazz/tone-audio-adapter');

    const { SoloInstrumentHost: Host } = await import('@jazz/music-core/audio');

    // Only create if still missing (transport may have initialized during the async gap)
    if (!w.__toneAudioAdapter) {
      const adapter = new Adapter({ bpm: 120 });
      w.__toneAudioAdapter = adapter;
    }

    if (!w.__soloInstrumentFactories) {
      w.__soloInstrumentFactories = createSoloInstrumentFactories();
    }

    if (!w.__soloInstrumentHost) {
      const adapter = w.__toneAudioAdapter as { getSoloBus: () => unknown };
      const factories = w.__soloInstrumentFactories as SoloInstrumentFactories;
      const host = new Host(adapter.getSoloBus(), factories);
      w.__soloInstrumentHost = host;
    }

    ready = true;
  })();

  return initPromise;
}
