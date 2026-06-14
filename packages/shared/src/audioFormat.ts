/**
 * Audio format detection and fallback.
 *
 * Modern browsers support AAC in MP4 container.
 * Fallback to MP3 for legacy browsers (e.g. old Firefox, Opera Mini).
 * Manual override via user settings takes precedence.
 */

export type AudioFormat = 'aac' | 'mp3';

declare const document:
  | { createElement(tag: 'audio'): { canPlayType(type: string): string } }
  | undefined;

let _supportsAAC: boolean | null = null;

/** Check if the browser can decode AAC-LC in MP4 container. */
export function supportsAAC(): boolean {
  if (_supportsAAC !== null) return _supportsAAC;
  if (typeof document === 'undefined') {
    _supportsAAC = true;
    return true;
  }
  const a = document.createElement('audio');
  _supportsAAC =
    a.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '' || a.canPlayType('audio/aac') !== '';
  return _supportsAAC;
}

/** Reset cached detection (for testing). */
export function resetAudioFormatDetection(): void {
  _supportsAAC = null;
}

/**
 * Resolve the effective audio format.
 * Manual override from settings wins; otherwise auto-detect AAC.
 */
export function effectiveFormat(preferred?: AudioFormat | null): AudioFormat {
  if (preferred === 'mp3') return 'mp3';
  if (preferred === 'aac') return 'aac';
  return supportsAAC() ? 'aac' : 'mp3';
}

/**
 * Apply format fallback to an audio URL.
 * Switches /aac/ → /mp3/ and .m4a → .mp3 when using MP3.
 */
export function audioUrl(aacUrl: string, preferred?: AudioFormat | null): string {
  const fmt = effectiveFormat(preferred);
  if (fmt === 'aac') return aacUrl;
  return aacUrl.replace('/aac/', '/mp3/').replace('.m4a', '.mp3');
}
