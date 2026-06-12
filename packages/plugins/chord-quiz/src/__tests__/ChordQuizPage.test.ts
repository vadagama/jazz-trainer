import { describe, it, expect } from 'vitest';

describe('ChordQuizPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../ChordQuizPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
