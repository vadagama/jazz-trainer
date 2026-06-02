import type {
  Accidental,
  Alteration,
  ChordQuality,
  ChordSymbol,
  Extension,
  NoteName,
  ParseError,
  ParseResult,
} from '@jazz/shared';
import {
  ALTERATION_TOKENS,
  EXTENSION_TOKENS,
  QUALITY_MATCHERS,
  ROOT_NOTES,
  normalizeBody,
} from './data.js';

function isRoot(ch: string | undefined): ch is NoteName {
  return ch !== undefined && ROOT_NOTES.includes(ch);
}

function readAccidental(ch: string | undefined): Accidental {
  return ch === '#' || ch === 'b' ? ch : '';
}

/**
 * Parse a single chord symbol into a {@link ChordSymbol}.
 *
 * Multi-step strategy (docs/06-dsl.md §4): root+accidental → bass split →
 * quality (longest-first table) → extensions → alterations/alt.
 * Errors carry a position relative to `text`; parsing is best-effort.
 */
export function parseChord(text: string): ParseResult<ChordSymbol> {
  const raw = text.trim();
  const errors: ParseError[] = [];

  if (raw === '') {
    return { ok: false, errors: [{ message: 'Empty chord', position: 0 }] };
  }

  // 1. root + accidental
  const rootChar = raw[0];
  if (!isRoot(rootChar)) {
    return {
      ok: false,
      errors: [{ message: `Invalid root note "${rootChar}"`, position: 0, token: raw }],
    };
  }
  const root: NoteName = rootChar;
  let i = 1;
  const rootAccidental = readAccidental(raw[1]);
  if (rootAccidental !== '') i = 2;

  let remainder = raw.slice(i);

  // 2. bass split (slash chord)
  let bass: ChordSymbol['bass'] = null;
  const slashIdx = remainder.indexOf('/');
  if (slashIdx >= 0) {
    const bassStr = remainder.slice(slashIdx + 1);
    remainder = remainder.slice(0, slashIdx);
    const bassRoot = bassStr[0];
    if (!isRoot(bassRoot)) {
      errors.push({
        message: `Invalid bass note "${bassStr}"`,
        position: i + slashIdx + 1,
        token: bassStr,
      });
    } else {
      bass = { note: bassRoot, accidental: readAccidental(bassStr[1]) };
    }
  }

  const body = normalizeBody(remainder);

  // 3. quality
  let quality: ChordQuality | null = null;
  let sus: ChordSymbol['sus'];
  const extensions: Extension[] = [];
  const alterations: Alteration[] = [];
  let alt = false;
  let rest = body;

  for (const m of QUALITY_MATCHERS) {
    if (rest.startsWith(m.token)) {
      quality = m.quality;
      if (m.ext) extensions.push(...m.ext);
      if (m.alt) alterations.push(...m.alt);
      if (m.sus) sus = m.sus;
      rest = rest.slice(m.token.length);
      break;
    }
  }

  // 4–5. extensions, alterations, alt (in any order)
  let guard = 0;
  while (rest.length > 0 && guard++ < 16) {
    if (rest.startsWith('alt')) {
      alt = true;
      rest = rest.slice(3);
      continue;
    }
    const altTok = ALTERATION_TOKENS.find((t) => rest.startsWith(t));
    if (altTok) {
      if (!alterations.includes(altTok)) alterations.push(altTok);
      rest = rest.slice(altTok.length);
      continue;
    }
    const extTok = EXTENSION_TOKENS.find((t) => rest.startsWith(t));
    if (extTok) {
      if (!extensions.includes(extTok)) extensions.push(extTok);
      rest = rest.slice(extTok.length);
      continue;
    }
    // Unknown trailing token.
    errors.push({
      message: `Unrecognized chord suffix "${rest}"`,
      position: i + (remainder.length - rest.length),
      token: rest,
    });
    rest = '';
  }

  // Decide quality when no explicit quality token was present.
  if (quality === null) {
    if (alt || extensions.length > 0) {
      quality = 'dominant';
    } else if (errors.length === 0) {
      quality = 'major';
    } else {
      // had an error and nothing else — bail out.
      return { ok: false, errors };
    }
  }

  // Altered dominant implies a 7th.
  if (alt) {
    quality = 'dominant';
    if (!extensions.includes('7')) extensions.push('7');
  }

  const value: ChordSymbol = {
    raw,
    root,
    rootAccidental,
    quality,
    extensions,
    alterations,
    alt,
    ...(sus ? { sus } : {}),
    bass,
  };

  return { ok: errors.length === 0, value, errors };
}
