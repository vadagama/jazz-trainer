import { describe, it, expect } from 'vitest';
import { resolveInstrumentDefaults } from '@jazz/music-core';
import type { Style } from '@jazz/shared';
import { uprightBassManifest, electricBassManifest } from './manifest.js';
import {
  UPRIGHT_BASS_LAYERS,
  ELECTRIC_BASS_LAYERS,
  UPRIGHT_BASS_ARTICULATIONS,
  ELECTRIC_BASS_ARTICULATIONS,
} from './sampleRegistry.js';

const ALL_STYLES: Style[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

describe('uprightBassManifest', () => {
  it('has correct id, family and settingsPrefix', () => {
    expect(uprightBassManifest.id).toBe('upright-bass');
    expect(uprightBassManifest.family).toBe('pitched');
    expect(uprightBassManifest.settingsPrefix).toBe('bass');
  });

  it('createInstrument returns a schedulable instrument', () => {
    const inst = uprightBassManifest.createInstrument();
    expect(inst).toBeDefined();
    expect(typeof inst.schedule).toBe('function');
  });

  it('sampleManifest has pluck + mute layers (4 RR each)', () => {
    const layers = Object.keys(uprightBassManifest.sampleManifest.layers ?? {});
    for (const art of UPRIGHT_BASS_ARTICULATIONS) {
      for (const rr of [1, 2, 3, 4]) {
        expect(layers, `${art}_rr${rr}`).toContain(`${art}_rr${rr}`);
      }
    }
    expect(layers).toHaveLength(8);
  });

  it('defines perStyleDefaults for all 5 styles', () => {
    for (const style of ALL_STYLES) {
      const resolved = resolveInstrumentDefaults(uprightBassManifest, style);
      expect(resolved, style).toBeDefined();
      expect(resolved.pattern).toBeDefined();
    }
  });

  it('is enabled for swing/bossa/ballad and disabled for funk/latin', () => {
    expect(resolveInstrumentDefaults(uprightBassManifest, 'swing').enabled).not.toBe(false);
    expect(resolveInstrumentDefaults(uprightBassManifest, 'bossa').enabled).not.toBe(false);
    expect(resolveInstrumentDefaults(uprightBassManifest, 'ballad').enabled).not.toBe(false);
    expect(resolveInstrumentDefaults(uprightBassManifest, 'funk').enabled).toBe(false);
    expect(resolveInstrumentDefaults(uprightBassManifest, 'latin').enabled).toBe(false);
  });
});

describe('electricBassManifest', () => {
  it('has correct id, family and settingsPrefix', () => {
    expect(electricBassManifest.id).toBe('electric-bass');
    expect(electricBassManifest.family).toBe('pitched');
    expect(electricBassManifest.settingsPrefix).toBe('bass');
  });

  it('createInstrument returns a schedulable instrument', () => {
    const inst = electricBassManifest.createInstrument();
    expect(inst).toBeDefined();
    expect(typeof inst.schedule).toBe('function');
  });

  it('sampleManifest has reg/stac/rel/ghost layers (4 RR each)', () => {
    const layers = Object.keys(electricBassManifest.sampleManifest.layers ?? {});
    for (const art of ELECTRIC_BASS_ARTICULATIONS) {
      for (const rr of [1, 2, 3, 4]) {
        expect(layers, `${art}_rr${rr}`).toContain(`${art}_rr${rr}`);
      }
    }
    expect(layers).toHaveLength(16);
  });

  it('defines perStyleDefaults for all 5 styles', () => {
    for (const style of ALL_STYLES) {
      const resolved = resolveInstrumentDefaults(electricBassManifest, style);
      expect(resolved, style).toBeDefined();
      expect(resolved.pattern).toBeDefined();
    }
  });

  it('is enabled for funk/latin and disabled for swing/bossa/ballad', () => {
    expect(resolveInstrumentDefaults(electricBassManifest, 'funk').enabled).not.toBe(false);
    expect(resolveInstrumentDefaults(electricBassManifest, 'latin').enabled).not.toBe(false);
    expect(resolveInstrumentDefaults(electricBassManifest, 'swing').enabled).toBe(false);
    expect(resolveInstrumentDefaults(electricBassManifest, 'bossa').enabled).toBe(false);
    expect(resolveInstrumentDefaults(electricBassManifest, 'ballad').enabled).toBe(false);
  });
});

describe('bass manifests — mutual exclusivity', () => {
  it('upright and electric have distinct ids', () => {
    expect(uprightBassManifest.id).not.toBe(electricBassManifest.id);
  });

  it('upright and electric layers do not overlap', () => {
    const upKeys = new Set(Object.keys(UPRIGHT_BASS_LAYERS));
    const elKeys = Object.keys(ELECTRIC_BASS_LAYERS);
    for (const k of elKeys) {
      expect(upKeys.has(k), `overlap: ${k}`).toBe(false);
    }
  });

  it('for every style, exactly one of upright/electric is the active variant', () => {
    for (const style of ALL_STYLES) {
      const up = resolveInstrumentDefaults(uprightBassManifest, style).enabled !== false;
      const el = resolveInstrumentDefaults(electricBassManifest, style).enabled !== false;
      // Active styles are mutually exclusive; disabled styles have both off.
      expect(up && el, `${style}: both active`).toBe(false);
    }
  });
});
