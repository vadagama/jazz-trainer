import { describe, it, expect } from 'vitest';

describe('RhythmPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../RhythmPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
