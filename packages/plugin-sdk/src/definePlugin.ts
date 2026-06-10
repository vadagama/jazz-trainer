import type { PluginManifestInput } from './manifest.schema';
import type { PluginContributions } from './extension-points';
import type { PluginContext } from './context';

export interface PluginDefinition {
  manifest: PluginManifestInput;
  contributes: PluginContributions;
  setup?: (ctx: PluginContext) => void | Promise<void>;
  dispose?: () => void;
}

export function definePlugin(def: PluginDefinition): PluginDefinition {
  return def;
}
