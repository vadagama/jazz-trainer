/**
 * Bootstrap: загружает плагины из реестра и агрегирует вклады.
 * В фазе 3 App.tsx будет использовать агрегированные роуты напрямую.
 */
import { PLUGINS } from '@jazz/plugin-registry';
import { loadPlugins, aggregateContributions, createPluginContext } from '@jazz/plugin-host';
import { builtinCorePlugin } from './builtin-plugins';

const allPlugins = [builtinCorePlugin, ...PLUGINS];

const ctx = createPluginContext();

const { loaded, errors } = loadPlugins(allPlugins, ctx);

if (errors.length > 0) {
  console.warn('[plugin-host] Load errors:', errors);
}

export const contributions = aggregateContributions(loaded);
