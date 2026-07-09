/**
 * Bootstrap: загружает плагины из реестра и агрегирует вклады.
 */
import { PLUGINS } from '@jazz/plugin-registry';
import { loadPlugins, aggregateContributions, createPluginContext } from '@jazz/plugin-host';
import { builtinCorePlugin } from './builtin-plugins';
import { createInstrumentRegistry } from './instrumentRegistry';

const allPlugins = [builtinCorePlugin, ...PLUGINS];

const ctx = createPluginContext();

const { loaded, errors } = loadPlugins(allPlugins, ctx);

if (errors.length > 0) {
  console.warn('[plugin-host] Load errors:', errors);
}

export const contributions = aggregateContributions(loaded);

// Wire instruments into ctx *after* aggregation so registry has data.
export const instrumentRegistry = createInstrumentRegistry(contributions);
ctx.instruments = instrumentRegistry;
