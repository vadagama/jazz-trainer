import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuth } from '@jazz/plugin-sdk';
import { Badge, Button } from '@jazz/ui';
import { Ban, CheckCircle, Loader2 } from 'lucide-react';
import type { UserDTO } from '@jazz/shared';

const USERS_KEY = ['admin', 'users'] as const;

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users, isLoading } = useQuery({
    queryKey: USERS_KEY,
    queryFn: () => apiClient.get<UserDTO[]>('/api/admin/users'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      apiClient.patch<UserDTO>(`/api/admin/users/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Управление пользователями</h1>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Имя
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Провайдер
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Роль
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Статус
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Заблокирован
              </th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const isSuperAdmin = u.role === 'super_admin';
              const isDisabled = u.status === 'disabled';
              const canToggle = !isSelf && !isSuperAdmin;

              return (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant="secondary">{u.provider}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant={u.role === 'super_admin' ? 'default' : 'outline'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {isDisabled ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                        <Ban className="h-3.5 w-3.5" />
                        Заблокирован
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Активен
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canToggle ? (
                      <Button
                        variant={isDisabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: u.id,
                            status: isDisabled ? 'active' : 'disabled',
                          })
                        }
                        disabled={toggleMutation.isPending}
                      >
                        {toggleMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isDisabled ? (
                          'Разблокировать'
                        ) : (
                          'Заблокировать'
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {isSelf ? 'Это вы' : 'Недоступно'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users?.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Нет пользователей
          </div>
        )}
      </div>
    </div>
  );
}
