import { describe, it, expect } from 'vitest';
import plugin from '../index';

describe('core-editor plugin definition', () => {
  it('manifest matches PLAN.md spec', () => {
    expect(plugin.manifest.id).toBe('core.editor');
    expect(plugin.manifest.name).toBe('Composition Editor');
    expect(plugin.manifest.apiVersion).toBe(1);
    expect(plugin.manifest.category).toBe('core');
    expect(plugin.manifest.description).toBe('Harmony composition editor with DSL support.');
  });

  it('contributes route for /compositions/:id', () => {
    expect(plugin.contributes.routes).toBeDefined();
    expect(plugin.contributes.routes).toHaveLength(1);
    expect(plugin.contributes.routes![0]!.path).toBe('/compositions/:id');
    expect(typeof plugin.contributes.routes![0]!.element).toBe('function');
  });

  it('contributes nav item for Editor', () => {
    expect(plugin.contributes.navItems).toBeDefined();
    expect(plugin.contributes.navItems).toHaveLength(1);
    expect(plugin.contributes.navItems![0]!.section).toBe('create');
    expect(plugin.contributes.navItems![0]!.label).toBe('Editor');
    expect(plugin.contributes.navItems![0]!.to).toBe('/compositions/new');
    expect(plugin.contributes.navItems![0]!.icon).toBe('edit');
  });

  it('re-exports UI components', async () => {
    const mod = await import('../index');
    expect(mod.HarmonyGrid).toBeDefined();
    expect(mod.PlayerToolbar).toBeDefined();
    expect(mod.BarEditor).toBeDefined();
    expect(mod.BarCard).toBeDefined();
    expect(mod.ChordChip).toBeDefined();
    expect(mod.ChordPalette).toBeDefined();
    expect(mod.DslModal).toBeDefined();
    expect(mod.GeneratorModal).toBeDefined();
    expect(mod.PropertiesPanel).toBeDefined();
  });
});
