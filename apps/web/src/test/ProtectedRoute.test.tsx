import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { renderWithProviders, makeQueryClient } from './renderWithProviders';

vi.mock('@/queries/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/queries/useAuth';
const mockUseAuth = vi.mocked(useAuth);

function Dashboard() {
  return <div>Dashboard</div>;
}

function Login() {
  return <div>Login Page</div>;
}

function TestApp() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/protected"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows spinner while loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    renderWithProviders(<TestApp />, { routerProps: { initialEntries: ['/protected'] } });
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirects guest to /login', async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    renderWithProviders(<TestApp />, { routerProps: { initialEntries: ['/protected'] } });
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeTruthy();
    });
  });

  it('renders children for authenticated user', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'a@b.com', name: 'Alice', avatarUrl: null, provider: 'dev', createdAt: 0 },
      isLoading: false,
    });
    renderWithProviders(<TestApp />, { routerProps: { initialEntries: ['/protected'] } });
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeTruthy();
    });
  });
});
