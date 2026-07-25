import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, usePermission } from '@jazz/plugin-sdk';
import { Button, Checkbox, Input } from '@jazz/ui';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type { RoleDTO, PermissionDTO } from '@jazz/shared';

const ROLES_KEY = ['admin', 'roles'] as const;
const PERMISSIONS_KEY = ['admin', 'permissions'] as const;

const PERMISSION_GROUPS: { label: string; codes: string[] }[] = [
  {
    label: 'Administration',
    codes: [
      'admin',
      'users:read',
      'users:write',
      'roles:read',
      'roles:write',
      'audit:read',
      'diagnostics:read',
    ],
  },
  {
    label: 'Content',
    codes: ['content:read', 'content:write', 'flags:read', 'flags:write', 'assets:read', 'assets:write'],
  },
  {
    label: 'Catalog',
    codes: [
      'catalog:read',
      'catalog:publish',
      'catalog:moderate',
      'catalog:feature',
      'catalog:tags:write',
      'catalog:stats:read',
    ],
  },
  {
    label: 'Features',
    codes: ['exercises:read', 'compositions:read', 'compositions:write', 'theory:read'],
  },
  {
    label: 'Profile',
    codes: ['profile:read', 'profile:write'],
  },
  {
    label: 'System',
    codes: ['system:settings:read', 'system:settings:write'],
  },
];

const SYSTEM_ROLE_NAMES = ['super_admin', 'admin', 'user'];

function permissionLabel(code: string): string {
  const labels: Record<string, string> = {
    admin: 'Admin Panel',
    'users:read': 'Users: Read',
    'users:write': 'Users: Write',
    'roles:read': 'Roles: Read',
    'roles:write': 'Roles: Write',
    'audit:read': 'Audit Log',
    'diagnostics:read': 'Diagnostics',
    'content:read': 'Content: Read',
    'content:write': 'Content: Write',
    'flags:read': 'Flags: Read',
    'flags:write': 'Flags: Write',
    'assets:read': 'Assets: Read',
    'assets:write': 'Assets: Write',
    'catalog:read': 'Catalog: Read',
    'catalog:publish': 'Catalog: Publish',
    'catalog:moderate': 'Catalog: Moderate',
    'catalog:feature': 'Catalog: Feature',
    'catalog:tags:write': 'Tags: Write',
    'catalog:stats:read': 'Stats: Read',
    'exercises:read': 'Exercises',
    'compositions:read': 'Compositions: Read',
    'compositions:write': 'Compositions: Write',
    'theory:read': 'Theory',
    'profile:read': 'Profile: Read',
    'profile:write': 'Profile: Write',
    'system:settings:read': 'Settings: Read',
    'system:settings:write': 'Settings: Write',
  };
  return labels[code] ?? code;
}

export default function RolesPage() {
  const qc = useQueryClient();
  const canWrite = usePermission('roles:write');

  const { data: roles, isLoading } = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => apiClient.get<RoleDTO[]>('/api/admin/roles'),
  });

  const { data: _allPermissions } = useQuery({
    queryKey: PERMISSIONS_KEY,
    queryFn: () => apiClient.get<PermissionDTO[]>('/api/admin/permissions'),
  });

  const [newName, setNewName] = useState('');

  const saveMutation = useMutation({
    mutationFn: ({ roleId, perms }: { roleId: string; perms: string[] }) =>
      apiClient.patch<RoleDTO>(`/api/admin/roles/${roleId}`, { permissions: perms }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ name, perms }: { name: string; perms: string[] }) =>
      apiClient.post<RoleDTO>('/api/admin/roles', { name, permissions: perms }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY });
      setNewName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => apiClient.delete(`/api/admin/roles/${roleId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });

  const togglePerm = (role: RoleDTO, code: string) => {
    const perms = new Set(role.permissions);
    if (perms.has(code)) perms.delete(code);
    else perms.add(code);
    saveMutation.mutate({ roleId: role.id, perms: [...perms] });
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), perms: [] });
  };

  const handleDelete = (roleId: string) => {
    if (!confirm('Delete role? This action cannot be undone.')) return;
    deleteMutation.mutate(roleId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const roleList = roles ?? [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Role Management</h1>

      {canWrite && (
        <div className="flex items-center gap-2 mb-6">
          <Input
            placeholder="New role name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )}

      {roleList.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No roles</div>
      ) : (
        PERMISSION_GROUPS.map((group) => (
          <div key={group.label} className="mb-6">
            <h2 className="text-base font-semibold mb-2">{group.label}</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[180px]">
                      Permission
                    </th>
                    {roleList.map((role) => {
                      const isSystem = SYSTEM_ROLE_NAMES.includes(role.name);
                      const canDeleteRole =
                        canWrite && !isSystem && role.name !== 'catalog_editor';
                      return (
                        <th
                          key={role.id}
                          className="px-2 py-2 text-center text-[10px] font-normal text-muted-foreground border-x border-border/20"
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span>{role.name}</span>
                            {isSystem && (
                              <span className="text-[10px] text-muted-foreground/60">system</span>
                            )}
                            {canDeleteRole && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                onClick={() => handleDelete(role.id)}
                                disabled={deleteMutation.isPending}
                                title="Delete role"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {group.codes.map((code) => (
                    <tr
                      key={code}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-3 py-2 text-sm" title={code}>
                        {permissionLabel(code)}
                      </td>
                      {roleList.map((role) => (
                        <td
                          key={role.id}
                          className="px-1 py-2 text-center border-x border-border/10"
                        >
                          <Checkbox
                            checked={role.permissions.includes(code)}
                            onChange={() => togglePerm(role, code)}
                            disabled={!canWrite || saveMutation.isPending}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
