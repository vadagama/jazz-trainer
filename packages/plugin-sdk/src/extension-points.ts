import type { InstrumentManifest } from '@jazz/music-core';

export interface RouteContribution {
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: () => Promise<any>; // lazy import of a route component
  requires?: string; // permission (для фазы R)
}

/**
 * Contribution of an instrument (e.g. a drum kit) from a plugin.
 *
 * - `manifest` — full instrument metadata: id, name, sample layout, defaults,
 *   per-style overrides. Hosts use it to load samples and resolve settings.
 * - `articulationMap` — optional kit-specific mapping of abstract sound roles
 *   (e.g. `bassDrum`, `snare`) to concrete articulation keys (e.g. `kick`,
 *   `snare_center`) understood by the manifest's sample registry.
 */
export interface InstrumentContribution {
  manifest: InstrumentManifest;
  articulationMap?: Record<string, string>;
}

export interface NavItemContribution {
  section: string;
  label: string;
  to: string;
  icon?: string;
  requires?: string;
}

export interface CommandContribution {
  id: string;
  label: string;
  requires?: string;
  run: (ctx: unknown) => void | Promise<void>;
}

export interface ActivityContribution {
  id: string;
  type: 'lesson' | 'exercise' | 'assessment';
}

export interface PluginContributions {
  routes?: RouteContribution[];
  navItems?: NavItemContribution[];
  commands?: CommandContribution[];
  lessons?: ActivityContribution[];
  exercises?: ActivityContribution[];
  assessments?: ActivityContribution[];
  instruments?: InstrumentContribution[];
  generators?: unknown[];
  theoryProviders?: unknown[];
  settingsSchema?: Record<string, unknown>;
}
