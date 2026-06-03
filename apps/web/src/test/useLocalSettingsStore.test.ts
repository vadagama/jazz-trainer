import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useLocalSettingsStore } from '@/stores/useLocalSettingsStore';

describe('useLocalSettingsStore', () => {
  beforeEach(() => {
    act(() => useLocalSettingsStore.getState().reset());
  });

  it('has default settings', () => {
    const { settings } = useLocalSettingsStore.getState();
    expect(settings.bpm).toBe(120);
    expect(settings.volume).toBe(0.8);
    expect(settings.countIn).toBe(1);
    expect(settings.clickStrong).toBe('click_hi');
    expect(settings.clickWeak).toBe('click_lo');
  });

  it('updates settings partially', () => {
    act(() => useLocalSettingsStore.getState().setSettings({ bpm: 160 }));
    const { settings } = useLocalSettingsStore.getState();
    expect(settings.bpm).toBe(160);
    expect(settings.volume).toBe(0.8);
  });

  it('resets to defaults', () => {
    act(() => useLocalSettingsStore.getState().setSettings({ bpm: 200 }));
    act(() => useLocalSettingsStore.getState().reset());
    expect(useLocalSettingsStore.getState().settings.bpm).toBe(120);
  });
});
