import { describe, it, expect } from 'vitest';
import { resolveInstrumentDefaults } from '@jazz/music-core';
import { metronomeManifest } from './manifest.js';
import type { Style } from '@jazz/shared';

const ALL_STYLES: Style[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

describe('metronomeManifest', () => {
  it('has correct id and family', () => {
    expect(metronomeManifest.id).toBe('metronome');
    expect(metronomeManifest.family).toBe('percussion');
    expect(metronomeManifest.settingsPrefix).toBe('metronome');
  });

  it('createInstrument returns a MetronomeInstrument', () => {
    const inst = metronomeManifest.createInstrument();
    expect(inst).toBeDefined();
    expect(typeof inst.schedule).toBe('function');
  });

  it('sampleManifest.oneshots contains 8 sounds', () => {
    const keys = Object.keys(metronomeManifest.sampleManifest.oneshots ?? {});
    expect(keys).toHaveLength(8);
    expect(keys).toContain('analog-metronome');
    expect(keys).toContain('cross-stick');
    expect(keys).toContain('hh-chick');
    expect(keys).toContain('hh-closed');
  });

  it('sampleManifest has rrCount 1', () => {
    expect(metronomeManifest.sampleManifest.rrCount).toBe(1);
  });

  it('defaultSettings contain all 13 metronome fields', () => {
    const ds = metronomeManifest.defaultSettings as Record<string, unknown>;
    expect(ds.clickStrong).toBe('drum-stick');
    expect(ds.clickStrong2).toBe('drum-stick');
    expect(ds.clickWeak).toBe('drum-stick');
    expect(ds.metronomeEnabled).toBe(true);
    expect(ds.metronomeVolume).toBe(0.8);
    expect(ds.metronomeMode).toBe('both');
    expect(ds.metronomeStrongEnabled).toBe(true);
    expect(ds.metronomeStrongVolume).toBe(0.8);
    expect(ds.metronomeStrong2Enabled).toBe(true);
    expect(ds.metronomeStrong2Volume).toBe(0.8);
    expect(ds.metronomeWeakEnabled).toBe(true);
    expect(ds.metronomeWeakVolume).toBe(0.8);
  });

  it('resolveInstrumentDefaults returns defaultSettings for any style', () => {
    for (const style of ALL_STYLES) {
      const resolved = resolveInstrumentDefaults(metronomeManifest, style);
      expect(resolved.clickStrong).toBe('drum-stick');
      expect(resolved.metronomeMode).toBe('both');
    }
  });

  it('manifest has no perStyleDefaults (metronome is style-agnostic)', () => {
    expect(metronomeManifest.perStyleDefaults).toBeUndefined();
  });
});
