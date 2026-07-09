import type { InstrumentFamily } from '@jazz/music-core';

export interface InstrumentInfo {
  id: string;
  name: string;
  family: InstrumentFamily;
  icon?: string;
  settingsPrefix: string;
  sounds?: readonly string[];
}

export interface InstrumentRegistryService {
  list(family?: InstrumentFamily): InstrumentInfo[];
  get(id: string): InstrumentInfo | undefined;
  resolveDefaults(id: string, style: string): Record<string, unknown>;
}

export interface AudioService {
  /** Audio playback port (Tone.js, MIDI, etc.). */
  audioPort?: unknown;
  /** MIDI input port (Web MIDI, native, etc.). */
  inputPort?: unknown;
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
  instruments: InstrumentRegistryService;
}
