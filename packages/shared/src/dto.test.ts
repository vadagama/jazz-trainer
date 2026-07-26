import { describe, it, expect } from 'vitest';
import {
  CLICK_SOUNDS,
  METRONOME_MODES,
  UserSettingsDTOSchema,
  UpdateSettingsSchema,
  CreateFlagSchema,
  UpdateFlagSchema,
  FLAG_CATEGORIES,
  FLAG_TARGET_ROLES,
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

describe('Feature flag DTO — CreateFlagSchema', () => {
  it('FLAG_CATEGORIES has the 4 vision categories', () => {
    expect(FLAG_CATEGORIES).toEqual(['feature', 'experiment', 'maintenance', 'killswitch']);
  });

  it('FLAG_TARGET_ROLES has all known roles', () => {
    expect(FLAG_TARGET_ROLES).toEqual(['super_admin', 'admin', 'catalog_editor', 'user', 'subscriber_free', 'subscriber_pro', 'subscriber_premium']);
  });

  it('accepts a minimal valid flag with just a key', () => {
    const result = CreateFlagSchema.parse({ key: 'new-feature' });
    expect(result.key).toBe('new-feature');
    expect(result.enabled).toBe(false);
    expect(result.description).toBeUndefined();
    expect(result.category).toBeUndefined();
    expect(result.roles).toBeUndefined();
    expect(result.rolloutPercent).toBeUndefined();
  });

  it('accepts a fully populated flag', () => {
    const result = CreateFlagSchema.parse({
      key: 'beta-ui',
      description: 'Beta catalog UI',
      category: 'experiment',
      enabled: true,
      roles: ['admin', 'super_admin'],
      userIds: ['user-a'],
      rolloutPercent: 30,
      expiresAt: 1893456000000,
    });
    expect(result.key).toBe('beta-ui');
    expect(result.category).toBe('experiment');
    expect(result.enabled).toBe(true);
    expect(result.rolloutPercent).toBe(30);
  });

  it('allows dots, dashes, digits in key', () => {
    expect(CreateFlagSchema.parse({ key: 'catalog.v2-ui' }).key).toBe('catalog.v2-ui');
    expect(CreateFlagSchema.parse({ key: 'a_b-c.d' }).key).toBe('a_b-c.d');
  });

  it('rejects empty key', () => {
    expect(() => CreateFlagSchema.parse({ key: '' })).toThrow();
  });

  it('rejects uppercase and invalid characters in key', () => {
    expect(() => CreateFlagSchema.parse({ key: 'NewFeature' })).toThrow();
    expect(() => CreateFlagSchema.parse({ key: 'new feature' })).toThrow();
    expect(() => CreateFlagSchema.parse({ key: 'new@feature' })).toThrow();
  });

  it('rejects key longer than 100 chars', () => {
    expect(() => CreateFlagSchema.parse({ key: 'a'.repeat(101) })).toThrow();
    expect(CreateFlagSchema.parse({ key: 'a'.repeat(100) }).key).toHaveLength(100);
  });

  it('rejects unknown category', () => {
    expect(() => CreateFlagSchema.parse({ key: 'x', category: 'unknown' })).toThrow();
  });

  it('rejects rolloutPercent out of range', () => {
    expect(() => CreateFlagSchema.parse({ key: 'x', rolloutPercent: -1 })).toThrow();
    expect(() => CreateFlagSchema.parse({ key: 'x', rolloutPercent: 101 })).toThrow();
    expect(CreateFlagSchema.parse({ key: 'x', rolloutPercent: 0 }).rolloutPercent).toBe(0);
    expect(CreateFlagSchema.parse({ key: 'x', rolloutPercent: 100 }).rolloutPercent).toBe(100);
  });

  it('rejects non-positive expiresAt', () => {
    expect(() => CreateFlagSchema.parse({ key: 'x', expiresAt: 0 })).toThrow();
    expect(() => CreateFlagSchema.parse({ key: 'x', expiresAt: -1 })).toThrow();
  });

  it('defaults enabled to false', () => {
    expect(CreateFlagSchema.parse({ key: 'x' }).enabled).toBe(false);
    expect(CreateFlagSchema.parse({ key: 'x', enabled: true }).enabled).toBe(true);
  });
});

describe('Feature flag DTO — UpdateFlagSchema', () => {
  it('allows empty object (no-op patch)', () => {
    const result = UpdateFlagSchema.parse({});
    expect(result).toEqual({});
  });

  it('allows partial updates', () => {
    const result = UpdateFlagSchema.parse({ enabled: true, description: 'updated' });
    expect(result.enabled).toBe(true);
    expect(result.description).toBe('updated');
  });

  it('omits key (immutable on update)', () => {
    const result = UpdateFlagSchema.parse({ key: 'should-be-ignored', enabled: true });
    expect(result).not.toHaveProperty('key');
    expect(result.enabled).toBe(true);
  });

  it('rejects invalid category in patch', () => {
    expect(() => UpdateFlagSchema.parse({ category: 'nope' })).toThrow();
  });
});
