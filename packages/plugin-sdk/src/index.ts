export { manifestSchema, validateManifest } from './manifest.schema';
export type { PluginManifest, PluginManifestInput } from './manifest.schema';

export type {
  RouteContribution,
  NavItemContribution,
  CommandContribution,
  ActivityContribution,
  PluginContributions,
} from './extension-points';

export type {
  AudioService,
  StorageService,
  SettingsService,
  NavigationService,
  EventBus,
  PluginContext,
} from './context';

export type { ActivityType, ActivityState, ActivityResult, ActivityDefinition } from './activity';

export { definePlugin } from './definePlugin';
export type { PluginDefinition } from './definePlugin';
