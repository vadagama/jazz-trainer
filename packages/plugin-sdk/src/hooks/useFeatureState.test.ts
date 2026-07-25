/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// --- Mocks ---
const mockUseAuth = vi.fn();

vi.mock('../queries/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Must import after mocks
import { useFeatureState, useFeatureGroupVisibility } from './useFeatureState';

function setAuth({
  permissions = [],
  inactivePermissions = [],
  isLoading = false,
}: {
  permissions?: string[];
  inactivePermissions?: string[];
  isLoading?: boolean;
} = {}) {
  mockUseAuth.mockReturnValue({ permissions, inactivePermissions, isLoading });
}

describe('useFeatureState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns active when code is in permissions', () => {
    setAuth({ permissions: ['theory:blues'] });
    const { result } = renderHook(() => useFeatureState('theory:blues'));
    expect(result.current).toBe('active');
  });

  it('returns inactive when code is in inactivePermissions', () => {
    setAuth({ inactivePermissions: ['theory:blues'] });
    const { result } = renderHook(() => useFeatureState('theory:blues'));
    expect(result.current).toBe('inactive');
  });

  it('prefers active over inactive when code is in both sets', () => {
    setAuth({ permissions: ['theory:blues'], inactivePermissions: ['theory:blues'] });
    const { result } = renderHook(() => useFeatureState('theory:blues'));
    expect(result.current).toBe('active');
  });

  it('returns hidden when code is missing from both sets', () => {
    setAuth();
    const { result } = renderHook(() => useFeatureState('theory:blues'));
    expect(result.current).toBe('hidden');
  });

  it('returns hidden while auth is loading', () => {
    setAuth({ permissions: ['theory:blues'], isLoading: true });
    const { result } = renderHook(() => useFeatureState('theory:blues'));
    expect(result.current).toBe('hidden');
  });
});

describe('useFeatureGroupVisibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports visible + anyActive when at least one code is active', () => {
    setAuth({ permissions: ['theory:blues'] });
    const { result } = renderHook(() =>
      useFeatureGroupVisibility(['theory:blues', 'theory:coltraneChanges']),
    );
    expect(result.current.isVisible).toBe(true);
    expect(result.current.anyActive).toBe(true);
  });

  it('reports visible when at least one code is inactive (but none active)', () => {
    setAuth({ inactivePermissions: ['theory:blues'] });
    const { result } = renderHook(() =>
      useFeatureGroupVisibility(['theory:blues', 'theory:coltraneChanges']),
    );
    expect(result.current.isVisible).toBe(true);
    expect(result.current.anyActive).toBe(false);
  });

  it('reports not visible when all codes are hidden', () => {
    setAuth();
    const { result } = renderHook(() =>
      useFeatureGroupVisibility(['theory:blues', 'theory:coltraneChanges']),
    );
    expect(result.current.isVisible).toBe(false);
    expect(result.current.anyActive).toBe(false);
  });

  it('reports not visible while auth is loading', () => {
    setAuth({ permissions: ['theory:blues'], isLoading: true });
    const { result } = renderHook(() => useFeatureGroupVisibility(['theory:blues']));
    expect(result.current.isVisible).toBe(false);
    expect(result.current.anyActive).toBe(false);
  });

  it('reports anyActive even when an inactive code comes first (order-independent)', () => {
    setAuth({
      permissions: ['theory:coltraneChanges'],
      inactivePermissions: ['theory:blues'],
    });
    const { result } = renderHook(() =>
      useFeatureGroupVisibility(['theory:blues', 'theory:coltraneChanges']),
    );
    expect(result.current.isVisible).toBe(true);
    expect(result.current.anyActive).toBe(true);
  });

  it('handles empty codes array', () => {
    setAuth({ permissions: ['theory:blues'] });
    const { result } = renderHook(() => useFeatureGroupVisibility([]));
    expect(result.current.isVisible).toBe(false);
    expect(result.current.anyActive).toBe(false);
  });
});
