import { describe, it, expect } from 'vitest';
import { STYLES } from '@jazz/shared';
import type { UserSettingsDTO } from '@jazz/shared';
import { applyStyleDefaults } from './styleSettings.js';

/** Minimal base settings object that mirrors the guest local store defaults. */
const GUEST_DEFAULTS: Partial<UserSettingsDTO> = {
  bpm: 120,
  pianoEnabled: false,
  rhodesEnabled: false,
  bassEnabled: true,
  style: 'swing',
};

describe('applyStyleDefaults', () => {
  it('resolves swing profile defaults for a guest without per-style overrides', () => {
    const resolved = applyStyleDefaults(GUEST_DEFAULTS, 'swing');

    // Piano is required in swing — profile overrides the local `false`.
    expect(resolved.pianoEnabled).toBe(true);
    // Rhodes is recommended-only (not enabled) in swing.
    expect(resolved.rhodesEnabled).toBe(false);
    // Bass variant resolved from defaultVariants.bass = upright-bass.
    expect(resolved.bassVariant).toBe('upright');
    expect(resolved.drumKit).toBe('jazz-drum-kit');
    // Tempo and swing come from the profile, not the scalar `120` / local default.
    expect(resolved.bpm).toBe(140);
    expect(resolved.swingRatio).toBe(0.67);
  });

  it('resolves bossa profile defaults independently', () => {
    const resolved = applyStyleDefaults({ ...GUEST_DEFAULTS, style: 'bossa' }, 'bossa');

    expect(resolved.bpm).toBe(120);
    // Bossa default drum variant is funk-drum-kit.
    expect(resolved.drumKit).toBe('funk-drum-kit');
    expect(resolved.swingRatio).toBe(0.5);
  });

  it('explicit per-style override wins over the profile default (including false)', () => {
    const settings: Partial<UserSettingsDTO> = {
      ...GUEST_DEFAULTS,
      perStyleOverrides: { swing: { pianoEnabled: false } },
    };

    const resolved = applyStyleDefaults(settings, 'swing');

    expect(resolved.pianoEnabled).toBe(false);
  });

  it('per-style override for bpm wins over profile.defaultTempo', () => {
    const settings: Partial<UserSettingsDTO> = {
      ...GUEST_DEFAULTS,
      perStyleOverrides: { swing: { bpm: 180 } },
    };

    const resolved = applyStyleDefaults(settings, 'swing');

    expect(resolved.bpm).toBe(180);
  });

  it('scalar value without a per-style override is overwritten by profile (per-style isolation)', () => {
    // The user once enabled piano on scalar column but never saved a per-style override.
    const settings: Partial<UserSettingsDTO> = {
      ...GUEST_DEFAULTS,
      pianoEnabled: true,
    };

    const resolved = applyStyleDefaults(settings, 'bossa');

    // Bossa has piano enabled, so the result is still true — but sourced from profile, not input.
    expect(resolved.pianoEnabled).toBe(true);

    // Conversely, rhodes is disabled in bossa: scalar `true` must be overwritten.
    const withRhodesScalar: Partial<UserSettingsDTO> = { ...settings, rhodesEnabled: true };
    const resolvedRhodes = applyStyleDefaults(withRhodesScalar, 'bossa');
    expect(resolvedRhodes.rhodesEnabled).toBe(false);
  });

  it('does not mutate the input settings object', () => {
    const input: Partial<UserSettingsDTO> = {
      ...GUEST_DEFAULTS,
      pianoEnabled: false,
      bpm: 120,
    };

    applyStyleDefaults(input, 'swing');

    expect(input.pianoEnabled).toBe(false);
    expect(input.bpm).toBe(120);
  });

  it('resolves electric bass variant for funk', () => {
    const resolved = applyStyleDefaults({ ...GUEST_DEFAULTS, style: 'funk' }, 'funk');

    expect(resolved.bassVariant).toBe('electric');
  });

  // ── Cross-style guarantees (UI/audio consistency + isolation) ─────────────
  // The player's audio path and the instruments panel both resolve enabled
  // state via applyStyleDefaults under the *active* style. These tests lock in
  // that, for every style, an admin per-style override is honored and never
  // leaks into another style — the invariant behind "UI matches what plays".

  const INSTRUMENT_FLAGS = [
    'bassEnabled',
    'pianoEnabled',
    'rhodesEnabled',
    'drumsEnabled',
    'percussionEnabled',
    'guitarEnabled',
  ] as const;

  it.each([...STYLES])('resolution is deterministic and pure for %s', (style) => {
    const input: Partial<UserSettingsDTO> = { ...GUEST_DEFAULTS, style };
    const a = applyStyleDefaults(input, style);
    const b = applyStyleDefaults({ ...GUEST_DEFAULTS, style }, style);
    // Same input → same enabled state (guarantees UI and audio agree).
    for (const flag of INSTRUMENT_FLAGS) {
      expect(a[flag]).toBe(b[flag]);
    }
  });

  it.each([...STYLES])(
    'honors an explicit per-style instrument override (incl. false) for %s',
    (style) => {
      for (const flag of INSTRUMENT_FLAGS) {
        for (const value of [true, false]) {
          const resolved = applyStyleDefaults(
            { ...GUEST_DEFAULTS, style, perStyleOverrides: { [style]: { [flag]: value } } },
            style,
          );
          expect(resolved[flag]).toBe(value);
        }
      }
    },
  );

  it('per-style override does not leak across styles', () => {
    // Disable drums for funk only; every other style keeps its own default.
    const settings: Partial<UserSettingsDTO> = {
      ...GUEST_DEFAULTS,
      perStyleOverrides: { funk: { drumsEnabled: false } },
    };

    expect(applyStyleDefaults(settings, 'funk').drumsEnabled).toBe(false);

    for (const style of STYLES.filter((s) => s !== 'funk')) {
      const resolved = applyStyleDefaults({ ...settings, style }, style);
      // Untouched styles fall back to their profile default (drums on for all).
      expect(resolved.drumsEnabled).toBe(true);
    }
  });
});
