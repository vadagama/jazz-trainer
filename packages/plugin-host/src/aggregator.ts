import type {
  PluginDefinition,
  RouteContribution,
  NavItemContribution,
  InstrumentContribution,
} from '@jazz/plugin-sdk';
import { instrumentManifestSchema } from '@jazz/plugin-sdk';

export interface AggregatedContributions {
  routes: (RouteContribution & { pluginId: string })[];
  navItems: (NavItemContribution & { pluginId: string })[];
  instruments: (InstrumentContribution & { pluginId: string })[];
}

export function aggregateContributions(plugins: PluginDefinition[]): AggregatedContributions {
  const routes: AggregatedContributions['routes'] = [];
  const navItems: AggregatedContributions['navItems'] = [];
  const instruments: AggregatedContributions['instruments'] = [];
  const seenInstrumentIds = new Set<string>();

  for (const plugin of plugins) {
    const c = plugin.contributes;
    if (c.routes) {
      for (const r of c.routes) {
        routes.push({ ...r, pluginId: plugin.manifest.id });
      }
    }
    if (c.navItems) {
      for (const n of c.navItems) {
        navItems.push({ ...n, pluginId: plugin.manifest.id });
      }
    }
    if (c.instruments) {
      for (const i of c.instruments) {
        instrumentManifestSchema.parse(i.manifest);
        if (seenInstrumentIds.has(i.manifest.id)) {
          throw new Error(
            `Duplicate instrument id "${i.manifest.id}" in plugin "${plugin.manifest.id}". Each instrument must have a unique id across all plugins.`,
          );
        }
        seenInstrumentIds.add(i.manifest.id);
        instruments.push({ ...i, pluginId: plugin.manifest.id });
      }
    }
  }

  return { routes, navItems, instruments };
}
