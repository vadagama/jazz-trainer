import { describe, it, expect, vi } from 'vitest';
import { loadPlugins } from '../loader';
import { aggregateContributions } from '../aggregator';
import { createPluginContext } from '../context-factory';
import { definePlugin } from '@jazz/plugin-sdk';
import type { PluginDefinition } from '@jazz/plugin-sdk';

const ctx = createPluginContext();

function makePlugin(id: string, overrides?: Partial<PluginDefinition>): PluginDefinition {
  return definePlugin({
    manifest: {
      id,
      name: id,
      apiVersion: 1,
      category: 'core',
      description: `Plugin ${id}`,
    },
    contributes: {
      routes: [{ path: `/${id}`, element: async () => ({ default: () => null }) }],
      navItems: [{ section: 'main', label: id, to: `/${id}` }],
    },
    ...overrides,
  });
}

describe('loadPlugins', () => {
  it('loads a list of plugins without errors', () => {
    const { loaded, errors } = loadPlugins([makePlugin('a'), makePlugin('b')], ctx);
    expect(errors).toEqual([]);
    expect(loaded).toHaveLength(2);
  });

  it('duplicate id causes error', () => {
    const { loaded, errors } = loadPlugins([makePlugin('a'), makePlugin('a')], ctx);
    expect(errors).toContain('Duplicate plugin id: a');
    expect(loaded).toHaveLength(1);
  });

  it('plugin missing manifest.id causes error', () => {
    const bad = definePlugin({
      manifest: {
        id: '',
        name: 'x',
        apiVersion: 1,
        category: 'core',
        description: 'x',
      },
      contributes: {},
    });
    const { errors, loaded } = loadPlugins([bad], ctx);
    expect(errors).toContain('Plugin missing manifest.id');
    expect(loaded).toHaveLength(0);
  });

  it('setup is called for each plugin', () => {
    const setupA = vi.fn();
    const setupB = vi.fn();
    loadPlugins([makePlugin('a', { setup: setupA }), makePlugin('b', { setup: setupB })], ctx);
    expect(setupA).toHaveBeenCalledTimes(1);
    expect(setupB).toHaveBeenCalledTimes(1);
  });

  it('disabled plugin is skipped', () => {
    const disabled = makePlugin('disabled', {
      manifest: {
        id: 'disabled',
        name: 'disabled',
        apiVersion: 1,
        category: 'core',
        description: 'x',
        enabled: false,
      },
    });
    const { loaded } = loadPlugins([disabled], ctx);
    expect(loaded).toHaveLength(0);
  });

  it('setup failure is caught and reported', () => {
    const failing = makePlugin('failing', {
      setup: () => {
        throw new Error('boom');
      },
    });
    const { loaded, errors } = loadPlugins([failing], ctx);
    expect(loaded).toHaveLength(0);
    expect(errors[0]).toContain('Plugin failing setup failed: Error: boom');
  });
});

describe('aggregateContributions', () => {
  it('collects routes and navItems from plugins', () => {
    const { routes, navItems } = aggregateContributions([makePlugin('a'), makePlugin('b')]);
    expect(routes).toHaveLength(2);
    expect(routes[0]!.pluginId).toBe('a');
    expect(routes[0]!.path).toBe('/a');
    expect(routes[1]!.pluginId).toBe('b');

    expect(navItems).toHaveLength(2);
    expect(navItems[0]!.pluginId).toBe('a');
    expect(navItems[1]!.pluginId).toBe('b');
  });

  it('plugin without routes does not break aggregation', () => {
    const plugin = definePlugin({
      manifest: {
        id: 'no-routes',
        name: 'no-routes',
        apiVersion: 1,
        category: 'core',
        description: 'x',
      },
      contributes: {},
    });
    const { routes, navItems } = aggregateContributions([plugin]);
    expect(routes).toHaveLength(0);
    expect(navItems).toHaveLength(0);
  });

  it('plugin without navItems still contributes routes', () => {
    const plugin = definePlugin({
      manifest: {
        id: 'routes-only',
        name: 'routes-only',
        apiVersion: 1,
        category: 'core',
        description: 'x',
      },
      contributes: {
        routes: [{ path: '/x', element: async () => ({ default: () => null }) }],
      },
    });
    const { routes, navItems } = aggregateContributions([plugin]);
    expect(routes).toHaveLength(1);
    expect(navItems).toHaveLength(0);
  });
});

describe('createPluginContext', () => {
  it('returns a context with all services defined', () => {
    const ctx = createPluginContext();
    expect(ctx.audio).toBeDefined();
    expect(ctx.storage).toBeDefined();
    expect(ctx.settings).toBeDefined();
    expect(ctx.navigation).toBeDefined();
    expect(ctx.events).toBeDefined();
    expect(ctx.music).toBeDefined();
    expect(ctx.query).toBeDefined();
  });

  it('accepts overrides', () => {
    const customNav = { push: vi.fn(), replace: vi.fn() };
    const ctx = createPluginContext({ navigation: customNav });
    expect(ctx.navigation).toBe(customNav);
  });
});
