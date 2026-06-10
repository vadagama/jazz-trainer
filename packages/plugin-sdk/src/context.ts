// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AudioService {
  // порт к звуку (будет заполнен в фазе 2)
}

export interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

export interface SettingsService {
  get<T>(key: string): T;
  set<T>(key: string, value: T): void;
}

export interface NavigationService {
  push(path: string): void;
  replace(path: string): void;
}

export interface EventBus {
  on(event: string, handler: (...args: unknown[]) => void): () => void;
  emit(event: string, ...args: unknown[]): void;
}

export interface PluginContext {
  audio: AudioService;
  storage: StorageService;
  settings: SettingsService;
  navigation: NavigationService;
  events: EventBus;
  music: unknown;
  query: unknown;
}
