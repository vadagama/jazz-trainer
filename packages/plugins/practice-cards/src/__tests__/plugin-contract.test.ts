import { describe, it, expect } from 'vitest';
import { validateManifest } from '@jazz/plugin-sdk';
import practiceCardsPlugin from '../index';

describe('Practice Cards Plugin — contract', () => {
  it('has a valid manifest', () => {
    expect(() => validateManifest(practiceCardsPlugin.manifest)).not.toThrow();
    const manifest = validateManifest(practiceCardsPlugin.manifest);
    expect(manifest.id).toBe('practice.cards');
    expect(manifest.apiVersion).toBe(1);
    expect(manifest.enabled).toBe(true);
  });

  it('has a manifest id matching the plugin namespace', () => {
    expect(practiceCardsPlugin.manifest.id).toMatch(/^[a-z]+(\.[a-z]+)*$/);
  });

  it('plugin definition has the expected shape', () => {
    expect(practiceCardsPlugin).toHaveProperty('manifest');
    expect(practiceCardsPlugin).toHaveProperty('contributes');
    expect(practiceCardsPlugin.manifest).toHaveProperty('id');
    expect(practiceCardsPlugin.manifest).toHaveProperty('name');
    expect(practiceCardsPlugin.manifest).toHaveProperty('apiVersion');
    expect(practiceCardsPlugin.manifest).toHaveProperty('category');
    expect(practiceCardsPlugin.manifest).toHaveProperty('description');
  });

  it('does not register any contribution that would crash the host', () => {
    for (const cmd of practiceCardsPlugin.contributes.commands ?? []) {
      expect(cmd.id).toBeTruthy();
      expect(typeof cmd.run).toBe('function');
    }
    for (const act of [
      ...(practiceCardsPlugin.contributes.lessons ?? []),
      ...(practiceCardsPlugin.contributes.exercises ?? []),
      ...(practiceCardsPlugin.contributes.assessments ?? []),
    ]) {
      expect(act.id).toBeTruthy();
      expect(['lesson', 'exercise', 'assessment']).toContain(act.type);
    }
  });
});
