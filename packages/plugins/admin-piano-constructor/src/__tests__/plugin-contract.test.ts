import { describe, it, expect } from 'vitest';
import { validateManifest } from '@jazz/plugin-sdk';
import plugin from '../index';

describe('Piano Constructor plugin — contract', () => {
  it('has a valid manifest', () => {
    expect(() => validateManifest(plugin.manifest)).not.toThrow();
    const manifest = validateManifest(plugin.manifest);
    expect(manifest.id).toBe('admin.piano-constructor');
    expect(manifest.apiVersion).toBe(1);
    expect(manifest.category).toBe('admin');
  });

  it('exposes the admin route guarded by content:write', () => {
    const route = plugin.contributes.routes?.find(
      (r) => r.path === '/admin/piano-constructor',
    );
    expect(route).toBeDefined();
    expect(route!.requires).toBe('content:write');
  });

  it('nav item lives in the admin section and is permission-gated', () => {
    const nav = plugin.contributes.navItems?.[0];
    expect(nav?.section).toBe('admin');
    expect(nav?.to).toBe('/admin/piano-constructor');
    expect(nav?.requires).toBe('content:write');
  });
});
