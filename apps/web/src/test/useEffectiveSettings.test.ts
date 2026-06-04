import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useEffectiveSettings } from '@/queries/useEffectiveSettings';

vi.mock('@/queries/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/queries/useSettings', () => ({
  useSettings: vi.fn(),
  useUpdateSettings: vi.fn(() => ({ mutate: vi.fn() })),
}));

import { useAuth } from '@/queries/useAuth';
import { useSettings } from '@/queries/useSettings';
const mockUseAuth = vi.mocked(useAuth);
const mockUseSettings = vi.mocked(useSettings);

const SERVER_SETTINGS = { bpm: 90, clickStrong: 'retro-stick' as const, clickWeak: 'switch' as const, volume: 0.5, countIn: 2 };
const LOCAL_DEFAULTS = { bpm: 120, clickStrong: 'drum-stick' as const, clickWeak: 'drum-stick' as const, volume: 0.8, countIn: 1 };

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useEffectiveSettings', () => {
  it('returns local settings for guest', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    mockUseSettings.mockReturnValue({ data: undefined } as ReturnType<typeof useSettings>);

    const { result } = renderHook(() => useEffectiveSettings(), { wrapper: makeWrapper() });
    expect(result.current.bpm).toBe(LOCAL_DEFAULTS.bpm);
  });

  it('returns server settings for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'a@b.com', name: 'Alice', avatarUrl: null, provider: 'dev', createdAt: 0 },
      isLoading: false,
    });
    mockUseSettings.mockReturnValue({ data: SERVER_SETTINGS } as ReturnType<typeof useSettings>);

    const { result } = renderHook(() => useEffectiveSettings(), { wrapper: makeWrapper() });
    expect(result.current.bpm).toBe(SERVER_SETTINGS.bpm);
  });
});
