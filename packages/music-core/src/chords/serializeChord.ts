import type { Alteration, ChordSymbol, Extension } from '@jazz/shared';

const EXTENSION_ORDER: Record<Extension, number> = { '6': 6, '7': 7, '9': 9, '11': 11, '13': 13 };
const ALTERATION_ORDER: Alteration[] = ['b5', '#5', 'b9', '#9', '#11', 'b13'];

function qualityLetters(chord: ChordSymbol): string {
  switch (chord.quality) {
    case 'major':
      // A bare 6th chord (C6) keeps no "maj" prefix; only true sevenths do (Cmaj7).
      return chord.extensions.some((e) => e !== '6') ? 'maj' : '';
    case 'minor':
      return 'm';
    case 'dominant':
      return '';
    case 'diminished':
      return 'dim';
    case 'halfDiminished':
      return 'm';
    case 'augmented':
      return 'aug';
    case 'suspended':
      return chord.sus ?? 'sus4';
    case 'power':
      return '5';
  }
}

/**
 * Serialize a {@link ChordSymbol} back into a canonical DSL token.
 * Not guaranteed to equal the original input, but idempotent: parsing the
 * output yields the same structure (round-trip stable — docs/06-dsl.md §5).
 */
export function serializeChord(chord: ChordSymbol): string {
  const head = chord.root + chord.rootAccidental;
  const letters = qualityLetters(chord);

  // Power chords already carry their number in the letters ("5").
  const numbers =
    chord.quality === 'power'
      ? ''
      : [...new Set(chord.extensions)]
          .sort((a, b) => EXTENSION_ORDER[a] - EXTENSION_ORDER[b])
          .join('');

  const alts = ALTERATION_ORDER.filter((a) => chord.alterations.includes(a)).join('');
  const altSuffix = chord.alt ? 'alt' : '';
  const bass = chord.bass ? `/${chord.bass.note}${chord.bass.accidental}` : '';

  return head + letters + numbers + alts + altSuffix + bass;
}
