import { describe, it, expect } from 'vitest';
import { validateManifest, manifestSchema } from './manifest.schema';
import type { PluginManifestInput } from './manifest.schema';

const validManifest: PluginManifestInput = {
  id: 'test-plugin',
  name: 'Test Plugin',
  apiVersion: 1,
  category: 'core',
  description: 'A plugin for testing',
};

describe('validateManifest', () => {
  it('valid manifest passes validation', () => {
    expect(() => validateManifest(validManifest)).not.toThrow();
    const result = validateManifest(validManifest);
    expect(result.id).toBe('test-plugin');
    expect(result.enabled).toBe(true);
  });

  it('plugin without id throws error', () => {
    const { id: _, ...rest } = validManifest;
    expect(() => validateManifest(rest)).toThrow();
  });

  it('plugin with empty id throws error', () => {
    expect(() => validateManifest({ ...validManifest, id: '' })).toThrow();
  });

  it('plugin with empty name throws error', () => {
    expect(() => validateManifest({ ...validManifest, name: '' })).toThrow();
  });

  it('apiVersion not 1 throws error', () => {
    expect(() => manifestSchema.parse({ ...validManifest, apiVersion: 2 })).toThrow();
  });

  it('category not from enum throws error', () => {
    expect(() => manifestSchema.parse({ ...validManifest, category: 'invalid' })).toThrow();
  });

  it('enabled defaults to true', () => {
    const { enabled: _, ...rest } = validManifest;
    const result = validateManifest(rest);
    expect(result.enabled).toBe(true);
  });

  it('enabled can be set to false', () => {
    const result = validateManifest({ ...validManifest, enabled: false });
    expect(result.enabled).toBe(false);
  });
});
