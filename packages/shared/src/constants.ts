/**
 * Domain enums and constants shared by web, api and music-core.
 * Pure data — no runtime-framework dependencies.
 */

/** Time signatures supported by the metronome/grid (see docs/02-audio-engine.md). */
export const TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '7/4', '6/8', '12/8'] as const;
export type TimeSignatureString = (typeof TIME_SIGNATURES)[number];

/** The twelve keys used by the harmony generator (see docs/06-dsl.md). */
export const KEYS = [
  'C',
  'C#',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;
export type Key = (typeof KEYS)[number];

/** Metronome click sound identifiers. */
export const CLICK_SOUNDS = [
  'analog-metronome',
  'button-click',
  'drum-stick',
  'retro-stick',
  'switch',
  'cross-stick',
  'hh-chick',
  'hh-closed',
] as const;
export type ClickSound = (typeof CLICK_SOUNDS)[number];

/** Metronome playback modes. */
export const METRONOME_MODES = ['both', 'pickup-only', 'main-only'] as const;
export type MetronomeMode = (typeof METRONOME_MODES)[number];

/** Grid visibility (public-first model, see docs/03-data-model.md). */
export const VISIBILITY = ['public', 'private'] as const;
export type Visibility = (typeof VISIBILITY)[number];

/** Auth providers. */
export const AUTH_PROVIDERS = ['google', 'dev', 'system'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/** Global playback styles — affects all instruments (drums, piano, bass, rhodes). */
export const STYLES = ['swing', 'bossa', 'funk', 'latin', 'ballad'] as const;
export type Style = (typeof STYLES)[number];

// ── Catalog (§2.2, §2.3 CATALOG-VISION.md) ─────────────────────────────────

/** Composition difficulty levels for the public catalog. */
export const CATALOG_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type CatalogDifficulty = (typeof CATALOG_DIFFICULTIES)[number];

/** Moderation status for catalog entries. */
export const CATALOG_MODERATION_STATUS = ['draft', 'approved', 'modified', 'rejected'] as const;
export type CatalogModerationStatus = (typeof CATALOG_MODERATION_STATUS)[number];

/** Tag categories for the controlled catalog vocabulary (§2.3). */
export const CATALOG_TAG_CATEGORIES = ['genre', 'harmony', 'ensemble', 'method'] as const;
export type CatalogTagCategory = (typeof CATALOG_TAG_CATEGORIES)[number];

export interface CatalogTagDef {
  value: string;
  category: CatalogTagCategory;
}

/**
 * Closed tag vocabulary for the catalog (§2.3).
 * Controlled by admins via the admin-catalog plugin; not free-form.
 */
export const CATALOG_TAGS: readonly CatalogTagDef[] = [
  // Genre / Form
  { value: 'jazz-standard', category: 'genre' },
  { value: 'blues', category: 'genre' },
  { value: 'bebop', category: 'genre' },
  { value: 'modal', category: 'genre' },
  { value: 'latin', category: 'genre' },
  { value: 'funk', category: 'genre' },
  { value: 'ballad', category: 'genre' },
  { value: 'free-jazz', category: 'genre' },
  // Harmony
  { value: 'ii-V-I', category: 'harmony' },
  { value: 'rhythm-changes', category: 'harmony' },
  { value: 'coltrane-changes', category: 'harmony' },
  { value: 'modal-interchange', category: 'harmony' },
  { value: 'turnaround', category: 'harmony' },
  { value: 'tritone-sub', category: 'harmony' },
  { value: 'secondary-dominants', category: 'harmony' },
  { value: 'diminished', category: 'harmony' },
  // Ensemble
  { value: 'trio', category: 'ensemble' },
  { value: 'quartet', category: 'ensemble' },
  { value: 'quintet', category: 'ensemble' },
  { value: 'big-band', category: 'ensemble' },
  { value: 'solo-piano', category: 'ensemble' },
  // Method
  { value: 'voice-leading', category: 'method' },
  { value: 'rootless-voicings', category: 'method' },
  { value: 'shell-voicings', category: 'method' },
  { value: 'walking-bass', category: 'method' },
  { value: 'comping', category: 'method' },
] as const;
