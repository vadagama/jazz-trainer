import { describe, it, expect } from 'vitest';

describe('FlagsPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../FlagsPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('FlagForm module can be imported', async () => {
    const mod = await import('../FlagForm');
    expect(mod.FlagForm).toBeDefined();
    expect(typeof mod.FlagForm).toBe('function');
    expect(typeof mod.formToPayload).toBe('function');
    expect(typeof mod.flagToFormValues).toBe('function');
  });
});
