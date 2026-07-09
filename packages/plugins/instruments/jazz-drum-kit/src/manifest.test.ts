import { describe, it, expect } from 'vitest';
import { resolveInstrumentDefaults } from '@jazz/music-core';
import { validateInstrumentManifest } from '@jazz/plugin-sdk';
import { jazzDrumKitManifest } from './manifest.js';
import type { Style } from '@jazz/shared';

const ALL_STYLES: Style[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

describe('jazzDrumKitManifest', () => {
  it('passes schema validation', () => {
    expect(() => validateInstrumentManifest(jazzDrumKitManifest)).not.toThrow();
  });
});

describe('jazzDrumKitManifest per-style defaults', () => {
  it('swing uses swing pattern', () => {
    const result = resolveInstrumentDefaults(jazzDrumKitManifest, 'swing');
    expect(result.pattern).toBe('swing');
  });

  it('bossa uses bossa pattern, snare off, rim on', () => {
    const result = resolveInstrumentDefaults(jazzDrumKitManifest, 'bossa');
    expect(result.pattern).toBe('bossa');
    expect(result.snareEnabled).toBe(false);
    expect(result.rimEnabled).toBe(true);
  });

  it('funk uses funk pattern', () => {
    const result = resolveInstrumentDefaults(jazzDrumKitManifest, 'funk');
    expect(result.pattern).toBe('funk');
  });

  it('latin uses funk pattern (closest approximation)', () => {
    const result = resolveInstrumentDefaults(jazzDrumKitManifest, 'latin');
    expect(result.pattern).toBe('funk');
  });

  it('ballad uses swing pattern with lower volume', () => {
    const result = resolveInstrumentDefaults(jazzDrumKitManifest, 'ballad');
    expect(result.pattern).toBe('swing');
    expect(result.volume).toBe(0.55);
  });

  it('has perStyleDefaults for every style', () => {
    expect(jazzDrumKitManifest.perStyleDefaults).toBeDefined();
    for (const style of ALL_STYLES) {
      expect(jazzDrumKitManifest.perStyleDefaults?.[style], `style ${style}`).toBeDefined();
    }
  });
});
