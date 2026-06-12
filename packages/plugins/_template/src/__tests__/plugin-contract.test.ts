import { describe, it, expect } from 'vitest';
import { validateManifest } from '@jazz/plugin-sdk';
import templatePlugin from '../index';

describe('Template Plugin — contract', () => {
  it('has a valid manifest', () => {
    expect(() => validateManifest(templatePlugin.manifest)).not.toThrow();
    const manifest = validateManifest(templatePlugin.manifest);
    expect(manifest.id).toBe('template');
    expect(manifest.apiVersion).toBe(1);
    expect(manifest.enabled).toBe(true);
  });

  it('has a manifest id matching the plugin namespace', () => {
    expect(templatePlugin.manifest.id).toMatch(/^[a-z]+(\.[a-z]+)*$/);
  });

  it('defines at least one route', () => {
    expect(templatePlugin.contributes.routes).toBeDefined();
    expect(templatePlugin.contributes.routes!.length).toBeGreaterThanOrEqual(1);
  });

  it('route paths start with /', () => {
    for (const route of templatePlugin.contributes.routes ?? []) {
      expect(route.path).toMatch(/^\//);
    }
  });

  it('navItems have required fields', () => {
    for (const item of templatePlugin.contributes.navItems ?? []) {
      expect(item.section).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.to).toMatch(/^\//);
    }
  });

  it('plugin definition has the expected shape', () => {
    expect(templatePlugin).toHaveProperty('manifest');
    expect(templatePlugin).toHaveProperty('contributes');
    expect(templatePlugin.manifest).toHaveProperty('id');
    expect(templatePlugin.manifest).toHaveProperty('name');
    expect(templatePlugin.manifest).toHaveProperty('apiVersion');
    expect(templatePlugin.manifest).toHaveProperty('category');
    expect(templatePlugin.manifest).toHaveProperty('description');
  });

  it('does not register any contribution that would crash the host', () => {
    // Если commands присутствуют — у каждой должен быть id и run
    for (const cmd of templatePlugin.contributes.commands ?? []) {
      expect(cmd.id).toBeTruthy();
      expect(typeof cmd.run).toBe('function');
    }
    // Если lessons/exercises/assessments присутствуют — у каждого id и type
    for (const act of [
      ...(templatePlugin.contributes.lessons ?? []),
      ...(templatePlugin.contributes.exercises ?? []),
      ...(templatePlugin.contributes.assessments ?? []),
    ]) {
      expect(act.id).toBeTruthy();
      expect(['lesson', 'exercise', 'assessment']).toContain(act.type);
    }
  });
});
