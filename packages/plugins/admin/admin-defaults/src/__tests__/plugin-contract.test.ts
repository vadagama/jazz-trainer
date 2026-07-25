import { describe, it, expect } from 'vitest';
import { validateManifest } from '@jazz/plugin-sdk';
import plugin from '../index';

describe('admin-defaults — contract', () => {
  it('has a valid manifest', () => {
    expect(() => validateManifest(plugin.manifest)).not.toThrow();
    const m = validateManifest(plugin.manifest);
    expect(m.id).toBe('admin.defaults');
    expect(m.apiVersion).toBe(1);
    expect(m.category).toBe('admin');
  });

  it('defines exactly one route with requires', () => {
    expect(plugin.contributes.routes).toHaveLength(1);
    expect(plugin.contributes.routes![0]!.path).toBe('/admin/defaults');
    expect(plugin.contributes.routes![0]!.requires).toBe('system:settings:read');
  });

  it('navItems have required fields', () => {
    expect(plugin.contributes.navItems).toHaveLength(1);
    expect(plugin.contributes.navItems![0]!.section).toBe('admin');
    expect(plugin.contributes.navItems![0]!.to).toBe('/admin/defaults');
    expect(plugin.contributes.navItems![0]!.requires).toBe('system:settings:read');
  });
});
