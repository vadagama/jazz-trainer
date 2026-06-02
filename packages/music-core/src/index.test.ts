import { describe, it, expect } from 'vitest';
import { MUSIC_CORE_VERSION } from './index.js';

describe('@jazz/music-core smoke', () => {
  it('exports a package marker', () => {
    expect(typeof MUSIC_CORE_VERSION).toBe('string');
  });
});
