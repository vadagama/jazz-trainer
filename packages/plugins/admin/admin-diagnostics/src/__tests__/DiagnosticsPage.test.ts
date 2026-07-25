import { describe, it, expect } from 'vitest';

describe('DiagnosticsPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../DiagnosticsPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
