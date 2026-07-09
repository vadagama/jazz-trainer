import { describe, it, expect } from 'vitest';
import { resolveInstrumentDefaults } from '@jazz/music-core';
import { validateInstrumentManifest } from '@jazz/plugin-sdk';
import { funkDrumKitManifest } from './manifest.js';
import type { Style } from '@jazz/shared';

const ALL_STYLES: Style[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

describe('funkDrumKitManifest', () => {
  it('passes schema validation', () => {
    expect(() => validateInstrumentManifest(funkDrumKitManifest)).not.toThrow();
  });
});

describe('funkDrumKitManifest per-style defaults', () => {
  it('swing turns funk-specific articulations off', () => {
    const result = resolveInstrumentDefaults(funkDrumKitManifest, 'swing');
    expect(result.pattern).toBe('swing');
    expect(result.snareBuzzEnabled).toBe(false);
    expect(result.rideBellEnabled).toBe(false);
  });

  it('bossa uses bossa pattern, snare off, rim on', () => {
    const result = resolveInstrumentDefaults(funkDrumKitManifest, 'bossa');
    expect(result.pattern).toBe('bossa');
    expect(result.snareEnabled).toBe(false);
    expect(result.rimEnabled).toBe(true);
  });

  it('funk enables funk-specific articulations', () => {
    const result = resolveInstrumentDefaults(funkDrumKitManifest, 'funk');
    expect(result.pattern).toBe('funk');
    expect(result.snareBuzzEnabled).toBe(true);
    expect(result.rideBellEnabled).toBe(true);
    expect(result.tomEnabled).toBe(true);
  });

  it('latin uses funk pattern', () => {
    const result = resolveInstrumentDefaults(funkDrumKitManifest, 'latin');
    expect(result.pattern).toBe('funk');
  });

  it('ballad uses swing pattern with lower volume', () => {
    const result = resolveInstrumentDefaults(funkDrumKitManifest, 'ballad');
    expect(result.pattern).toBe('swing');
    expect(result.volume).toBe(0.6);
  });

  it('has perStyleDefaults for every style', () => {
    expect(funkDrumKitManifest.perStyleDefaults).toBeDefined();
    for (const style of ALL_STYLES) {
      expect(funkDrumKitManifest.perStyleDefaults?.[style], `style ${style}`).toBeDefined();
    }
  });
});
