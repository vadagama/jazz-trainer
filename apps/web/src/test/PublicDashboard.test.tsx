import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { CatalogPage } from '@jazz/plugin-catalog';
import { renderWithProviders } from './renderWithProviders';

vi.mock('@/queries/usePublicCompositions', () => ({
  usePublicCompositions: vi.fn(),
}));

vi.mock('@/queries/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoading: false })),
  useLogout: vi.fn(() => ({ mutate: vi.fn() })),
}));

import { usePublicCompositions } from '@/queries/usePublicCompositions';
const mockUsePublicCompositions = vi.mocked(usePublicCompositions);

const MOCK_GRIDS = [
  {
    id: 'g1',
    name: 'ii-V-I in C',
    key: 'C',
    timeSignature: '4/4',
    barsCount: 4,
    likeCount: 3,
    likedByMe: false,
    updatedAt: 0,
  },
];

describe('CatalogPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without auth (guest)', async () => {
    mockUsePublicCompositions.mockReturnValue({
      data: MOCK_GRIDS,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicCompositions>);

    renderWithProviders(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Каталог сеток')).toBeTruthy();
      expect(screen.getByText('ii-V-I in C')).toBeTruthy();
    });
  });

  it('shows spinner while loading', () => {
    mockUsePublicCompositions.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof usePublicCompositions>);

    renderWithProviders(<CatalogPage />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows empty state when no grids', async () => {
    mockUsePublicCompositions.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicCompositions>);

    renderWithProviders(<CatalogPage />);
    await waitFor(() => {
      expect(screen.getByText('Каталог пока пуст')).toBeTruthy();
    });
  });
});
