import { describe, it, expect } from 'vitest';

describe('UsersPage', () => {
  it('module can be imported', async () => {
    const mod = await import('../UsersPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
