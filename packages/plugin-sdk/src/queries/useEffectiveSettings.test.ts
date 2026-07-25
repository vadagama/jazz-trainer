/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { UserSettingsDTO } from '@jazz/shared';

// --- Mock state, driven per-test ---
let mockUser: { id: string } | null = null;
let mockServerSettings: UserSettingsDTO | undefined;
let mockDefaultSettings: Partial<UserSettingsDTO> | undefined;
let mockLocalSettings: UserSettingsDTO;

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('./useSettings', () => ({
  useSettings: () => ({ data: mockServerSettings }),
  useUpdateSettings: () => ({ mutate: vi.fn() }),
}));

vi.mock('./useDefaultSettings', () => ({
  useDefaultSettings: () => ({ data: mockDefaultSettings }),
}));

// Keep the real DEFAULT_SETTINGS (the guest-override logic compares against it)
// but replace the zustand hook with a controllable stub.
vi.mock('../stores/useLocalSettingsStore', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useLocalSettingsStore: () => ({ settings: mockLocalSettings }),
  };
});

// Must import after mocks.
import { useEffectiveSettings } from './useEffectiveSettings';
import { DEFAULT_SETTINGS } from '../stores/useLocalSettingsStore';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useEffectiveSettings', () => {
  beforeEach(() => {
    mockUser = null;
    mockServerSettings = undefined;
    mockDefaultSettings = undefined;
    mockLocalSettings = { ...DEFAULT_SETTINGS };
    localStorage.clear();
  });

  it('returns server settings verbatim for an authenticated user', () => {
    mockUser = { id: '1' };
    mockServerSettings = { ...DEFAULT_SETTINGS, bpm: 90 } as UserSettingsDTO;

    const { result } = renderHook(() => useEffectiveSettings(), { wrapper: makeWrapper() });
    expect(result.current.bpm).toBe(90);
  });

  it('uses admin per-style defaults as the base for a guest', () => {
    // Admin set a per-style tempo/swing for swing; guest changed nothing.
    mockDefaultSettings = {
      ...DEFAULT_SETTINGS,
      style: 'swing',
      perStyleOverrides: { swing: { bpm: 100, swingRatio: 0.62 } },
    };
    mockLocalSettings = { ...DEFAULT_SETTINGS };

    const { result } = renderHook(() => useEffectiveSettings(), { wrapper: makeWrapper() });
    expect(result.current.bpm).toBe(100);
    expect(result.current.swingRatio).toBe(0.62);
  });

  it("lets a guest's explicit local override win over admin defaults", () => {
    mockDefaultSettings = {
      ...DEFAULT_SETTINGS,
      style: 'swing',
      perStyleOverrides: { swing: { bpm: 100 } },
    };
    // Guest bumped the tempo away from the hardcoded default (120).
    mockLocalSettings = { ...DEFAULT_SETTINGS, bpm: 200 };

    const { result } = renderHook(() => useEffectiveSettings(), { wrapper: makeWrapper() });
    expect(result.current.bpm).toBe(200);
  });

  it('falls back to local settings when the public defaults are unavailable', () => {
    // `volume` is not a per-style field, so applyStyleDefaults passes it through
    // untouched — a stable signal that the local settings are the base here.
    mockDefaultSettings = undefined;
    mockLocalSettings = { ...DEFAULT_SETTINGS, volume: 0.33 };

    const { result } = renderHook(() => useEffectiveSettings(), { wrapper: makeWrapper() });
    expect(result.current.volume).toBe(0.33);
  });
});
