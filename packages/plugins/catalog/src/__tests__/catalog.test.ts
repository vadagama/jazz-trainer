import { describe, it, expect } from 'vitest';
import plugin from '../index';

describe('catalog plugin definition', () => {
  it('manifest matches spec', () => {
    expect(plugin.manifest.id).toBe('core.catalog');
    expect(plugin.manifest.name).toBe('Catalog');
    expect(plugin.manifest.apiVersion).toBe(1);
    expect(plugin.manifest.category).toBe('core');
    expect(plugin.manifest.description).toBe(
      'Public composition catalog with rich filters, search and featured block.',
    );
  });

  it('contributes route for /', () => {
    expect(plugin.contributes.routes).toBeDefined();
    expect(plugin.contributes.routes).toHaveLength(1);
    expect(plugin.contributes.routes![0]!.path).toBe('/');
    expect(typeof plugin.contributes.routes![0]!.element).toBe('function');
  });

  it('contributes nav item for Каталог', () => {
    expect(plugin.contributes.navItems).toBeDefined();
    expect(plugin.contributes.navItems).toHaveLength(1);
    expect(plugin.contributes.navItems![0]!.section).toBe('main');
    expect(plugin.contributes.navItems![0]!.label).toBe('Каталог');
    expect(plugin.contributes.navItems![0]!.to).toBe('/');
    expect(plugin.contributes.navItems![0]!.icon).toBe('library');
  });
});
