import { describe, it, expect } from 'vitest';
import { instrumentManifestSchema } from './instrumentManifest.schema';

describe('instrumentManifestSchema', () => {
  const validManifest = {
    id: 'test-kit',
    name: 'Test Kit',
    family: 'drums' as const,
    settingsPrefix: 'drums',
    createInstrument: () => ({}),
    sampleManifest: {
      baseUrl: '/samples/test/',
      oneshots: { kick: ['kick_rr1.m4a'] },
    },
    defaultSettings: { enabled: true, volume: 0.7 },
    perStyleDefaults: { swing: { pattern: 'swing' } },
    sounds: ['kick', 'snare'],
  };

  it('accepts a valid manifest', () => {
    expect(() => instrumentManifestSchema.parse(validManifest)).not.toThrow();
  });

  it('rejects missing id', () => {
    const { id: _id, ...rest } = validManifest;
    expect(() => instrumentManifestSchema.parse(rest)).toThrow();
  });

  it('rejects empty id', () => {
    expect(() => instrumentManifestSchema.parse({ ...validManifest, id: '' })).toThrow();
  });

  it('rejects missing name', () => {
    const { name: _name, ...rest } = validManifest;
    expect(() => instrumentManifestSchema.parse(rest)).toThrow();
  });

  it('rejects invalid family', () => {
    expect(() => instrumentManifestSchema.parse({ ...validManifest, family: 'invalid' })).toThrow();
  });

  it('rejects missing settingsPrefix', () => {
    const { settingsPrefix: _sp, ...rest } = validManifest;
    expect(() => instrumentManifestSchema.parse(rest)).toThrow();
  });

  it('rejects missing createInstrument', () => {
    const { createInstrument: _ci, ...rest } = validManifest;
    expect(() => instrumentManifestSchema.parse(rest)).toThrow();
  });

  it('accepts optional fields missing', () => {
    const { defaultSettings: _ds, perStyleDefaults: _psd, sounds: _s, ...minimal } = validManifest;
    expect(() => instrumentManifestSchema.parse(minimal)).not.toThrow();
  });

  it('accepts optional icon', () => {
    expect(() => instrumentManifestSchema.parse({ ...validManifest, icon: 'drum' })).not.toThrow();
  });

  it('rejects missing sampleManifest', () => {
    const { sampleManifest: _sm, ...rest } = validManifest;
    expect(() => instrumentManifestSchema.parse(rest)).toThrow();
  });

  it('rejects sampleManifest without baseUrl', () => {
    expect(() =>
      instrumentManifestSchema.parse({
        ...validManifest,
        sampleManifest: { oneshots: {} },
      }),
    ).toThrow();
  });
});
