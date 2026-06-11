import { describe, it, expect } from 'vitest';
import plugin from '../index';

describe('core-player plugin definition', () => {
  it('manifest matches PLAN.md spec', () => {
    expect(plugin.manifest.id).toBe('core.player');
    expect(plugin.manifest.name).toBe('Player');
    expect(plugin.manifest.apiVersion).toBe(1);
    expect(plugin.manifest.category).toBe('play');
    expect(plugin.manifest.description).toBe('Read-only grid player for public compositions.');
  });

  it('contributes routes for /play and /play/:id', () => {
    expect(plugin.contributes.routes).toBeDefined();
    expect(plugin.contributes.routes).toHaveLength(2);
    expect(plugin.contributes.routes![0]!.path).toBe('/play');
    expect(plugin.contributes.routes![1]!.path).toBe('/play/:id');
  });

  it('has no nav items', () => {
    expect(plugin.contributes.navItems).toBeUndefined();
  });
});
