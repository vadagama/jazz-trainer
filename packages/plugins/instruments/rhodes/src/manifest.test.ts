import { describe, it, expect } from 'vitest';
import { resolveInstrumentDefaults } from '@jazz/music-core';
import { rhodesManifest } from './manifest.js';
import type { Style } from '@jazz/shared';

const ALL_STYLES: Style[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

describe('rhodesManifest', () => {
  it('has correct id, family, and settingsPrefix', () => {
    expect(rhodesManifest.id).toBe('rhodes');
    expect(rhodesManifest.family).toBe('pitched');
    expect(rhodesManifest.settingsPrefix).toBe('rhodes');
  });

  it('createInstrument returns a working instrument', () => {
    const inst = rhodesManifest.createInstrument();
    expect(inst).toBeDefined();
    expect(typeof inst.schedule).toBe('function');
  });

  it('sampleManifest has 4 velocity layers (soft/medium/hard/bark)', () => {
    const layers = rhodesManifest.sampleManifest.layers ?? {};
    const keys = Object.keys(layers);
    expect(keys).toContain('soft');
    expect(keys).toContain('medium');
    expect(keys).toContain('hard');
    expect(keys).toContain('bark');
  });

  it('sampleManifest baseUrl points to the aac rhodes samples', () => {
    expect(rhodesManifest.sampleManifest.baseUrl).toBe('/samples/aac/rhodes/');
  });

  it('defaultSettings contain volume, pattern, voicingDensity', () => {
    const ds = rhodesManifest.defaultSettings as Record<string, unknown>;
    expect(ds.enabled).toBe(false);
    expect(ds.volume).toBe(0.6);
    expect(ds.pattern).toBe('rhodes-swing-form');
    expect(ds.voicingDensity).toBe('rootless3');
  });

  it('perStyleDefaults cover all 5 styles with organism pattern ids', () => {
    const psd = rhodesManifest.perStyleDefaults ?? {};
    expect(psd.swing?.pattern).toBe('rhodes-swing-form');
    expect(psd.bossa?.pattern).toBe('rhodes-bossa-form');
    expect(psd.funk?.pattern).toBe('rhodes-funk-form');
    expect(psd.latin?.pattern).toBe('rhodes-latin-form');
    expect(psd.ballad?.pattern).toBe('rhodes-ballad-form');
  });

  it('resolveInstrumentDefaults merges defaultSettings with perStyleDefaults', () => {
    for (const style of ALL_STYLES) {
      const resolved = resolveInstrumentDefaults(rhodesManifest, style);
      const r = resolved as Record<string, unknown>;
      // pattern comes from perStyleDefaults
      expect(r.pattern).toBeDefined();
      // volume comes from defaultSettings
      expect(r.volume).toBe(0.6);
    }
  });

  it('perStyleDefaults voicing densities are valid', () => {
    const psd = rhodesManifest.perStyleDefaults ?? {};
    const validDensities = ['shell2', 'rootless3', 'rootless4', 'quartal'];
    for (const style of ALL_STYLES) {
      const voicing = psd[style]?.voicingDensity;
      expect(validDensities).toContain(voicing);
    }
  });
});
