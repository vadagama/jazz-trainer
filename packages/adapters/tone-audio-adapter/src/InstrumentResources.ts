import * as Tone from 'tone';
import type { SampleManifest } from '@jazz/music-core/audio';
import { effectiveFormat, type AudioFormat } from '@jazz/shared';

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

// ─── Format fallback ─────────────────────────────────────────────────────────

/** Default extension swap: .m4a → .mp3. */
const DEFAULT_FORMAT_SWAP: readonly [string, string] = ['.m4a', '.mp3'];

/** Resolve effective base URL, applying fallback if needed. */
function effectiveBaseUrl(manifest: SampleManifest, preferred?: AudioFormat | null): string {
  if (effectiveFormat(preferred) !== 'aac' && manifest.fallbackBaseUrl) {
    return manifest.fallbackBaseUrl;
  }
  return manifest.baseUrl;
}

/** Replace primary extension → fallback extension in every filename across a layer map. */
function applyExtensionFallback<T extends Record<string, Record<string, string>>>(
  layers: T,
  useFallback: boolean,
  manifest: SampleManifest,
): T {
  if (!useFallback) return layers;
  const [fromExt, toExt] = manifest.formatSwap ?? DEFAULT_FORMAT_SWAP;
  const result = {} as Record<string, Record<string, string>>;
  for (const [layerName, noteMap] of Object.entries(layers)) {
    const mapped: Record<string, string> = {};
    for (const [note, file] of Object.entries(noteMap)) {
      mapped[note] = file.replace(new RegExp(`${escapeRegExp(fromExt)}$`), toExt);
    }
    result[layerName] = mapped;
  }
  return result as T;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Percent-encode a sample filename for use in a URL.
 *
 * Tone.js loads buffers via `fetch(baseUrl + url)` without any encoding, so a
 * `#` in a filename (e.g. sharp-note guitar samples like `G#5_s6_01.m4a`) is
 * treated by the browser as a URL fragment: the request is truncated at `#`,
 * returns 404, and `decodeAudioData` then throws `EncodingError`. Encoding each
 * path segment (keeping `/` separators intact) turns `#` into `%23`, which the
 * dev/prod server decodes back to the real filename. Regular filenames are
 * unaffected — `encodeURIComponent` leaves letters, digits, `_`, `.`, `-` as-is.
 */
function encodeSampleFilename(file: string): string {
  return file.split('/').map(encodeURIComponent).join('/');
}

// ─── Factories ───────────────────────────────────────────────────────────────

/**
 * Create Tone.Sampler instances from a pitched instrument's {@link SampleManifest}.
 *
 * Each entry in `manifest.layers` becomes one `Tone.Sampler`.
 * The **caller** is responsible for connecting samplers to the audio graph
 * (channels, effects, destination).
 *
 * Automatically falls back to MP3 if AAC is unsupported by the browser.
 *
 * @example
 * ```ts
 * const { samplers, dispose } = createPitchedResources(bassManifest.sampleManifest);
 * for (const s of samplers.values()) s.connect(bassChannel);
 * ```
 */
/** Detect whether fallback format should be used for this manifest. */
function shouldUseFallback(manifest: SampleManifest, preferred?: AudioFormat | null): boolean {
  return effectiveFormat(preferred) !== 'aac' && !!manifest.fallbackBaseUrl;
}

export function createPitchedResources(
  manifest: SampleManifest,
  preferredFormat?: AudioFormat | null,
): PitchedInstrumentResources {
  const samplers = new Map<string, Tone.Sampler>();
  const baseUrl = effectiveBaseUrl(manifest, preferredFormat);
  const useFallback = shouldUseFallback(manifest, preferredFormat);

  if (manifest.layers) {
    const layers = useFallback
      ? applyExtensionFallback(manifest.layers, true, manifest)
      : manifest.layers;

    for (const [layerName, noteMap] of Object.entries(layers)) {
      // Encode filenames so `#` (sharp notes) survives Tone's un-encoded fetch.
      const encodedUrls: Record<string, string> = {};
      for (const [note, file] of Object.entries(noteMap)) {
        encodedUrls[note] = encodeSampleFilename(file);
      }
      const sampler = new Tone.Sampler({
        urls: encodedUrls,
        baseUrl,
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
 * Automatically falls back to MP3 if AAC is unsupported by the browser.
 *
 * @example
 * ```ts
 * const { players, dispose } = createOneshotResources(jazzDrumKitManifest.sampleManifest);
 * for (const [sound, arr] of players) {
 *   const ch = new Tone.Channel().connect(master);
 *   for (const p of arr) p.connect(ch);
 * }
 * ```
 */
export function createOneshotResources(
  manifest: SampleManifest,
  preferredFormat?: AudioFormat | null,
): OneshotInstrumentResources {
  const players = new Map<string, Tone.Player[]>();
  const baseUrl = effectiveBaseUrl(manifest, preferredFormat);
  const useFallback = shouldUseFallback(manifest, preferredFormat);

  if (manifest.oneshots) {
    for (const [sound, files] of Object.entries(manifest.oneshots)) {
      const [fromExt, toExt] = manifest.formatSwap ?? DEFAULT_FORMAT_SWAP;
      const resolvedFiles = useFallback
        ? files.map((f) => f.replace(new RegExp(`${escapeRegExp(fromExt)}$`), toExt))
        : files;
      const playerArray = resolvedFiles.map(
        (file) => new Tone.Player(`${baseUrl}${encodeSampleFilename(file)}`),
      );
      players.set(sound, playerArray);
    }
  }

  // Load multi-velocity oneshots: flatten each sound×layer into the players map.
  // All velocity layers for a sound are concatenated; velocity nuance is handled
  // by per-event player volume rather than sample selection.
  if (manifest.velocityOneshots) {
    for (const [sound, layers] of Object.entries(manifest.velocityOneshots)) {
      const allFiles: string[] = [];
      for (const files of Object.values(layers)) {
        allFiles.push(...files);
      }
      if (allFiles.length > 0) {
        const [fromExt, toExt] = manifest.formatSwap ?? DEFAULT_FORMAT_SWAP;
        const resolvedFiles = useFallback
          ? allFiles.map((f) => f.replace(new RegExp(`${escapeRegExp(fromExt)}$`), toExt))
          : allFiles;
        const playerArray = resolvedFiles.map(
          (file) => new Tone.Player(`${baseUrl}${encodeSampleFilename(file)}`),
        );
        players.set(sound, playerArray);
      }
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
