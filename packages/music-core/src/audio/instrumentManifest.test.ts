import { describe, it, expect } from 'vitest';
import { resolveInstrumentDefaults } from './instrumentManifest.js';
import { uprightBassManifest, electricBassManifest } from './bassManifest.js';
import { pianoManifest } from './pianoManifest.js';
import { rhodesManifest } from './rhodesManifest.js';
import { guitarManifest } from './guitarManifest.js';
import { salamanderManifest } from './salamanderManifest.js';
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
      family: 'pitched' as const,
      settingsPrefix: 'test',
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
      family: 'pitched' as const,
      settingsPrefix: 'test',
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
      family: 'pitched' as const,
      settingsPrefix: 'test',
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
      family: 'pitched' as const,
      settingsPrefix: 'test',
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

describe('bass manifests per-style defaults', () => {
  it('upright swing returns walking bass', () => {
    const result = resolveInstrumentDefaults(uprightBassManifest, 'swing');
    expect(result.pattern).toBe('walking');
    expect(result.enabled).toBe(true);
  });

  it('upright bossa returns root-5th', () => {
    const result = resolveInstrumentDefaults(uprightBassManifest, 'bossa');
    expect(result.pattern).toBe('root-5th');
  });

  it('upright ballad returns two-feel', () => {
    const result = resolveInstrumentDefaults(uprightBassManifest, 'ballad');
    expect(result.pattern).toBe('two-feel');
  });

  it('upright is disabled for funk/latin (electric takes over)', () => {
    expect(resolveInstrumentDefaults(uprightBassManifest, 'funk').enabled).toBe(false);
    expect(resolveInstrumentDefaults(uprightBassManifest, 'latin').enabled).toBe(false);
  });

  it('electric funk returns syncopated', () => {
    const result = resolveInstrumentDefaults(electricBassManifest, 'funk');
    expect(result.pattern).toBe('syncopated');
    expect(result.enabled).toBe(true);
  });

  it('electric latin returns montuno', () => {
    const result = resolveInstrumentDefaults(electricBassManifest, 'latin');
    expect(result.pattern).toBe('montuno');
    expect(result.enabled).toBe(true);
  });

  it('electric is disabled for swing/bossa/ballad', () => {
    for (const style of ['swing', 'bossa', 'ballad'] as const) {
      expect(resolveInstrumentDefaults(electricBassManifest, style).enabled).toBe(false);
    }
  });

  it('upright preserves default volume in its active styles', () => {
    // Upright is active in swing/bossa/ballad; disabled (volume 0) in funk/latin.
    for (const style of ['swing', 'bossa', 'ballad'] as const) {
      const result = resolveInstrumentDefaults(uprightBassManifest, style);
      expect(result.volume).toBe(0.8);
    }
  });
});

// ─── Drums per-style defaults ─────────────────────────────────────────────────
// (moved to packages/plugins/instruments/jazz-drum-kit — the manifest now lives
//  in the plugin, and music-core cannot import plugins by layer boundaries.)

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
    { name: 'upright-bass', m: uprightBassManifest },
    { name: 'electric-bass', m: electricBassManifest },
    { name: 'piano', m: pianoManifest },
    { name: 'rhodes', m: rhodesManifest },
    { name: 'guitar', m: guitarManifest },
    { name: 'electric-guitar', m: electricGuitarManifest },
    { name: 'salamander', m: salamanderManifest },
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
