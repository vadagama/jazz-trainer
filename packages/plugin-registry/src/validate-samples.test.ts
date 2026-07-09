/**
 * Build-time sample validator (Ф1.4).
 *
 * For every instrument contributed by a registered plugin, checks that each
 * sample file referenced by its `sampleManifest` physically exists in the asset
 * store — in BOTH the primary (aac) and fallback (mp3) formats. A broken
 * reference fails the build instead of surfacing as a runtime 404.
 *
 * Scope: registered plugin instruments (drum kits + percussion). Core-only
 * manifests (bass/piano/guitar/…) join automatically once they become plugins
 * (Ф5) — no change needed here.
 *
 * Runner: vitest (aliases + module resolution already configured). Invoked in
 * `npm run build` via `npm run validate:samples`, and also runs in `npm run test`.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import type { SampleManifest } from '@jazz/music-core';
import { PLUGINS } from './index.js';

/** Repo root → public asset store used by the web shell. */
const PUBLIC_DIR = fileURLToPath(new URL('../../../apps/web/public', import.meta.url));

const DEFAULT_SWAP: readonly [string, string] = ['.m4a', '.mp3'];

/** Collect every relative sample filename referenced by a manifest. */
function sampleFiles(sm: SampleManifest): string[] {
  const files: string[] = [];
  if (sm.oneshots) {
    for (const arr of Object.values(sm.oneshots)) files.push(...arr);
  }
  if (sm.velocityOneshots) {
    for (const layers of Object.values(sm.velocityOneshots)) {
      for (const arr of Object.values(layers)) files.push(...arr);
    }
  }
  if (sm.layers) {
    for (const notes of Object.values(sm.layers)) files.push(...Object.values(notes));
  }
  return files;
}

/** Swap the primary extension for the fallback one (default `.m4a` → `.mp3`). */
function toFallbackName(file: string, swap: readonly [string, string]): string {
  return file.endsWith(swap[0]) ? file.slice(0, -swap[0].length) + swap[1] : file;
}

interface Missing {
  instrument: string;
  format: 'aac' | 'mp3';
  path: string;
}

function collectMissing(): Missing[] {
  const missing: Missing[] = [];
  for (const plugin of PLUGINS) {
    for (const contribution of plugin.contributes?.instruments ?? []) {
      const { id, sampleManifest: sm } = contribution.manifest;
      const files = sampleFiles(sm);
      const swap = sm.formatSwap ?? DEFAULT_SWAP;

      for (const file of files) {
        const primary = join(PUBLIC_DIR, sm.baseUrl, file);
        if (!existsSync(primary)) missing.push({ instrument: id, format: 'aac', path: primary });

        if (sm.fallbackBaseUrl) {
          const fallback = join(PUBLIC_DIR, sm.fallbackBaseUrl, toFallbackName(file, swap));
          if (!existsSync(fallback)) missing.push({ instrument: id, format: 'mp3', path: fallback });
        }
      }
    }
  }
  return missing;
}

describe('sample validator', () => {
  it('every registered instrument references existing sample files (aac + mp3)', () => {
    const missing = collectMissing();
    const report = missing.map((m) => `  [${m.instrument}/${m.format}] ${m.path}`).join('\n');
    expect(missing, `Missing sample files:\n${report}`).toEqual([]);
  });

  it('at least one instrument is registered (sanity)', () => {
    const count = PLUGINS.flatMap((p) => p.contributes?.instruments ?? []).length;
    expect(count).toBeGreaterThan(0);
  });
});
