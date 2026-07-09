import type {
  PluginContext,
  AudioService,
  StorageService,
  SettingsService,
  NavigationService,
  EventBus,
  InstrumentRegistryService,
} from '@jazz/plugin-sdk';

export function createPluginContext(overrides?: Partial<PluginContext>): PluginContext {
  return {
    audio: overrides?.audio ?? ({} as AudioService),
    storage: overrides?.storage ?? ({} as StorageService),
    settings: overrides?.settings ?? ({} as SettingsService),
    navigation: overrides?.navigation ?? ({} as NavigationService),
    events: overrides?.events ?? ({} as EventBus),
    music: overrides?.music ?? {},
    query: overrides?.query ?? {},
    instruments: overrides?.instruments ?? ({} as InstrumentRegistryService),
  };
}
