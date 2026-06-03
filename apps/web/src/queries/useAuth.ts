import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserDTO } from '@jazz/shared';
import { apiClient } from '@/lib/apiClient';

const AUTH_KEY = ['auth', 'me'] as const;

export function useAuth() {
  const { data, isLoading } = useQuery({
    queryKey: AUTH_KEY,
    queryFn: () => apiClient.get<{ user: UserDTO | null }>('/api/auth/me'),
    staleTime: 60_000,
  });

  return {
    user: data?.user ?? null,
    isLoading,
  };
}

export function useLogout() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post('/api/auth/logout'),
    onSuccess: () => {
      qc.setQueryData(AUTH_KEY, { user: null });
      qc.invalidateQueries({ queryKey: AUTH_KEY });
    },
  });
}
