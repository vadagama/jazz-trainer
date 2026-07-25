import { describe, it, expect } from 'vitest';

describe('AssetsPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../AssetsPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
