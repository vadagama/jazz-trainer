/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { UserSettingsDTO, Style } from '@jazz/shared';

// --- Mocks ---
const mockMutate = vi.fn();
const mockDelete = vi.fn();

const mockUseSettings = vi.fn();
const mockUseUpdateSettings = vi.fn();

vi.mock('../queries/useSettings', () => ({
  useSettings: () => mockUseSettings(),
  useUpdateSettings: () => mockUseUpdateSettings(),
}));

vi.mock('../apiClient', () => ({
  apiClient: {
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

// Must import after mocks
import { useStyleSettings } from './useStyleSettings';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const BASE_SETTINGS: UserSettingsDTO = {
  bpm: 120,
  clickStrong: 'drum-stick',
  clickStrong2: 'drum-stick',
  clickWeak: 'drum-stick',
  volume: 0.8,
  countIn: 1,
  style: 'swing' as Style,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────

describe('useStyleSettings', () => {
  function setup(settingsOverrides?: Partial<UserSettingsDTO>) {
    const settings: UserSettingsDTO = { ...BASE_SETTINGS, ...settingsOverrides };

    mockUseSettings.mockReturnValue({ data: settings });
    mockUseUpdateSettings.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    return renderHook(() => useStyleSettings(), { wrapper: makeWrapper() });
  }

  it('returns currentStyle from settings', () => {
    const { result } = setup({ style: 'bossa' as Style });
    expect(result.current.currentStyle).toBe('bossa');
  });

  it('defaults currentStyle to swing when settings are undefined', () => {
    mockUseSettings.mockReturnValue({ data: undefined });
    mockUseUpdateSettings.mockReturnValue({ mutate: mockMutate, isPending: false });

    const { result } = renderHook(() => useStyleSettings(), { wrapper: makeWrapper() });
    expect(result.current.currentStyle).toBe('swing');
  });

  it('returns currentOverrides for the active style', () => {
    const { result } = setup({
      perStyleOverrides: {
        swing: { drumsVolume: 0.5, bassEnabled: false },
        bossa: { drumsVolume: 0.9 },
      },
    });

    expect(result.current.currentOverrides).toEqual({
      drumsVolume: 0.5,
      bassEnabled: false,
    });
  });

  it('returns empty overrides when none exist for current style', () => {
    const { result } = setup({
      style: 'swing' as Style,
      perStyleOverrides: { bossa: { drumsVolume: 0.9 } },
    });

    expect(result.current.currentOverrides).toEqual({});
  });

  it('returns empty overrides when perStyleOverrides is undefined', () => {
    const { result } = setup({ perStyleOverrides: undefined });
    expect(result.current.currentOverrides).toEqual({});
  });

  // ── saveSetting ──────────────────────────────────────────────────────────

  it('saveSetting calls mutate with the patch and perStyleOverrides for current style', () => {
    const { result } = setup({ style: 'swing' as Style });

    act(() => {
      result.current.saveSetting({ drumsVolume: 0.5 });
    });

    expect(mockMutate).toHaveBeenCalledWith(
      {
        drumsVolume: 0.5,
        perStyleOverrides: { swing: { drumsVolume: 0.5 } },
      },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('saveSetting works for bossa style', () => {
    const { result } = setup({ style: 'bossa' as Style });

    act(() => {
      result.current.saveSetting({ bassEnabled: false });
    });

    expect(mockMutate).toHaveBeenCalledWith(
      {
        bassEnabled: false,
        perStyleOverrides: { bossa: { bassEnabled: false } },
      },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('saveSetting passes multiple keys in a single call', () => {
    const { result } = setup({ style: 'swing' as Style });

    act(() => {
      result.current.saveSetting({ drumsVolume: 0.5, bassVolume: 0.3 });
    });

    expect(mockMutate).toHaveBeenCalledWith(
      {
        drumsVolume: 0.5,
        bassVolume: 0.3,
        perStyleOverrides: { swing: { drumsVolume: 0.5, bassVolume: 0.3 } },
      },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  // ── isUpdating ───────────────────────────────────────────────────────────

  it('reflects isUpdating from the mutation', () => {
    mockUseSettings.mockReturnValue({ data: BASE_SETTINGS });
    mockUseUpdateSettings.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    const { result } = renderHook(() => useStyleSettings(), { wrapper: makeWrapper() });
    expect(result.current.isUpdating).toBe(true);
  });

  it('isUpdating is false when no mutation in progress', () => {
    const { result } = setup();
    expect(result.current.isUpdating).toBe(false);
  });

  // ── resetStyle ───────────────────────────────────────────────────────────

  it('resetStyle calls DELETE /api/settings/style/:style', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.resetStyle('swing');
    });

    expect(mockDelete).toHaveBeenCalledWith('/api/settings/style/swing');
  });

  it('resetStyle can be called for any valid style', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.resetStyle('bossa');
    });

    expect(mockDelete).toHaveBeenCalledWith('/api/settings/style/bossa');
  });

  // ── DoD scenario: save for swing, save for bossa, verify isolation ──────

  it('isolates overrides between styles', () => {
    const twoStyles = setup({
      style: 'swing' as Style,
      perStyleOverrides: {
        swing: { drumsVolume: 0.5 },
        bossa: { bassEnabled: false },
      },
    });

    // Read overrides for swing
    expect(twoStyles.result.current.currentOverrides).toEqual({ drumsVolume: 0.5 });
    expect(twoStyles.result.current.currentStyle).toBe('swing');
  });

  it('saveSetting for swing does not affect bossa override payload', () => {
    const { result } = setup({ style: 'swing' as Style });

    act(() => {
      result.current.saveSetting({ drumsVolume: 0.5 });
    });

    // Only swing override is sent; server merges with existing bossa overrides
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        perStyleOverrides: { swing: { drumsVolume: 0.5 } },
      }),
      expect.any(Object),
    );
  });
});
