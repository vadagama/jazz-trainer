import type { PluginDefinition, PluginContext } from '@jazz/plugin-sdk';

export function loadPlugins(
  plugins: PluginDefinition[],
  ctx: PluginContext,
): { loaded: PluginDefinition[]; errors: string[] } {
  const seen = new Set<string>();
  const errors: string[] = [];
  const loaded: PluginDefinition[] = [];

  for (const plugin of plugins) {
    if (!plugin.manifest?.id) {
      errors.push('Plugin missing manifest.id');
      continue;
    }
    if (seen.has(plugin.manifest.id)) {
      errors.push(`Duplicate plugin id: ${plugin.manifest.id}`);
      continue;
    }
    seen.add(plugin.manifest.id);

    if (plugin.manifest.enabled === false) {
      continue;
    }

    try {
      plugin.setup?.(ctx);
      loaded.push(plugin);
    } catch (e) {
      errors.push(`Plugin ${plugin.manifest.id} setup failed: ${String(e)}`);
    }
  }

  return { loaded, errors };
}
