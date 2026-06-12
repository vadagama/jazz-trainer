import { describe, it, expect } from 'vitest';

describe('EarTrainingPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../EarTrainingPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
