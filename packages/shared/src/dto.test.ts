import { describe, it, expect } from 'vitest';
import {
  CLICK_SOUNDS,
  METRONOME_MODES,
  UserSettingsDTOSchema,
  UpdateSettingsSchema,
  type UserSettingsDTO,
} from '@jazz/shared';

describe('UserSettingsDTO — metronome fields', () => {
  it('CLICK_SOUNDS contains 8 values including new percussive sounds', () => {
    expect(CLICK_SOUNDS).toHaveLength(8);
    expect(CLICK_SOUNDS).toContain('cross-stick');
    expect(CLICK_SOUNDS).toContain('hh-chick');
    expect(CLICK_SOUNDS).toContain('hh-closed');
  });

  it('METRONOME_MODES contains 3 values', () => {
    expect(METRONOME_MODES).toEqual(['both', 'pickup-only', 'main-only']);
  });

  it('accepts minimal valid settings (new fields are optional)', () => {
    const result = UserSettingsDTOSchema.parse({
      bpm: 120,
      clickStrong: null,
      clickStrong2: null,
      clickWeak: null,
      volume: 0.8,
      countIn: 1,
    });
    // Optional fields are undefined when not provided
    expect(result.metronomeMode).toBeUndefined();
    expect(result.metronomeStrongEnabled).toBeUndefined();
    expect(result.metronomeStrongVolume).toBeUndefined();
  });

  it('allows explicit metronomeMode values', () => {
    for (const mode of METRONOME_MODES) {
      const result = UserSettingsDTOSchema.parse({
        bpm: 120,
        clickStrong: null,
        clickStrong2: null,
        clickWeak: null,
        volume: 0.8,
        countIn: 1,
        metronomeMode: mode,
      });
      expect(result.metronomeMode).toBe(mode);
    }
  });

  it('rejects invalid metronomeMode', () => {
    expect(() =>
      UserSettingsDTOSchema.parse({
        bpm: 120,
        clickStrong: null,
        clickStrong2: null,
        clickWeak: null,
        volume: 0.8,
        countIn: 1,
        metronomeMode: 'invalid',
      }),
    ).toThrow();
  });

  it('clamps metronome volumes to 0–1', () => {
    expect(() =>
      UserSettingsDTOSchema.parse({
        bpm: 120,
        clickStrong: null,
        clickStrong2: null,
        clickWeak: null,
        volume: 0.8,
        countIn: 1,
        metronomeStrongVolume: 1.5,
      }),
    ).toThrow();
  });

  it('UpdateSettingsSchema allows partial updates of metronome fields', () => {
    const result = UpdateSettingsSchema.parse({ metronomeMode: 'pickup-only' });
    expect(result.metronomeMode).toBe('pickup-only');
  });

  it('parsed DTO has all 7 new fields with correct types', () => {
    const full: UserSettingsDTO = UserSettingsDTOSchema.parse({
      bpm: 140,
      clickStrong: 'cross-stick',
      clickStrong2: 'hh-chick',
      clickWeak: 'hh-closed',
      volume: 0.9,
      countIn: 2,
      metronomeMode: 'main-only',
      metronomeStrongEnabled: false,
      metronomeStrongVolume: 0.5,
      metronomeStrong2Enabled: true,
      metronomeStrong2Volume: 0.7,
      metronomeWeakEnabled: false,
      metronomeWeakVolume: 0.3,
    });
    expect(full.clickStrong).toBe('cross-stick');
    expect(full.metronomeMode).toBe('main-only');
    expect(full.metronomeStrongEnabled).toBe(false);
    expect(full.metronomeWeakEnabled).toBe(false);
    expect(full.metronomeWeakVolume).toBe(0.3);
  });
});
