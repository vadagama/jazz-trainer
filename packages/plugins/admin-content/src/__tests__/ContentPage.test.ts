import { describe, it, expect } from 'vitest';

describe('ContentPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../ContentPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
