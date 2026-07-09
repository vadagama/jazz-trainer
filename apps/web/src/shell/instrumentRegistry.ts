/**
 * Live instrument registry — derived from aggregated plugin contributions.
 *
 * Single source of truth for the shell: instruments are resolved by `id` from
 * `contributions.instruments`, never imported plugin-by-plugin. Adding a new
 * instrument plugin therefore requires no shell changes (see
 * docs/INSTRUMENT-PLUGIN.md).
 */
import type {
  InstrumentContribution,
  InstrumentInfo,
  InstrumentRegistryService,
} from '@jazz/plugin-sdk';
import type { InstrumentFamily } from '@jazz/music-core';
import { resolveInstrumentDefaults } from '@jazz/music-core';
import type { AggregatedContributions } from '@jazz/plugin-host';

export type InstrumentEntry = InstrumentContribution & { pluginId: string };

let BY_ID = new Map<string, InstrumentEntry>();

function entryToInfo(e: InstrumentEntry): InstrumentInfo {
  return {
    id: e.manifest.id,
    name: e.manifest.name,
    family: e.manifest.family,
    icon: e.manifest.icon,
    settingsPrefix: e.manifest.settingsPrefix,
    sounds: e.manifest.sounds,
  };
}

/** Default drum kit used when a `drumKit` setting is missing or unknown. */
export const DEFAULT_DRUM_KIT_ID = 'jazz-drum-kit';

/** Resolve any contributed instrument by its manifest id. */
export function getInstrument(id: string | undefined): InstrumentEntry | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/**
 * Resolve a drum-kit contribution by `drumKit` setting, falling back to the
 * default kit (and then to the first contributed instrument) so the transport
 * always has a manifest to load.
 */
export function resolveDrumKit(drumKit: string | undefined): InstrumentEntry {
  return getInstrument(drumKit) ?? getInstrument(DEFAULT_DRUM_KIT_ID) ?? [...BY_ID.values()][0]!;
}

/** Kit-specific articulation map (abstract sound role → concrete sample key). */
export function drumArticulationMap(drumKit: string | undefined): Record<string, string> {
  return resolveDrumKit(drumKit).articulationMap ?? {};
}

/** Build the SDK-facing InstrumentRegistryService and populate the internal map. */
export function createInstrumentRegistry(
  contributions: AggregatedContributions,
): InstrumentRegistryService {
  const map = new Map<string, InstrumentEntry>();
  for (const inst of contributions.instruments) {
    map.set(inst.manifest.id, inst);
  }
  BY_ID = map;

  return {
    list(family?: InstrumentFamily): InstrumentInfo[] {
      const entries = [...BY_ID.values()].map(entryToInfo);
      return family ? entries.filter((e) => e.family === family) : entries;
    },
    get(id: string): InstrumentInfo | undefined {
      return getInstrument(id) ? entryToInfo(getInstrument(id)!) : undefined;
    },
    resolveDefaults(id: string, style: string): Record<string, unknown> {
      const entry = getInstrument(id);
      if (!entry) return {};
      return resolveInstrumentDefaults(entry.manifest, style as never);
    },
  };
}
