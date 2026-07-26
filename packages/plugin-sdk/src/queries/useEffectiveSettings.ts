import { useEffect, useRef } from 'react';
import type { Style, UserSettingsDTO } from '@jazz/shared';
import { applyStyleDefaults } from '@jazz/music-core';
import { useAuth } from './useAuth';
import { useSettings, useUpdateSettings } from './useSettings';
import { useDefaultSettings } from './useDefaultSettings';
import { useLocalSettingsStore, DEFAULT_SETTINGS } from '../stores/useLocalSettingsStore';

export function useEffectiveSettings(): UserSettingsDTO {
  const { user } = useAuth();
  const { data: serverSettings } = useSettings();
  const { data: defaultSettings } = useDefaultSettings();
  const { settings: localSettings } = useLocalSettingsStore();
  const updateSettings = useUpdateSettings();
  const migratedRef = useRef(false);

  useEffect(() => {
    if (!user || !serverSettings || migratedRef.current) return;

    const stored = localStorage.getItem('jazz-settings-migrated');
    if (stored) return;

    const hasLocalCustom =
      localSettings.bpm !== 120 || localSettings.volume !== 0.8 || localSettings.countIn !== 1;

    if (hasLocalCustom) {
      migratedRef.current = true;
      updateSettings.mutate(localSettings, {
        onSuccess: () => {
          localStorage.setItem('jazz-settings-migrated', '1');
        },
      });
    }
  }, [user, serverSettings, localSettings, updateSettings]);

  if (user && serverSettings) return serverSettings;

  // Guests: admin defaults are the authoritative base.
  // LocalStorage only overrides for keys the guest explicitly changed
  // (i.e., localVal differs from the hardcoded DEFAULT_SETTINGS).
  if (defaultSettings) {
    const merged = { ...defaultSettings } as Record<string, unknown>;

    // Track which keys the guest explicitly changed so we only promote
    // guest overrides into per-style storage — admin defaults stay as
    // scalar values and are resolved naturally by applyStyleDefaults.
    const guestOverrideKeys = new Set<string>();
    for (const key of Object.keys(localSettings as Record<string, unknown>)) {
      const localVal = (localSettings as Record<string, unknown>)[key];
      const hardDefault = (DEFAULT_SETTINGS as Record<string, unknown>)[key];
      if (localVal !== hardDefault) {
        // Guard: do not let a stale countIn: 0 (from a metronome-off toggle)
        // override the admin default when metronome is enabled.
        if (key === 'countIn' && localVal === 0 && (merged.metronomeEnabled as boolean) !== false) {
          continue;
        }
        merged[key] = localVal;
        guestOverrideKeys.add(key);
      }
    }

    // Resolve style AFTER guest overrides — the guest may have switched
    // style in the player, which updates localSettings.style. Using the
    // stale defaultSettings.style would cause per-style admin overrides
    // for the active style to be silently ignored.
    const style = ((merged as Record<string, unknown>).style ?? 'swing') as Style;

    // Per-style keys from admin defaults stay as scalar values in `merged`
    // so applyStyleDefaults can correctly resolve them per the active style.
    // Only guest overrides are promoted into perStyleOverrides — this
    // prevents admin defaults for one style from leaking into another.
    const perStyleKeys = new Set([
      'bassEnabled',
      'bassVolume',
      'bassVariant',
      'bassTension',
      'bassHumanize',
      'bassPattern',
      'bassRange',
      'bassComplexity',
      'bassUseMutedNotes',
      'pianoEnabled',
      'pianoVolume',
      'pianoPattern',
      'pianoHumanize',
      'pianoVoicingDensity',
      'pianoSampleLibrary',
      'pianoTension',
      'pianoRandomizationLevel',
      'rhodesEnabled',
      'rhodesVolume',
      'rhodesPattern',
      'rhodesVoicingDensity',
      'rhodesMode',
      'rhodesLayerMode',
      'rhodesLayerVolume',
      'drumsEnabled',
      'drumsVolume',
      'drumKit',
      'drumsPattern',
      'drumsHumanizeIntensity',
      'drumsBassDrumEnabled',
      'drumsBassDrumVolume',
      'drumsSnareEnabled',
      'drumsSnareVolume',
      'drumsHihatEnabled',
      'drumsHihatVolume',
      'drumsHihatOpenness',
      'drumsRideEnabled',
      'drumsRideVolume',
      'drumsCrashEnabled',
      'drumsCrashVolume',
      'drumsCrashFrequency',
      'drumsRimEnabled',
      'drumsRimVolume',
      'drumsTomEnabled',
      'drumsTomVolume',
      'percussionEnabled',
      'percussionVolume',
      'percussionPattern',
      'percussionHumanizeIntensity',
      'percussionCongaHighEnabled',
      'percussionCongaHighVolume',
      'percussionCongaLowEnabled',
      'percussionCongaLowVolume',
      'percussionBongoLowEnabled',
      'percussionBongoLowVolume',
      'percussionTumbaEnabled',
      'percussionTumbaVolume',
      'percussionTimbalesEnabled',
      'percussionTimbalesVolume',
      'percussionCowbellEnabled',
      'percussionCowbellVolume',
      'percussionClaveEnabled',
      'percussionClaveVolume',
      'percussionShakerEnabled',
      'percussionShakerVolume',
      'percussionGuiroEnabled',
      'percussionGuiroVolume',
      'percussionCabasaEnabled',
      'percussionCabasaVolume',
      'percussionTriangleEnabled',
      'percussionTriangleVolume',
      'percussionTambourineEnabled',
      'percussionTambourineVolume',
      'percussionVibraslapEnabled',
      'percussionVibraslapVolume',
      'percussionBelltreeEnabled',
      'percussionBelltreeVolume',
      'percussionWhistleEnabled',
      'percussionWhistleVolume',
      'percussionSleighBellsEnabled',
      'percussionSleighBellsVolume',
      'guitarEnabled',
      'guitarVolume',
      'bpm',
      'swingRatio',
    ]);

    const perStyleOverrides = {
      ...(((merged as Record<string, unknown>).perStyleOverrides as Record<
        string,
        Record<string, unknown>
      >) ?? {}),
    };
    const styleOverrides = { ...(perStyleOverrides[style] ?? {}) };

    for (const key of perStyleKeys) {
      // Only promote keys that the guest explicitly changed. Admin defaults'
      // scalar values stay in `merged` and are resolved by applyStyleDefaults
      // per the active style — without leaking across styles.
      if (!guestOverrideKeys.has(key)) continue;
      if (key in merged && (merged as Record<string, unknown>)[key] !== undefined) {
        styleOverrides[key] = (merged as Record<string, unknown>)[key];
        delete (merged as Record<string, unknown>)[key];
      }
    }

    if (Object.keys(styleOverrides).length > 0) {
      perStyleOverrides[style] = styleOverrides;
      (merged as Record<string, unknown>).perStyleOverrides = perStyleOverrides;
    }

    return applyStyleDefaults(merged as UserSettingsDTO, style);
  }

  return applyStyleDefaults({ ...localSettings }, (localSettings.style ?? 'swing') as Style);
}
