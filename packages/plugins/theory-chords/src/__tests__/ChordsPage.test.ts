import { describe, it, expect } from 'vitest';

describe('ChordsPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../ChordsPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
