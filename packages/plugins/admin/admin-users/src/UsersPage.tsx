import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuth } from '@jazz/plugin-sdk';
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@jazz/ui';
import { Ban, CheckCircle, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import type { UserDTO, RoleDTO } from '@jazz/shared';

const USERS_KEY = ['admin', 'users'] as const;
const ROLES_KEY = ['admin', 'roles'] as const;

const SUPER_ADMIN_NAME = 'super_admin';

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users, isLoading } = useQuery({
    queryKey: USERS_KEY,
    queryFn: () => apiClient.get<UserDTO[]>('/api/admin/users'),
  });

  const { data: allRoles } = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => apiClient.get<RoleDTO[]>('/api/admin/roles'),
  });

  // Build lookup maps from roles
  const roleById = new Map<string, RoleDTO>();
  const roleIdByName = new Map<string, string>();
  allRoles?.forEach((r) => {
    roleById.set(r.id, r);
    roleIdByName.set(r.name, r.id);
  });
  const superAdminRoleId = roleIdByName.get(SUPER_ADMIN_NAME);
  // Roles available for assignment (exclude super_admin)
  const assignableRoles = allRoles?.filter((r) => r.name !== SUPER_ADMIN_NAME) ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      apiClient.patch<UserDTO>(`/api/admin/users/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });

  const rolesMutation = useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      apiClient.patch<UserDTO>(`/api/admin/users/${id}/roles`, { roleIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/users/${id}`),
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

  // Resolve user's role IDs: prefer roles[] array, fall back to role name via map
  function getUserRoleIds(u: UserDTO): string[] {
    if (u.roles && u.roles.length > 0) return u.roles;
    // Fallback: resolve single role name to ID
    const id = roleIdByName.get(u.role);
    return id ? [id] : [];
  }

  // Get display names for a user's roles
  function getRoleNames(u: UserDTO): string[] {
    const ids = getUserRoleIds(u);
    return ids.map((rid) => roleById.get(rid)?.name ?? rid);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Управление пользователями</h1>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Имя</th>
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
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground w-16">
                Удалить
              </th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const isDisabled = u.status === 'disabled';

              const userRoleIds = getUserRoleIds(u);
              const roleNames = getRoleNames(u);

              // Whether this user currently has super_admin (via roles[] or legacy role field)
              const hasSuperAdmin =
                (superAdminRoleId && userRoleIds.includes(superAdminRoleId)) ||
                u.role === SUPER_ADMIN_NAME;

              const canToggle = !isSelf && !hasSuperAdmin;
              const canDelete = !isSelf && !hasSuperAdmin;

              // Can edit roles: not self, not super_admin target
              const canEditRoles = !isSelf && !hasSuperAdmin && assignableRoles.length > 0;

              const handleRoleToggle = (roleId: string, currentlySelected: boolean) => {
                const currentIds = getUserRoleIds(u);
                let newIds: string[];
                if (currentlySelected) {
                  newIds = currentIds.filter((rid) => rid !== roleId);
                } else {
                  newIds = [...currentIds, roleId];
                }
                // Always preserve super_admin if the user has it
                if (hasSuperAdmin && superAdminRoleId && !newIds.includes(superAdminRoleId)) {
                  newIds = [...newIds, superAdminRoleId];
                }
                rolesMutation.mutate({ id: u.id, roleIds: newIds });
              };

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
                    {canEditRoles ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 flex-wrap cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={rolesMutation.isPending}
                          >
                            {roleNames.length > 0 ? (
                              roleNames.map((name) => (
                                <Badge
                                  key={name}
                                  variant={name === SUPER_ADMIN_NAME ? 'default' : 'outline'}
                                >
                                  {name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-xs">Нет ролей</span>
                            )}
                            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52">
                          {assignableRoles.map((role) => {
                            const isSelected = userRoleIds.includes(role.id);
                            return (
                              <DropdownMenuItem
                                key={role.id}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleRoleToggle(role.id, isSelected);
                                }}
                                className="cursor-pointer"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  readOnly
                                  className="pointer-events-none"
                                />
                                <span>{role.name}</span>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="inline-flex items-center gap-1 flex-wrap">
                        {roleNames.length > 0 ? (
                          roleNames.map((name) => (
                            <Badge
                              key={name}
                              variant={name === SUPER_ADMIN_NAME ? 'default' : 'outline'}
                            >
                              {name}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">{u.role}</Badge>
                        )}
                      </span>
                    )}
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
                  <td className="px-4 py-3 text-center">
                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Удалить пользователя «${u.name}» (${u.email})? Это действие необратимо.`,
                            )
                          ) {
                            deleteMutation.mutate(u.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        title="Удалить пользователя"
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
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
