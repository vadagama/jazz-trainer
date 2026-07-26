import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, usePermission } from '@jazz/plugin-sdk';
import { Input } from '@jazz/ui';
import { Loader2, Search, Eye, EyeOff, Clock, Minus } from 'lucide-react';
import { THEORY_FEATURES } from '@jazz/shared';
import type { RoleDTO } from '@jazz/shared';

const ROLES_KEY = ['admin', 'roles'] as const;
const FRS_KEY = ['admin', 'feature-role-state'] as const;
const PUBLIC_KEY = ['admin', 'feature-access'] as const;

const UMBRELLA_CODES = new Set(['exercises:read', 'theory:read']);
const SYSTEM_ROLE_NAMES = ['super_admin', 'admin', 'user'];

type TriState = 'hidden' | 'inactive' | 'active';
const CYCLE: TriState[] = ['hidden', 'inactive', 'active'];

interface FRSRow {
  featureCode: string;
  roleName: string;
  state: TriState;
}

function nextState(s: TriState): TriState {
  return CYCLE[(CYCLE.indexOf(s) + 1) % 3]!;
}

type AggregateState = TriState | 'mixed';

function aggregateState(states: TriState[]): AggregateState {
  if (states.length === 0) return 'hidden';
  const first = states[0]!;
  return states.every((s) => s === first) ? first : 'mixed';
}

function BulkTriStateToggle({
  agg,
  onChange,
  disabled,
}: {
  agg: AggregateState;
  onChange: () => void;
  disabled?: boolean;
}) {
  if (agg === 'mixed') {
    return (
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        title="Смешанные — сбросить"
        className="inline-flex items-center justify-center size-7 rounded transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground/50"
      >
        <Minus className="size-4" />
      </button>
    );
  }
  const Icon = agg === 'hidden' ? EyeOff : agg === 'inactive' ? Clock : Eye;
  const color =
    agg === 'hidden'
      ? 'text-muted-foreground/30'
      : agg === 'inactive'
        ? 'text-amber-500/60'
        : 'text-emerald-500';
  const label = agg === 'hidden' ? 'Все скрыты' : agg === 'inactive' ? 'Все скоро' : 'Все активны';

  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={label}
      className={`inline-flex items-center justify-center size-7 rounded transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
    >
      <Icon className="size-4" />
    </button>
  );
}

function TriStateToggle({
  state,
  onChange,
  disabled,
}: {
  state: TriState;
  onChange: () => void;
  disabled?: boolean;
}) {
  const Icon = state === 'hidden' ? EyeOff : state === 'inactive' ? Clock : Eye;
  const color =
    state === 'hidden'
      ? 'text-muted-foreground/30'
      : state === 'inactive'
        ? 'text-amber-500/60'
        : 'text-emerald-500';
  const label = state === 'hidden' ? 'Скрыт' : state === 'inactive' ? 'Скоро' : 'Активен';

  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={label}
      className={`inline-flex items-center justify-center size-7 rounded transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
    >
      <Icon className="size-4" />
    </button>
  );
}

export default function TheoryPage() {
  const qc = useQueryClient();
  const canWrite = usePermission('roles:write');

  const [search, setSearch] = useState('');

  const { data: roles, isLoading } = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => apiClient.get<RoleDTO[]>('/api/admin/roles'),
  });

  const { data: frsRows } = useQuery({
    queryKey: FRS_KEY,
    queryFn: () => apiClient.get<FRSRow[]>('/api/admin/feature-role-state'),
  });

  const { data: publicFeatures } = useQuery({
    queryKey: PUBLIC_KEY,
    queryFn: () => apiClient.get<{ code: string; state: TriState }[]>('/api/admin/feature-access'),
  });

  const frsMap = useMemo(() => {
    const map = new Map<string, TriState>();
    for (const r of frsRows ?? []) {
      map.set(`${r.featureCode}:${r.roleName}`, r.state);
    }
    return map;
  }, [frsRows]);

  const publicStateMap = useMemo(() => {
    const map = new Map<string, TriState>();
    for (const f of publicFeatures ?? []) {
      map.set(f.code, f.state);
    }
    return map;
  }, [publicFeatures]);

  const getRoleState = (roleName: string, code: string): TriState => {
    return frsMap.get(`${code}:${roleName}`) ?? 'hidden';
  };

  const filteredFeatures = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = THEORY_FEATURES.filter((f) => !UMBRELLA_CODES.has(f.code));
    return q
      ? list.filter((f) => f.label.toLowerCase().includes(q) || f.code.toLowerCase().includes(q))
      : list;
  }, [search]);

  const [mutatingKey, setMutatingKey] = useState<string | null>(null);

  const frsMutation = useMutation({
    mutationFn: (payload: { featureCode: string; roleName: string; state: TriState }) =>
      apiClient.put('/api/admin/feature-role-state', payload),
    onSettled: () => setMutatingKey(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FRS_KEY });
    },
  });

  const publicMutation = useMutation({
    mutationFn: (features: { code: string; state: TriState }[]) =>
      apiClient.put('/api/admin/feature-access', { features }),
    onSettled: () => setMutatingKey(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PUBLIC_KEY });
    },
  });

  const toggleRole = useCallback(
    (roleName: string, code: string) => {
      const key = `role:${code}:${roleName}`;
      const current = frsMap.get(`${code}:${roleName}`) ?? 'hidden';
      const next = nextState(current);
      setMutatingKey(key);
      frsMutation.mutate({ featureCode: code, roleName, state: next });
    },
    [frsMap, frsMutation],
  );

  const togglePublic = useCallback(
    (code: string) => {
      const key = `public:${code}`;
      const current = publicStateMap.get(code) ?? 'hidden';
      const next = nextState(current);
      const features = new Map(publicStateMap);
      if (next === 'hidden') features.delete(code);
      else features.set(code, next);
      setMutatingKey(key);
      publicMutation.mutate([...features].map(([c, s]) => ({ code: c, state: s })));
    },
    [publicStateMap, publicMutation],
  );

  // Full list (without umbrella) for bulk operations — must always toggle
  // every feature, even when search is active.
  const allFeatures = useMemo(() => THEORY_FEATURES.filter((f) => !UMBRELLA_CODES.has(f.code)), []);

  // ── Bulk toggles ──
  const bulkPublicAgg = useMemo(() => {
    const states = allFeatures.map((f) => publicStateMap.get(f.code) ?? 'hidden');
    return aggregateState(states);
  }, [allFeatures, publicStateMap]);

  const bulkTogglePublic = useCallback(() => {
    const next = bulkPublicAgg === 'mixed' ? 'hidden' : nextState(bulkPublicAgg);
    const features = new Map(publicStateMap);
    for (const feat of allFeatures) {
      if (next === 'hidden') features.delete(feat.code);
      else features.set(feat.code, next);
    }
    setMutatingKey('public:__bulk__');
    publicMutation.mutate([...features].map(([c, s]) => ({ code: c, state: s })));
  }, [bulkPublicAgg, publicStateMap, allFeatures, publicMutation]);

  const bulkRoleAgg = useCallback(
    (roleName: string): AggregateState => {
      const states = allFeatures.map((f) => getRoleState(roleName, f.code));
      return aggregateState(states);
    },
    [allFeatures, frsMap],
  );

  const bulkToggleRole = useCallback(
    async (roleName: string) => {
      const agg = bulkRoleAgg(roleName);
      const next = agg === 'mixed' ? 'hidden' : nextState(agg);
      const key = `role:__bulk__:${roleName}`;
      setMutatingKey(key);
      try {
        await Promise.all(
          allFeatures.map((feat) =>
            frsMutation.mutateAsync({ featureCode: feat.code, roleName, state: next }),
          ),
        );
        qc.invalidateQueries({ queryKey: FRS_KEY });
      } finally {
        setMutatingKey(null);
      }
    },
    [bulkRoleAgg, allFeatures, frsMutation, qc],
  );

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
      <h1 className="text-2xl font-bold mb-6">Теория</h1>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск разделов теории…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {roleList.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">Нет ролей</div>
      ) : filteredFeatures.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">Ничего не найдено</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[180px]">
                  Раздел теории
                </th>
                <th className="px-2 py-2 text-center text-[10px] font-normal text-muted-foreground border-x border-border/20">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>Public</span>
                    <span className="text-[10px] text-muted-foreground/60">без авторизации</span>
                  </div>
                </th>
                {roleList.map((role) => {
                  const isSystem = SYSTEM_ROLE_NAMES.includes(role.name);
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
                      </div>
                    </th>
                  );
                })}
              </tr>
              {/* Bulk-toggle row */}
              <tr className="border-b-2 border-border bg-muted/30">
                <td className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Все</td>
                <td className="px-1 py-1.5 text-center border-x border-border/10">
                  <BulkTriStateToggle
                    agg={bulkPublicAgg}
                    onChange={bulkTogglePublic}
                    disabled={!canWrite || mutatingKey === 'public:__bulk__'}
                  />
                </td>
                {roleList.map((role) => (
                  <td key={role.id} className="px-1 py-1.5 text-center border-x border-border/10">
                    <BulkTriStateToggle
                      agg={bulkRoleAgg(role.name)}
                      onChange={() => bulkToggleRole(role.name)}
                      disabled={!canWrite || mutatingKey === `role:__bulk__:${role.name}`}
                    />
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.map((feat) => (
                <tr
                  key={feat.code}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-2 text-sm" title={feat.code}>
                    {feat.label}
                  </td>
                  <td className="px-1 py-2 text-center border-x border-border/10">
                    <TriStateToggle
                      state={publicStateMap.get(feat.code) ?? 'hidden'}
                      onChange={() => togglePublic(feat.code)}
                      disabled={!canWrite || mutatingKey === `public:${feat.code}`}
                    />
                  </td>
                  {roleList.map((role) => (
                    <td key={role.id} className="px-1 py-2 text-center border-x border-border/10">
                      <TriStateToggle
                        state={getRoleState(role.name, feat.code)}
                        onChange={() => toggleRole(role.name, feat.code)}
                        disabled={!canWrite || mutatingKey === `role:${feat.code}:${role.name}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
