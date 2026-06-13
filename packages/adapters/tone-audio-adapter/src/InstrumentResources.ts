import * as Tone from 'tone';
import type { SampleManifest } from '@jazz/music-core/audio';

// ─── Resource containers ─────────────────────────────────────────────────────

/** Tone.js resources created for a pitched instrument (bass, rhodes, guitar, …). */
export interface PitchedInstrumentResources {
  /** layerName → Tone.Sampler (one per layer declared in the manifest). */
  samplers: Map<string, Tone.Sampler>;
  /** Release all Tone.js resources. Call on unmount. */
  dispose(): void;
}

/** Tone.js resources created for an unpitched / percussion instrument (drums, …). */
export interface OneshotInstrumentResources {
  /** soundName → Tone.Player[] (one Tone.Player per round-robin variant). */
  players: Map<string, Tone.Player[]>;
  /** Release all Tone.js resources. Call on unmount. */
  dispose(): void;
}

// ─── Factories ───────────────────────────────────────────────────────────────

/**
 * Create Tone.Sampler instances from a pitched instrument's {@link SampleManifest}.
 *
 * Each entry in `manifest.layers` becomes one `Tone.Sampler`.
 * The **caller** is responsible for connecting samplers to the audio graph
 * (channels, effects, destination).
 *
 * @example
 * ```ts
 * const { samplers, dispose } = createPitchedResources(bassManifest.sampleManifest);
 * for (const s of samplers.values()) s.connect(bassChannel);
 * ```
 */
export function createPitchedResources(manifest: SampleManifest): PitchedInstrumentResources {
  const samplers = new Map<string, Tone.Sampler>();

  if (manifest.layers) {
    for (const [layerName, noteMap] of Object.entries(manifest.layers)) {
      const sampler = new Tone.Sampler({
        urls: noteMap,
        baseUrl: manifest.baseUrl,
        release: manifest.release ?? 1.0,
      });
      samplers.set(layerName, sampler);
    }
  }

  return {
    samplers,
    dispose: () => {
      for (const sampler of samplers.values()) sampler.dispose();
      samplers.clear();
    },
  };
}

/**
 * Create Tone.Player instances from an unpitched instrument's {@link SampleManifest}.
 *
 * Each entry in `manifest.oneshots` becomes an array of `Tone.Player`
 * (one per round-robin variant). The **caller** connects them to the graph.
 *
 * @example
 * ```ts
 * const { players, dispose } = createOneshotResources(drumsManifest.sampleManifest);
 * for (const [sound, arr] of players) {
 *   const ch = new Tone.Channel().connect(master);
 *   for (const p of arr) p.connect(ch);
 * }
 * ```
 */
export function createOneshotResources(manifest: SampleManifest): OneshotInstrumentResources {
  const players = new Map<string, Tone.Player[]>();

  if (manifest.oneshots) {
    for (const [sound, files] of Object.entries(manifest.oneshots)) {
      const playerArray = files.map((file) => new Tone.Player(`${manifest.baseUrl}${file}`));
      players.set(sound, playerArray);
    }
  }

  return {
    players,
    dispose: () => {
      for (const arr of players.values()) {
        for (const p of arr) p.dispose();
      }
      players.clear();
    },
  };
}
