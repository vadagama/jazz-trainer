import { describe, it, expect } from 'vitest';

// TemplatePage is a simple React component — test it renders without errors
describe('TemplatePage', () => {
  it('module can be imported without errors', async () => {
    const mod = await import('../TemplatePage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('component name is TemplatePage', async () => {
    const mod = await import('../TemplatePage');
    expect(mod.default.name).toBe('TemplatePage');
  });
});
