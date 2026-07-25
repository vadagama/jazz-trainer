import type { Style, UserSettingsDTO } from '@jazz/shared';
import { getStyleProfile } from './styleProfile.js';
import type { InstrumentId } from './styleProfile.js';

/**
 * Apply style-driven defaults to a partial settings object.
 *
 * Implements "per-style isolation": scalar column values for style-specific
 * fields leak across styles, so for fields without an explicit per-style
 * override we prefer the style profile's instrument defaults. This is the
 * single source of truth — used by both the API (`toSettingsDTO`) and the
 * client (`useEffectiveSettings`), so authorized and guest users resolve
 * settings identically.
 *
 * Two-phase resolution (mirrors the original inline block in `auth.service.ts`):
 * 1. Overlay: per-style overrides (`perStyleOverrides[style]`) are applied on
 *    top of the scalar values. Explicit overrides win — including `false`.
 * 2. Profile defaults: for style-specific fields WITHOUT a per-style override,
 *    the `StyleProfile.instrumentDefaults` value replaces any scalar value
 *    (which would otherwise leak across styles).
 *
 * The function never mutates its input. Humanize normalization of legacy
 * numeric values remains the caller's responsibility (server-side concern).
 */
export function applyStyleDefaults(
  settings: Partial<UserSettingsDTO>,
  style: Style,
): UserSettingsDTO {
  const profile = getStyleProfile(style);
  const pd = profile.instrumentDefaults;
  const activeBass = (profile.defaultVariants.bass ?? 'upright-bass') as InstrumentId;
  const activeDrums = (profile.defaultVariants.drums ?? 'drums') as InstrumentId;
  const activeGuitar = (profile.defaultVariants.guitar ?? 'guitar') as InstrumentId;

  const perStyle = settings.perStyleOverrides?.[style];
  const has = (k: string): boolean => perStyle != null && k in perStyle;

  // Phase 1: shallow clone + overlay per-style overrides on top.
  const resolved: UserSettingsDTO = { ...(settings as UserSettingsDTO) };
  if (perStyle) {
    for (const [key, value] of Object.entries(perStyle)) {
      if (value !== undefined) {
        (resolved as Record<string, unknown>)[key] = value;
      }
    }
  }

  // Phase 2: for style-specific fields without an override, prefer profile defaults.
  // Enabled/Volume — from StyleProfile instrumentDefaults.
  if (!has('bassEnabled')) resolved.bassEnabled = pd[activeBass]?.enabled;
  if (!has('bassVolume')) resolved.bassVolume = pd[activeBass]?.volume ?? 0.7;
  if (!has('bassVariant'))
    resolved.bassVariant = activeBass === 'electric-bass' ? 'electric' : 'upright';
  if (!has('bassTension'))
    resolved.bassTension = (pd[activeBass]?.tension as UserSettingsDTO['bassTension']) ?? 'clean';
  if (!has('pianoEnabled')) resolved.pianoEnabled = pd.piano?.enabled;
  if (!has('pianoVolume')) resolved.pianoVolume = pd.piano?.volume ?? 0.7;
  if (!has('rhodesEnabled')) resolved.rhodesEnabled = pd.rhodes?.enabled;
  if (!has('rhodesVolume')) resolved.rhodesVolume = pd.rhodes?.volume ?? 0.5;
  if (!has('drumKit'))
    resolved.drumKit = activeDrums === 'funk-drum-kit' ? 'funk-drum-kit' : 'jazz-drum-kit';
  if (!has('drumsEnabled')) resolved.drumsEnabled = pd[activeDrums]?.enabled;
  if (!has('drumsVolume')) resolved.drumsVolume = pd[activeDrums]?.volume ?? 0.7;
  if (!has('percussionEnabled')) resolved.percussionEnabled = pd.percussion?.enabled;
  if (!has('percussionVolume')) resolved.percussionVolume = pd.percussion?.volume ?? 0.7;
  if (!has('guitarEnabled')) resolved.guitarEnabled = pd[activeGuitar]?.enabled;
  if (!has('guitarVolume')) resolved.guitarVolume = pd[activeGuitar]?.volume ?? 0.6;

  // Per-style tempo & swing.
  if (!has('swingRatio')) resolved.swingRatio = profile.swingRatio;
  if (!has('bpm')) resolved.bpm = profile.defaultTempo;

  // Bass — remaining per-style fields (no profile-level defaults, use hardcoded).
  if (!has('bassComplexity')) resolved.bassComplexity = 1;
  if (!has('bassHumanize')) resolved.bassHumanize = undefined;
  if (!has('bassUseMutedNotes')) resolved.bassUseMutedNotes = true;
  if (!has('bassPattern')) resolved.bassPattern = null;
  if (!has('bassRange')) resolved.bassRange = 'medium';

  // Piano — remaining per-style fields.
  if (!has('pianoVoicingDensity'))
    resolved.pianoVoicingDensity =
      (pd.piano?.voicing as UserSettingsDTO['pianoVoicingDensity']) ?? 'rootless3';
  if (!has('pianoSampleLibrary'))
    resolved.pianoSampleLibrary = (pd.piano?.mode as UserSettingsDTO['pianoSampleLibrary']) ?? 'salamander';
  if (!has('pianoTension'))
    resolved.pianoTension =
      (pd.piano?.tension as UserSettingsDTO['pianoTension']) ?? 'clean';
  if (!has('pianoHumanize')) resolved.pianoHumanize = undefined;
  if (!has('pianoPattern')) resolved.pianoPattern = null;
  if (!has('pianoRandomizationLevel')) resolved.pianoRandomizationLevel = 'off';

  // Rhodes — remaining per-style fields.
  if (!has('rhodesVoicingDensity'))
    resolved.rhodesVoicingDensity =
      (pd.rhodes?.voicing as UserSettingsDTO['rhodesVoicingDensity']) ?? 'rootless3';
  if (!has('rhodesMode'))
    resolved.rhodesMode =
      (pd.rhodes?.mode as UserSettingsDTO['rhodesMode']) ?? 'halfNotes';
  if (!has('rhodesLayerMode'))
    resolved.rhodesLayerMode =
      (pd.rhodes?.mode as UserSettingsDTO['rhodesLayerMode']) ?? 'none';
  if (!has('rhodesLayerVolume')) resolved.rhodesLayerVolume = 0.5;
  if (!has('rhodesPattern')) resolved.rhodesPattern = undefined;

  // Drums — remaining per-style fields.
  if (!has('drumsPattern')) resolved.drumsPattern = null;
  if (!has('drumsHumanizeIntensity')) resolved.drumsHumanizeIntensity = 'med';
  if (!has('drumsBassDrumEnabled')) resolved.drumsBassDrumEnabled = true;
  if (!has('drumsBassDrumVolume')) resolved.drumsBassDrumVolume = 0.7;
  if (!has('drumsSnareEnabled')) resolved.drumsSnareEnabled = true;
  if (!has('drumsSnareVolume')) resolved.drumsSnareVolume = 0.8;
  if (!has('drumsHihatEnabled')) resolved.drumsHihatEnabled = true;
  if (!has('drumsHihatVolume')) resolved.drumsHihatVolume = 0.65;
  if (!has('drumsHihatOpenness')) resolved.drumsHihatOpenness = 0;
  if (!has('drumsRideEnabled')) resolved.drumsRideEnabled = true;
  if (!has('drumsRideVolume')) resolved.drumsRideVolume = 0.7;
  if (!has('drumsCrashEnabled')) resolved.drumsCrashEnabled = true;
  if (!has('drumsCrashVolume')) resolved.drumsCrashVolume = 0.8;
  if (!has('drumsCrashFrequency')) resolved.drumsCrashFrequency = 4;
  if (!has('drumsRimEnabled')) resolved.drumsRimEnabled = false;
  if (!has('drumsRimVolume')) resolved.drumsRimVolume = 0.6;
  if (!has('drumsTomEnabled')) resolved.drumsTomEnabled = true;
  if (!has('drumsTomVolume')) resolved.drumsTomVolume = 0.7;

  // Percussion — remaining per-style fields.
  if (!has('percussionPattern')) resolved.percussionPattern = null;
  if (!has('percussionHumanizeIntensity'))
    resolved.percussionHumanizeIntensity =
      (pd.percussion?.humanize?.intensity as UserSettingsDTO['percussionHumanizeIntensity']) ?? 'low';

  // Percussion sub-instrument fields — avoid leak across styles.
  if (!has('percussionCongaHighEnabled')) resolved.percussionCongaHighEnabled = true;
  if (!has('percussionCongaHighVolume')) resolved.percussionCongaHighVolume = 0.7;
  if (!has('percussionCongaLowEnabled')) resolved.percussionCongaLowEnabled = true;
  if (!has('percussionCongaLowVolume')) resolved.percussionCongaLowVolume = 0.7;
  if (!has('percussionBongoLowEnabled')) resolved.percussionBongoLowEnabled = true;
  if (!has('percussionBongoLowVolume')) resolved.percussionBongoLowVolume = 0.7;
  if (!has('percussionTumbaEnabled')) resolved.percussionTumbaEnabled = true;
  if (!has('percussionTumbaVolume')) resolved.percussionTumbaVolume = 0.7;
  if (!has('percussionTimbalesEnabled')) resolved.percussionTimbalesEnabled = true;
  if (!has('percussionTimbalesVolume')) resolved.percussionTimbalesVolume = 0.7;
  if (!has('percussionCowbellEnabled')) resolved.percussionCowbellEnabled = true;
  if (!has('percussionCowbellVolume')) resolved.percussionCowbellVolume = 0.7;
  if (!has('percussionClaveEnabled')) resolved.percussionClaveEnabled = true;
  if (!has('percussionClaveVolume')) resolved.percussionClaveVolume = 0.7;
  if (!has('percussionShakerEnabled')) resolved.percussionShakerEnabled = true;
  if (!has('percussionShakerVolume')) resolved.percussionShakerVolume = 0.7;
  if (!has('percussionGuiroEnabled')) resolved.percussionGuiroEnabled = true;
  if (!has('percussionGuiroVolume')) resolved.percussionGuiroVolume = 0.7;
  if (!has('percussionCabasaEnabled')) resolved.percussionCabasaEnabled = true;
  if (!has('percussionCabasaVolume')) resolved.percussionCabasaVolume = 0.7;
  if (!has('percussionTriangleEnabled')) resolved.percussionTriangleEnabled = true;
  if (!has('percussionTriangleVolume')) resolved.percussionTriangleVolume = 0.7;
  if (!has('percussionTambourineEnabled')) resolved.percussionTambourineEnabled = true;
  if (!has('percussionTambourineVolume')) resolved.percussionTambourineVolume = 0.7;
  if (!has('percussionVibraslapEnabled')) resolved.percussionVibraslapEnabled = true;
  if (!has('percussionVibraslapVolume')) resolved.percussionVibraslapVolume = 0.7;
  if (!has('percussionBelltreeEnabled')) resolved.percussionBelltreeEnabled = true;
  if (!has('percussionBelltreeVolume')) resolved.percussionBelltreeVolume = 0.7;
  if (!has('percussionWhistleEnabled')) resolved.percussionWhistleEnabled = true;
  if (!has('percussionWhistleVolume')) resolved.percussionWhistleVolume = 0.7;
  if (!has('percussionSleighBellsEnabled')) resolved.percussionSleighBellsEnabled = true;
  if (!has('percussionSleighBellsVolume')) resolved.percussionSleighBellsVolume = 0.7;

  return resolved;
}
