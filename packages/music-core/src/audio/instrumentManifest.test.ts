import { describe, it, expect } from 'vitest';
import { resolveInstrumentDefaults } from './instrumentManifest.js';
import { bassManifest } from './bassManifest.js';
import { drumsManifest } from './drumsManifest.js';
import { pianoManifest } from './pianoManifest.js';
import { rhodesManifest } from './rhodesManifest.js';
import { guitarManifest } from './guitarManifest.js';
import { salamanderManifest } from './salamanderManifest.js';
import { percussionManifest } from './percussionManifest.js';
import { electricGuitarManifest } from './electricGuitarManifest.js';
import type { Style } from '@jazz/shared';

const ALL_STYLES: Style[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

// ─── resolveInstrumentDefaults ─────────────────────────────────────────────────

describe('resolveInstrumentDefaults', () => {
  it('returns defaultSettings when style has no perStyleDefaults', () => {
    // Simulate a manifest without perStyleDefaults
    const manifest = {
      id: 'test',
      name: 'Test',
      createInstrument: () => ({}) as never,
      sampleManifest: { baseUrl: '/' },
      defaultSettings: { enabled: true, volume: 0.5 },
    };
    const result = resolveInstrumentDefaults(manifest, 'swing');
    expect(result).toEqual({ enabled: true, volume: 0.5 });
  });

  it('merges per-style overrides on top of defaultSettings', () => {
    const manifest = {
      id: 'test',
      name: 'Test',
      createInstrument: () => ({}) as never,
      sampleManifest: { baseUrl: '/' },
      defaultSettings: { enabled: false, volume: 0.7, pattern: 'default' },
      perStyleDefaults: { swing: { enabled: true, pattern: 'walking' } },
    };
    const result = resolveInstrumentDefaults(manifest, 'swing');
    expect(result).toEqual({ enabled: true, volume: 0.7, pattern: 'walking' });
  });

  it('does not mutate defaultSettings or perStyleDefaults', () => {
    const manifest = {
      id: 'test',
      name: 'Test',
      createInstrument: () => ({}) as never,
      sampleManifest: { baseUrl: '/' },
      defaultSettings: { enabled: false },
      perStyleDefaults: { swing: { enabled: true } },
    };
    const result = resolveInstrumentDefaults(manifest, 'swing');
    result.enabled = false; // mutate result
    expect(manifest.defaultSettings!.enabled).toBe(false); // original untouched
    expect(manifest.perStyleDefaults!.swing!.enabled).toBe(true); // original untouched
  });

  it('falls back to defaultSettings for styles not in perStyleDefaults', () => {
    const manifest = {
      id: 'test',
      name: 'Test',
      createInstrument: () => ({}) as never,
      sampleManifest: { baseUrl: '/' },
      defaultSettings: { enabled: false, volume: 0.5 },
      perStyleDefaults: { swing: { enabled: true } },
    };
    const result = resolveInstrumentDefaults(manifest, 'bossa');
    expect(result).toEqual({ enabled: false, volume: 0.5 });
  });
});

// ─── Bass per-style defaults ──────────────────────────────────────────────────

describe('bassManifest per-style defaults', () => {
  it('swing returns walking bass (complexity 5)', () => {
    const result = resolveInstrumentDefaults(bassManifest, 'swing');
    expect(result.complexity).toBe(5);
    expect(result.enabled).toBe(true);
  });

  it('bossa returns root-5th (complexity 3)', () => {
    const result = resolveInstrumentDefaults(bassManifest, 'bossa');
    expect(result.complexity).toBe(3);
  });

  it('funk returns syncopated (complexity 5)', () => {
    const result = resolveInstrumentDefaults(bassManifest, 'funk');
    expect(result.complexity).toBe(5);
  });

  it('latin returns montuno (complexity 4)', () => {
    const result = resolveInstrumentDefaults(bassManifest, 'latin');
    expect(result.complexity).toBe(4);
  });

  it('ballad returns two-feel (complexity 7)', () => {
    const result = resolveInstrumentDefaults(bassManifest, 'ballad');
    expect(result.complexity).toBe(7);
  });

  it('all styles preserve non-overridden defaults', () => {
    for (const style of ALL_STYLES) {
      const result = resolveInstrumentDefaults(bassManifest, style);
      expect(result.volume).toBe(0.8); // from defaultSettings, not overridden
      expect(result.octaveUp).toBe(false);
    }
  });
});

// ─── Drums per-style defaults ─────────────────────────────────────────────────

describe('drumsManifest per-style defaults', () => {
  it('swing uses swing pattern', () => {
    const result = resolveInstrumentDefaults(drumsManifest, 'swing');
    expect(result.pattern).toBe('swing');
  });

  it('bossa uses bossa pattern, snare off, rim on', () => {
    const result = resolveInstrumentDefaults(drumsManifest, 'bossa');
    expect(result.pattern).toBe('bossa');
    expect(result.snareEnabled).toBe(false);
    expect(result.rimEnabled).toBe(true);
  });

  it('funk uses funk pattern', () => {
    const result = resolveInstrumentDefaults(drumsManifest, 'funk');
    expect(result.pattern).toBe('funk');
  });

  it('latin uses funk pattern (closest approximation)', () => {
    const result = resolveInstrumentDefaults(drumsManifest, 'latin');
    expect(result.pattern).toBe('funk');
  });

  it('ballad uses swing pattern with lower volume', () => {
    const result = resolveInstrumentDefaults(drumsManifest, 'ballad');
    expect(result.pattern).toBe('swing');
    expect(result.volume).toBe(0.55);
  });
});

// ─── Piano per-style defaults ─────────────────────────────────────────────────

describe('pianoManifest per-style defaults', () => {
  it('swing uses swing-sparse + rootless3', () => {
    const result = resolveInstrumentDefaults(pianoManifest, 'swing');
    expect(result.profile).toBe('swing-sparse');
    expect(result.voicingDensity).toBe('rootless3');
  });

  it('bossa uses swing-sparse + shell2', () => {
    const result = resolveInstrumentDefaults(pianoManifest, 'bossa');
    expect(result.profile).toBe('swing-sparse');
    expect(result.voicingDensity).toBe('shell2');
  });

  it('funk uses offbeat-push + rootless4', () => {
    const result = resolveInstrumentDefaults(pianoManifest, 'funk');
    expect(result.profile).toBe('offbeat-push');
    expect(result.voicingDensity).toBe('rootless4');
  });

  it('latin uses basie-light + quartal', () => {
    const result = resolveInstrumentDefaults(pianoManifest, 'latin');
    expect(result.profile).toBe('basie-light');
    expect(result.voicingDensity).toBe('quartal');
  });

  it('ballad uses beginner-safe + rootless4', () => {
    const result = resolveInstrumentDefaults(pianoManifest, 'ballad');
    expect(result.profile).toBe('beginner-safe');
    expect(result.voicingDensity).toBe('rootless4');
  });
});

// ─── Rhodes per-style defaults ────────────────────────────────────────────────

describe('rhodesManifest per-style defaults', () => {
  it('swing uses subtleOffbeats + rootless3', () => {
    const result = resolveInstrumentDefaults(rhodesManifest, 'swing');
    expect(result.mode).toBe('subtleOffbeats');
    expect(result.voicingDensity).toBe('rootless3');
  });

  it('bossa uses ambientSwells + shell2', () => {
    const result = resolveInstrumentDefaults(rhodesManifest, 'bossa');
    expect(result.mode).toBe('ambientSwells');
    expect(result.voicingDensity).toBe('shell2');
  });

  it('funk uses stabAccents + rootless4', () => {
    const result = resolveInstrumentDefaults(rhodesManifest, 'funk');
    expect(result.mode).toBe('stabAccents');
    expect(result.voicingDensity).toBe('rootless4');
  });

  it('latin uses highComping + rootless3', () => {
    const result = resolveInstrumentDefaults(rhodesManifest, 'latin');
    expect(result.mode).toBe('highComping');
    expect(result.voicingDensity).toBe('rootless3');
  });

  it('ballad uses pads + shell2', () => {
    const result = resolveInstrumentDefaults(rhodesManifest, 'ballad');
    expect(result.mode).toBe('pads');
    expect(result.voicingDensity).toBe('shell2');
  });
});

// ─── Guitar per-style defaults ────────────────────────────────────────────────

describe('guitarManifest per-style defaults', () => {
  it('swing uses steel string, comp mode, jazz voicing (Freddie Green)', () => {
    const result = resolveInstrumentDefaults(guitarManifest, 'swing');
    expect(result.mode).toBe('comp');
    expect(result.voicing).toBe('jazz');
    expect(result.stringType).toBe('steel');
  });

  it('bossa uses nylon string, comp mode (bossa-comping)', () => {
    const result = resolveInstrumentDefaults(guitarManifest, 'bossa');
    expect(result.mode).toBe('comp');
    expect(result.voicing).toBe('jazz');
    expect(result.stringType).toBe('nylon');
  });

  it('funk uses steel string, comp mode (funk-chops)', () => {
    const result = resolveInstrumentDefaults(guitarManifest, 'funk');
    expect(result.mode).toBe('comp');
    expect(result.stringType).toBe('steel');
  });

  it('latin uses fingerstyle + open voicing', () => {
    const result = resolveInstrumentDefaults(guitarManifest, 'latin');
    expect(result.mode).toBe('fingerstyle');
    expect(result.voicing).toBe('open');
  });

  it('ballad uses fingerstyle + open voicing', () => {
    const result = resolveInstrumentDefaults(guitarManifest, 'ballad');
    expect(result.mode).toBe('fingerstyle');
    expect(result.voicing).toBe('open');
  });
});

// ─── Salamander per-style defaults (mirrors piano) ────────────────────────────

describe('salamanderManifest per-style defaults', () => {
  it('uses same per-style defaults as pianoManifest', () => {
    for (const style of ALL_STYLES) {
      const piano = resolveInstrumentDefaults(pianoManifest, style);
      const salamander = resolveInstrumentDefaults(salamanderManifest, style);
      expect(salamander.profile).toBe(piano.profile);
      expect(salamander.voicingDensity).toBe(piano.voicingDensity);
    }
  });

  it('keeps salamander as sampleLibrary', () => {
    const result = resolveInstrumentDefaults(salamanderManifest, 'swing');
    expect(result.sampleLibrary).toBe('salamander');
  });
});

// ─── All manifests have per-style defaults for every style ────────────────────

describe('perStyleDefaults completeness', () => {
  const manifests = [
    { name: 'bass', m: bassManifest },
    { name: 'drums', m: drumsManifest },
    { name: 'piano', m: pianoManifest },
    { name: 'rhodes', m: rhodesManifest },
    { name: 'guitar', m: guitarManifest },
    { name: 'electric-guitar', m: electricGuitarManifest },
    { name: 'salamander', m: salamanderManifest },
    { name: 'percussion', m: percussionManifest },
  ] as const;

  it('every manifest has perStyleDefaults', () => {
    for (const { name, m } of manifests) {
      expect(m.perStyleDefaults, `${name} missing perStyleDefaults`).toBeDefined();
    }
  });

  it('every manifest defines per-style defaults for all 5 styles', () => {
    for (const { name, m } of manifests) {
      for (const style of ALL_STYLES) {
        expect(
          m.perStyleDefaults?.[style],
          `${name} missing perStyleDefaults[${style}]`,
        ).toBeDefined();
      }
    }
  });

  it('resolveInstrumentDefaults works for every manifest × style combination', () => {
    for (const { name, m } of manifests) {
      for (const style of ALL_STYLES) {
        const result = resolveInstrumentDefaults(m, style);
        expect(result, `${name} × ${style}`).toBeDefined();
        expect(typeof result, `${name} × ${style}`).toBe('object');
      }
    }
  });
});

// ─── Percussion per-style defaults ────────────────────────────────────────────

describe('percussionManifest per-style defaults', () => {
  it('swing uses cascara-clave, disabled by default', () => {
    const result = resolveInstrumentDefaults(percussionManifest, 'swing');
    expect(result.pattern).toBe('cascara-clave');
    expect(result.enabled).toBe(false);
  });

  it('bossa uses bossa-texture, disabled by default', () => {
    const result = resolveInstrumentDefaults(percussionManifest, 'bossa');
    expect(result.pattern).toBe('bossa-texture');
    expect(result.enabled).toBe(false);
  });

  it('funk uses funk-accents, disabled by default', () => {
    const result = resolveInstrumentDefaults(percussionManifest, 'funk');
    expect(result.pattern).toBe('funk-accents');
    expect(result.enabled).toBe(false);
  });

  it('latin uses cascara-clave, enabled by default', () => {
    const result = resolveInstrumentDefaults(percussionManifest, 'latin');
    expect(result.pattern).toBe('cascara-clave');
    expect(result.enabled).toBe(true);
  });

  it('ballad uses bossa-texture, disabled by default', () => {
    const result = resolveInstrumentDefaults(percussionManifest, 'ballad');
    expect(result.pattern).toBe('bossa-texture');
    expect(result.enabled).toBe(false);
  });
});
