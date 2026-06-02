import { describe, it, expect } from 'vitest';
import { TIME_SIGNATURES, KEYS, VISIBILITY } from './index.js';

describe('@jazz/shared smoke', () => {
  it('exports the supported time signatures', () => {
    expect(TIME_SIGNATURES).toContain('4/4');
    expect(TIME_SIGNATURES).toContain('6/8');
  });

  it('exports 14 key spellings and the visibility enum', () => {
    expect(KEYS.length).toBe(14);
    expect(VISIBILITY).toEqual(['public', 'private']);
  });
});
