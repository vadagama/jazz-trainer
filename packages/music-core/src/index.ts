/** Public entry point of the music-core package. */

/** Package marker — replaced by real exports as features land (F1–F3). */
export const MUSIC_CORE_VERSION = '0.0.0';

export * from './chords/index.js';
export * from './dsl/index.js';
export * from './time/index.js';
export * from './playback/index.js';
export * from './audio/index.js';
export * from './generator/index.js';
export {
  getStyleProfile,
  getAllStyleProfiles,
  getRoster,
  getVisibleInstruments,
  getVisibleInstrumentGroups,
  getInstrumentGroup,
  getDefaultVariant,
  resolveGroupInstrumentId,
  getDefaultEnsemble,
  getEnsemblePreset,
  getEnsemblePresets,
  applyEnsemble,
  INSTRUMENT_GROUPS,
} from './styleProfile.js';
export type {
  InstrumentId,
  InstrumentGroupId,
  InstrumentVariantDef,
  InstrumentGroupDef,
  InstrumentRoster,
  InstrumentStyleDefaults,
  DisplayGroup,
  EnsembleType,
  EnsembleSettings,
  EnsemblePreset,
  StyleProfile,
} from './styleProfile.js';
