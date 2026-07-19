import type { CompositionContent } from '@jazz/shared';

/**
 * Format the first N bars of a composition as a compact DSL-style preview (§4.1).
 * Example: '| Fm7 | Bbm7 | Eb7 | Abmaj7 | ...'
 */
export function formatBarsPreview(content: CompositionContent | undefined, count = 4): string {
  if (!content || !content.bars?.length) return '';
  const bars = content.bars.slice(0, count);
  const parts = bars.map((b) => {
    const symbols = b.chords.map((c) => c.symbol).join(' ');
    return symbols || '·';
  });
  const ellipsis = content.bars.length > count ? ' | ...' : ' |';
  return `| ${parts.join(' | ')}${ellipsis}`;
}
