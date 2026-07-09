import { describe, it, expect } from 'vitest';
import { validateManifest } from '@jazz/plugin-sdk';
import plugin from '../index';

describe('theory-scales — contract', () => {
  it('has a valid manifest', () => {
    expect(() => validateManifest(plugin.manifest)).not.toThrow();
    const m = validateManifest(plugin.manifest);
    expect(m.id).toBe('theory.scales');
    expect(m.apiVersion).toBe(1);
  });
  it('defines at least one route', () => {
    expect(plugin.contributes.routes?.length).toBeGreaterThanOrEqual(1);
  });
  it('route paths start with /', () => {
    for (const r of plugin.contributes.routes ?? []) {
      expect(r.path).toMatch(/^\//);
    }
  });
  it('plugin has expected shape', () => {
    expect(plugin).toHaveProperty('manifest');
    expect(plugin).toHaveProperty('contributes');
  });
});
