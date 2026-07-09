import { describe, it, expect } from 'vitest';

describe('IntervalsPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../IntervalsPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
