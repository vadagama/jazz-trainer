import { describe, it, expect } from 'vitest';

describe('FlagsPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../FlagsPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
