import type { ChordQuality, Extension, Alteration } from '@jazz/shared';

/**
 * Data-driven chord tables (see docs/06-dsl.md §3–4). Adding a new symbol is a
 * matter of adding a row here — the parser logic does not change.
 */

/** A quality token matched at the start of the (normalized) chord body. */
export interface QualityMatcher {
  /** literal the body must start with (longest/most specific listed first) */
  token: string;
  quality: ChordQuality;
  /** extensions implied by the token itself */
  ext?: Extension[];
  /** alterations implied by the token itself */
  alt?: Alteration[];
  sus?: 'sus2' | 'sus4';
}

/**
 * Ordered longest-/most-specific-first so that e.g. `m7b5` wins over `m7`,
 * and `maj7` over `maj`.
 */
export const QUALITY_MATCHERS: QualityMatcher[] = [
  { token: 'maj7', quality: 'major', ext: ['7'] },
  { token: 'maj9', quality: 'major', ext: ['9'] },
  { token: 'maj', quality: 'major' },
  { token: 'M7', quality: 'major', ext: ['7'] },
  { token: 'M', quality: 'major' },
  { token: 'm7b5', quality: 'halfDiminished', ext: ['7'], alt: ['b5'] },
  { token: 'dim7', quality: 'diminished', ext: ['7'] },
  { token: 'dim', quality: 'diminished' },
  { token: 'm7', quality: 'minor', ext: ['7'] },
  { token: 'm', quality: 'minor' },
  { token: 'aug', quality: 'augmented' },
  { token: 'sus2', quality: 'suspended', sus: 'sus2' },
  { token: 'sus4', quality: 'suspended', sus: 'sus4' },
  { token: 'sus', quality: 'suspended', sus: 'sus4' },
  { token: '5', quality: 'power' },
];

/** Alteration tokens, longest-first so `#11`/`b13` win over `#`/`b` + number. */
export const ALTERATION_TOKENS: Alteration[] = ['#11', 'b13', 'b5', '#5', 'b9', '#9'];

/** Extension number tokens, longest-first (`13`/`11` before `9`/`7`). */
export const EXTENSION_TOKENS: Extension[] = ['13', '11', '9', '7'];

export const ROOT_NOTES = 'ABCDEFG';

/**
 * Normalize jazz shorthand to the canonical token vocabulary the matchers use
 * (`-`/`min`→`m`, `Δ`→`maj7`, `ø`→`m7b5`, `°`→`dim`, `+`→`aug`).
 */
export function normalizeBody(body: string): string {
  let b = body
    .replace(/Δ/g, 'maj7')
    .replace(/ø/g, 'm7b5')
    .replace(/°7/g, 'dim7')
    .replace(/°/g, 'dim')
    .replace(/\+/g, 'aug')
    .replace(/min/g, 'm');
  if (b.startsWith('-')) {
    b = 'm' + b.slice(1);
  }
  return b;
}
