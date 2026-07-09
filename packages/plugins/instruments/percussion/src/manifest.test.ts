import { describe, it, expect } from 'vitest';
import { resolveInstrumentDefaults } from '@jazz/music-core';
import { validateInstrumentManifest } from '@jazz/plugin-sdk';
import { percussionManifest } from './manifest.js';
import type { Style } from '@jazz/shared';

const ALL_STYLES: Style[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

describe('percussionManifest', () => {
  it('passes schema validation', () => {
    expect(() => validateInstrumentManifest(percussionManifest)).not.toThrow();
  });
});

describe('percussionManifest per-style defaults', () => {
  it('swing disabled by default', () => {
    const result = resolveInstrumentDefaults(percussionManifest, 'swing');
    expect(result.enabled).toBe(false);
  });

  it('bossa uses bossa-default organism, enabled by default', () => {
    const result = resolveInstrumentDefaults(percussionManifest, 'bossa');
    expect(result.organismId).toBe('bossa-default');
    expect(result.enabled).toBe(true);
  });

  it('funk uses funk-default organism, enabled by default', () => {
    const result = resolveInstrumentDefaults(percussionManifest, 'funk');
    expect(result.organismId).toBe('funk-default');
    expect(result.enabled).toBe(true);
  });

  it('latin uses latin-default organism, enabled by default', () => {
    const result = resolveInstrumentDefaults(percussionManifest, 'latin');
    expect(result.organismId).toBe('latin-default');
    expect(result.enabled).toBe(true);
  });

  it('ballad disabled by default', () => {
    const result = resolveInstrumentDefaults(percussionManifest, 'ballad');
    expect(result.enabled).toBe(false);
  });

  it('has perStyleDefaults for every style', () => {
    expect(percussionManifest.perStyleDefaults).toBeDefined();
    for (const style of ALL_STYLES) {
      expect(percussionManifest.perStyleDefaults?.[style], `style ${style}`).toBeDefined();
    }
  });
});
