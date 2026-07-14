import { describe, it, expect } from 'vitest';
import {
  getStyleProfile,
  getAllStyleProfiles,
  getRoster,
  getVisibleInstruments,
  getDefaultEnsemble,
  getEnsemblePreset,
  getEnsemblePresets,
  applyEnsemble,
} from './styleProfile.js';
import type { Style } from '@jazz/shared';

const ALL_STYLES: Style[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

// ─── getStyleProfile / getAllStyleProfiles ────────────────────────────────────

describe('getStyleProfile', () => {
  it('returns correct profile for swing', () => {
    const profile = getStyleProfile('swing');
    expect(profile.id).toBe('swing');
    expect(profile.name).toBe('Swing');
    expect(profile.defaultTempo).toBe(140);
    expect(profile.swingRatio).toBe(0.67);
    expect(profile.timeSignaturePresets).toContain('4/4');
    expect(profile.timeSignaturePresets).toContain('3/4');
  });

  it('returns correct profile for bossa', () => {
    const profile = getStyleProfile('bossa');
    expect(profile.id).toBe('bossa');
    expect(profile.swingRatio).toBe(0.5);
    expect(profile.defaultTempo).toBe(120);
  });

  it('returns correct profile for funk', () => {
    const profile = getStyleProfile('funk');
    expect(profile.id).toBe('funk');
    expect(profile.defaultTempo).toBe(100);
    expect(profile.swingRatio).toBe(0.5);
  });

  it('returns correct profile for latin', () => {
    const profile = getStyleProfile('latin');
    expect(profile.id).toBe('latin');
    expect(profile.defaultTempo).toBe(160);
    expect(profile.timeSignaturePresets).toContain('6/8');
  });

  it('returns correct profile for ballad', () => {
    const profile = getStyleProfile('ballad');
    expect(profile.id).toBe('ballad');
    expect(profile.defaultTempo).toBe(60);
  });

  it('all 5 profiles have unique default tempo', () => {
    const tempos = new Set(ALL_STYLES.map((s) => getStyleProfile(s).defaultTempo));
    expect(tempos.size).toBe(5);
  });

  it('all styles have swingRatio >= 0.5 (straight = 0.5, swing > 0.5)', () => {
    for (const style of ALL_STYLES) {
      expect(getStyleProfile(style).swingRatio).toBeGreaterThanOrEqual(0.5);
    }
  });
});

describe('getAllStyleProfiles', () => {
  it('returns all 5 profiles', () => {
    const profiles = getAllStyleProfiles();
    expect(profiles).toHaveLength(5);
    const ids = profiles.map((p) => p.id).sort();
    expect(ids).toEqual(['ballad', 'bossa', 'funk', 'latin', 'swing']);
  });
});

// ─── getRoster ────────────────────────────────────────────────────────────────

describe('getRoster', () => {
  it('swing roster has 4 required+recommended groups (3 req + 1 rec)', () => {
    const roster = getRoster('swing');
    const visible = [...roster.required, ...roster.recommended];
    expect(visible).toHaveLength(4); // 3 required + 1 recommended
    expect(roster.required).toContain('drums');
    expect(roster.required).toContain('bass');
    expect(roster.required).toContain('piano');
    expect(roster.recommended).toContain('rhodes');
  });

  it('funk roster has drums group as required (modern variant by default)', () => {
    const roster = getRoster('funk');
    expect(roster.required).toContain('drums');
    expect(roster.required).toContain('bass');
    expect(roster.required).toContain('piano');
    expect(roster.recommended).toContain('rhodes');
    expect(roster.recommended).toContain('guitar');
  });

  it('funk default drum variant is funk-drum-kit', () => {
    const profile = getStyleProfile('funk');
    expect(profile.defaultVariants.drums).toBe('funk-drum-kit');
    expect(profile.defaultVariants.bass).toBe('electric-bass');
  });

  it('latin roster requires percussion group', () => {
    const roster = getRoster('latin');
    expect(roster.required).toContain('percussion');
    expect(roster.required).toContain('drums');
    expect(roster.required).toContain('piano');
    expect(roster.required).toContain('bass');
  });

  it('every style has at least 1 required instrument', () => {
    for (const style of ALL_STYLES) {
      const roster = getRoster(style);
      expect(roster.required.length, `${style} has no required instruments`).toBeGreaterThanOrEqual(
        1,
      );
    }
  });

  it('rosters are disjoint across required/recommended/optional/hidden', () => {
    for (const style of ALL_STYLES) {
      const roster = getRoster(style);
      const all = [...roster.required, ...roster.recommended, ...roster.optional, ...roster.hidden];
      const unique = new Set(all);
      expect(unique.size).toBe(all.length);
    }
  });
});

// ─── getVisibleInstruments ────────────────────────────────────────────────────

describe('getVisibleInstruments', () => {
  it('returns required + recommended for swing in group order', () => {
    const visible = getVisibleInstruments('swing');
    // Order: drums(1), bass(2), piano(3), rhodes(4)
    expect(visible).toEqual(['jazz-drum-kit', 'upright-bass', 'piano', 'rhodes']);
  });

  it('includes optional when explicitly enabled', () => {
    const visible = getVisibleInstruments('swing', { 'trumpet-muted': true });
    expect(visible).toContain('trumpet-muted');
  });

  it('excludes optional when not enabled', () => {
    const visible = getVisibleInstruments('swing');
    expect(visible).not.toContain('trumpet-muted');
    expect(visible).not.toContain('percussion');
  });

  it('includes hidden instrument when explicitly enabled', () => {
    const visible = getVisibleInstruments('swing', { 'electric-guitar': true });
    expect(visible).toContain('electric-guitar');
  });

  it('excludes hidden instruments by default', () => {
    const visible = getVisibleInstruments('swing');
    expect(visible).not.toContain('electric-guitar');
    expect(visible).not.toContain('funk-drum-kit');
  });

  it('excludes optional that is explicitly disabled', () => {
    const visible = getVisibleInstruments('swing', { 'trumpet-muted': false });
    expect(visible).not.toContain('trumpet-muted');
  });

  it('latin returns instruments in group order (percussion at end)', () => {
    const visible = getVisibleInstruments('latin');
    // Groups: drums(1), bass(2), piano(3), winds(6), percussion(7)
    // Latin uses electric-bass (montuno); order: drums, electric-bass, piano, trumpet-muted, percussion
    expect(visible).toEqual([
      'funk-drum-kit',
      'electric-bass',
      'piano',
      'trumpet-muted',
      'percussion',
    ]);
  });
});

// ─── getDefaultEnsemble ───────────────────────────────────────────────────────

describe('getDefaultEnsemble', () => {
  it('swing trio returns Drums+Piano+Bass with correct volumes', () => {
    const ensemble = getDefaultEnsemble('swing', 'trio');
    const { instruments } = ensemble;
    expect(instruments.drums).toEqual({ enabled: true, volume: 0.7 });
    expect(instruments.piano).toEqual({ enabled: true, volume: 0.7 });
    expect(instruments['upright-bass']).toEqual({ enabled: true, volume: 0.75 });
    expect(Object.keys(instruments)).toHaveLength(3);
  });

  it('swing quartet adds rhodes', () => {
    const ensemble = getDefaultEnsemble('swing', 'quartet');
    expect(ensemble.instruments.rhodes).toEqual({ enabled: true, volume: 0.55 });
    expect(Object.keys(ensemble.instruments)).toHaveLength(4);
  });

  it('funk trio uses funk-drum-kit instead of drums', () => {
    const ensemble = getDefaultEnsemble('funk', 'trio');
    expect(ensemble.instruments['funk-drum-kit']).toEqual({ enabled: true, volume: 0.75 });
    expect(ensemble.instruments.drums).toBeUndefined();
  });

  it('funk quintet includes electric-guitar, organ and percussion', () => {
    const ensemble = getDefaultEnsemble('funk', 'quintet');
    expect(ensemble.instruments['electric-guitar']).toEqual({ enabled: true, volume: 0.7 });
    expect(ensemble.instruments.organ).toEqual({ enabled: true, volume: 0.65 });
    expect(ensemble.instruments.percussion).toEqual({ enabled: true, volume: 0.65 });
    expect(Object.keys(ensemble.instruments)).toHaveLength(6);
  });

  it('latin duet is percussion + bass', () => {
    const ensemble = getDefaultEnsemble('latin', 'duet');
    expect(ensemble.instruments.percussion).toEqual({ enabled: true, volume: 0.7 });
    expect(ensemble.instruments['upright-bass']).toEqual({ enabled: true, volume: 0.7 });
    expect(Object.keys(ensemble.instruments)).toHaveLength(2);
  });

  it('ballad trio has lower drum volume', () => {
    const ensemble = getDefaultEnsemble('ballad', 'trio');
    expect(ensemble.instruments.drums).toEqual({ enabled: true, volume: 0.5 });
  });

  it('boss nova duet is guitar + bass', () => {
    const ensemble = getDefaultEnsemble('bossa', 'duet');
    expect(ensemble.instruments.guitar).toEqual({ enabled: true, volume: 0.7 });
    expect(ensemble.instruments['upright-bass']).toEqual({ enabled: true, volume: 0.7 });
    expect(Object.keys(ensemble.instruments)).toHaveLength(2);
  });

  it('every ensemble size is supported for every style', () => {
    const sizes = ['duet', 'trio', 'quartet', 'quintet', 'full'] as const;
    for (const style of ALL_STYLES) {
      for (const size of sizes) {
        const ensemble = getDefaultEnsemble(style, size);
        expect(ensemble.instruments).toBeDefined();
        expect(Object.keys(ensemble.instruments).length).toBeGreaterThan(0);
      }
    }
  });

  it('full ensemble includes all visible instruments', () => {
    const swingFull = getDefaultEnsemble('swing', 'full');
    const ids = Object.keys(swingFull.instruments);
    // Swing visible: drums, upright-bass, piano, rhodes, trumpet-muted, vibraphone, clarinet, guitar
    expect(ids).toContain('drums');
    expect(ids).toContain('upright-bass');
    expect(ids).toContain('piano');
    expect(ids).toContain('rhodes');
    expect(ids).toContain('guitar');
    expect(ids).toContain('trumpet-muted');
    expect(ids).toContain('vibraphone');
    expect(ids).toContain('clarinet');
    expect(ids).toHaveLength(8);
  });

  it('funk full ensemble includes all non-hidden instruments', () => {
    const funkFull = getDefaultEnsemble('funk', 'full');
    const ids = Object.keys(funkFull.instruments);
    // Funk visible: funk-drum-kit, electric-bass, piano, rhodes, electric-guitar, organ, trumpet-muted, percussion
    expect(ids).toContain('funk-drum-kit');
    expect(ids).toContain('electric-bass');
    expect(ids).toContain('piano');
    expect(ids).toContain('rhodes');
    expect(ids).toContain('electric-guitar');
    expect(ids).toContain('organ');
    expect(ids).toContain('trumpet-muted');
    expect(ids).toContain('percussion');
    expect(ids).toHaveLength(8);
  });
});

// ─── getEnsemblePreset ────────────────────────────────────────────────────────

describe('getEnsemblePreset', () => {
  it('returns EnsemblePreset with id, name, and full instrumentSettings', () => {
    const preset = getEnsemblePreset('swing', 'trio');
    expect(preset.id).toBe('trio');
    expect(preset.name).toBe('Трио');
    expect(Object.keys(preset.instrumentSettings)).toHaveLength(16);
  });

  it('enabled instruments merge style defaults with ensemble volumes', () => {
    const preset = getEnsemblePreset('swing', 'trio');
    const { instrumentSettings: s } = preset;
    expect(s.drums).toEqual({ enabled: true, volume: 0.7, pattern: 'swing' });
    expect(s['upright-bass']).toEqual({
      enabled: true,
      volume: 0.75,
      pattern: 'walking',
      tension: 'moderate',
      humanize: { phrasing: 'expressive' },
    });
    expect(s.piano).toEqual({
      enabled: true,
      volume: 0.7,
      pattern: 'swing-sparse',
      voicing: 'rootless3',
      tension: 'moderate',
      humanize: {
        timingJitterMs: 'low',
        velocityVariation: 'medium',
        chordSpreadMs: 'low',
        phrasing: 'expressive',
        humanizeTiming: 'slight-lag',
      },
    });
  });

  it('disabled instruments have OFF settings', () => {
    const preset = getEnsemblePreset('swing', 'trio');
    expect(preset.instrumentSettings.organ).toEqual({ enabled: false, volume: 0 });
    expect(preset.instrumentSettings['electric-guitar']).toEqual({ enabled: false, volume: 0 });
    expect(preset.instrumentSettings['funk-drum-kit']).toEqual({ enabled: false, volume: 0 });
  });

  it('full ensemble returns correct name', () => {
    const preset = getEnsemblePreset('bossa', 'full');
    expect(preset.name).toBe('Полный состав');
  });
});

// ─── getEnsemblePresets ───────────────────────────────────────────────────────

describe('getEnsemblePresets', () => {
  it('returns 5 presets for every style', () => {
    for (const style of ALL_STYLES) {
      const presets = getEnsemblePresets(style);
      expect(presets).toHaveLength(5);
      const ids = presets.map((p) => p.id);
      expect(ids).toEqual(['duet', 'trio', 'quartet', 'quintet', 'full']);
    }
  });

  it('every preset has a non-empty name', () => {
    const presets = getEnsemblePresets('swing');
    for (const p of presets) {
      expect(p.name.length).toBeGreaterThan(0);
    }
  });
});

// ─── applyEnsemble ────────────────────────────────────────────────────────────

describe('applyEnsemble', () => {
  it('swing trio enables Drums, Piano, Bass and disables others', () => {
    const settings = applyEnsemble('swing', 'trio', {});
    expect(settings.drums.enabled).toBe(true);
    expect(settings.piano.enabled).toBe(true);
    expect(settings['upright-bass'].enabled).toBe(true);
  });

  it('funk quintet enables Funk Drum Kit, Bass, Piano, Electric Guitar, Organ', () => {
    const settings = applyEnsemble('funk', 'quintet', {});
    expect(settings['funk-drum-kit'].enabled).toBe(true);
    expect(settings['electric-bass'].enabled).toBe(true);
  });

  it('merges user overrides on top of ensemble defaults', () => {
    const settings = applyEnsemble('swing', 'trio', {
      drums: { volume: 0.5 },
      rhodes: { enabled: true, volume: 0.6 },
    });
    // Overridden volume
    expect(settings.drums.volume).toBe(0.5);
    expect(settings.drums.enabled).toBe(true);
    // Manually enabled
    expect(settings.rhodes.enabled).toBe(true);
    expect(settings.rhodes.volume).toBe(0.6);
    // Unchanged
    expect(settings['upright-bass'].volume).toBe(0.75);
    expect(settings.piano.volume).toBe(0.7);
  });

  it('returns all 16 instruments', () => {
    const settings = applyEnsemble('ballad', 'duet', {});
    expect(Object.keys(settings)).toHaveLength(16);
  });

  it('full ensemble enables all non-hidden instruments', () => {
    const settings = applyEnsemble('latin', 'full', {});
    expect(settings.drums.enabled).toBe(true);
    expect(settings.percussion.enabled).toBe(true);
    expect(settings['upright-bass'].enabled).toBe(true);
    // Hidden for latin (funk-drum-kit is active, jazz-drum-kit is off):
    expect(settings['jazz-drum-kit'].enabled).toBe(false);
    expect(settings.guitar.enabled).toBe(false);
    expect(settings['electric-guitar'].enabled).toBe(false);
    expect(settings.organ.enabled).toBe(false);
    expect(settings.clarinet.enabled).toBe(false);
  });
});
