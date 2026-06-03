import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { LikeButton } from '@/components/catalog/LikeButton';
import { CopyToMineButton } from '@/components/catalog/CopyToMineButton';
import { renderWithProviders } from './renderWithProviders';

vi.mock('@/queries/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoading: false })),
  useLogout: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/queries/useLikes', () => ({
  useLikes: vi.fn(() => ({
    like: { mutate: vi.fn(), isPending: false },
    unlike: { mutate: vi.fn(), isPending: false },
  })),
}));

vi.mock('@/queries/useCopyToMine', () => ({
  useCopyToMine: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

describe('LikeButton — guest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows SignInPrompt for guest', async () => {
    renderWithProviders(<LikeButton gridId="g1" likeCount={5} likedByMe={false} />);
    await waitFor(() => {
      expect(screen.getByText('Войдите')).toBeTruthy();
    });
  });

  it('shows like count', async () => {
    renderWithProviders(<LikeButton gridId="g1" likeCount={42} likedByMe={false} />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeTruthy();
    });
  });
});

describe('CopyToMineButton — guest', () => {
  it('shows SignInPrompt for guest', async () => {
    renderWithProviders(<CopyToMineButton gridId="g1" gridName="Test" />);
    await waitFor(() => {
      expect(screen.getByText('Войдите')).toBeTruthy();
    });
  });
});
