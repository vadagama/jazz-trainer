import type {
  PluginDefinition,
  RouteContribution,
  NavItemContribution,
} from '@jazz/plugin-sdk';

export interface AggregatedContributions {
  routes: (RouteContribution & { pluginId: string })[];
  navItems: (NavItemContribution & { pluginId: string })[];
}

export function aggregateContributions(
  plugins: PluginDefinition[],
): AggregatedContributions {
  const routes: AggregatedContributions['routes'] = [];
  const navItems: AggregatedContributions['navItems'] = [];

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
  }

  return { routes, navItems };
}
