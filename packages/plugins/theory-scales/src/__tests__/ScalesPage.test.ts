import { describe, it, expect } from 'vitest';

describe('ScalesPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../ScalesPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
