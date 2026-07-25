import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, usePermission } from '@jazz/plugin-sdk';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@jazz/ui';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  FLAG_CATEGORIES,
  type FeatureFlagDTO,
  type FlagCategory,
  type CreateFlagInput,
  type UpdateFlagInput,
} from '@jazz/shared';
import {
  FlagForm,
  emptyFlagFormValues,
  flagToFormValues,
  formToPayload,
  type FlagFormValues,
} from './FlagForm';

const FLAGS_KEY = ['admin', 'flags'] as const;
const AUTH_ME_KEY = ['auth', 'me'] as const;

const CATEGORY_LABEL: Record<FlagCategory, string> = {
  feature: 'Feature',
  experiment: 'Experiment',
  maintenance: 'Maintenance',
  killswitch: 'Kill switch',
};

const STATUS_ALL = '__all__' as const;
const STATUS_ENABLED = 'enabled' as const;
const STATUS_DISABLED = 'disabled' as const;
const STATUS_EXPIRED = 'expired' as const;

function formatDate(ts: number | null): string {
  if (ts == null || ts === 0) return '—';
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FlagsPage() {
  const qc = useQueryClient();
  const canWrite = usePermission('flags:write');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(STATUS_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL);

  // Create / edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<FlagFormValues>(emptyFlagFormValues);

  // Delete dialog state
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  const { data: flags, isLoading } = useQuery({
    queryKey: FLAGS_KEY,
    queryFn: () => apiClient.get<FeatureFlagDTO[]>('/api/admin/flags'),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: FLAGS_KEY });
    // Refresh the admin's own resolved flags so useFlag reflects changes.
    qc.invalidateQueries({ queryKey: AUTH_ME_KEY });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateFlagInput) =>
      apiClient.post<FeatureFlagDTO>('/api/admin/flags', payload),
    onSuccess: () => {
      invalidateAll();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: UpdateFlagInput }) =>
      apiClient.patch<FeatureFlagDTO>(`/api/admin/flags/${key}`, payload),
    onSuccess: () => {
      invalidateAll();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => apiClient.delete(`/api/admin/flags/${key}`),
    onSuccess: () => {
      invalidateAll();
      setDeleteKey(null);
    },
  });

  const filtered = useMemo(() => {
    let list = flags ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (f) =>
          f.key.toLowerCase().includes(q) ||
          (f.description ?? '').toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== STATUS_ALL) {
      list = list.filter((f) => (f.category ?? '') === categoryFilter);
    }
    if (statusFilter === STATUS_ENABLED) {
      list = list.filter((f) => f.enabled && !f.isExpired);
    } else if (statusFilter === STATUS_DISABLED) {
      list = list.filter((f) => !f.enabled);
    } else if (statusFilter === STATUS_EXPIRED) {
      list = list.filter((f) => f.isExpired);
    }
    return [...list].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [flags, search, categoryFilter, statusFilter]);

  const openCreate = () => {
    setEditingKey(null);
    setFormInitial(emptyFlagFormValues);
    setDialogOpen(true);
  };

  const openEdit = async (flag: FeatureFlagDTO) => {
    setEditingKey(flag.key);
    setFormInitial(flagToFormValues(flag));
    setDialogOpen(true);
  };

  const handleSubmit = async (values: FlagFormValues) => {
    const payload = formToPayload(values);
    if (editingKey) {
      // key is immutable on edit — strip it before PATCH
      const { key: _key, ...patch } = payload as CreateFlagInput;
      void _key;
      await updateMutation.mutateAsync({ key: editingKey, payload: patch as UpdateFlagInput });
    } else {
      await createMutation.mutateAsync(payload as CreateFlagInput);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Feature Flags</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Новый флаг
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          placeholder="Поиск по ключу или описанию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>Все категории</SelectItem>
            {FLAG_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>Все статусы</SelectItem>
            <SelectItem value={STATUS_ENABLED}>Включённые</SelectItem>
            <SelectItem value={STATUS_DISABLED}>Выключенные</SelectItem>
            <SelectItem value={STATUS_EXPIRED}>Просроченные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Статус
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Ключ
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Описание
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Таргетинг
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Срок
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Изменён
                </th>
                {canWrite && (
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Действия
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((flag) => {
                const targeting: string[] = [];
                if (flag.rolloutPercent != null) targeting.push(`📊 ${flag.rolloutPercent}%`);
                if (flag.roles.length > 0) targeting.push(`👥 ${flag.roles.length} рол.`);
                if (flag.userIds.length > 0) targeting.push(`👤 ${flag.userIds.length} польз.`);

                return (
                  <tr
                    key={flag.key}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {flag.isExpired ? (
                          <span title="Просрочен">⏰</span>
                        ) : flag.enabled ? (
                          <span title="Включён" className="text-green-600 dark:text-green-400">
                            🟢
                          </span>
                        ) : (
                          <span title="Выключен" className="text-muted-foreground">
                            🔴
                          </span>
                        )}
                        {flag.category && (
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABEL[flag.category]}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-mono text-sm hover:text-primary text-left"
                        onClick={() => canWrite && openEdit(flag)}
                        title={canWrite ? 'Редактировать' : flag.key}
                      >
                        {flag.key}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                      {flag.description || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {targeting.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Все</span>
                        ) : (
                          targeting.map((t, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {t}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {flag.expiresAt ? formatDate(flag.expiresAt) : 'Бессрочно'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(flag.updatedAt)}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(flag)}
                            disabled={isSubmitting}
                            title="Редактировать"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteKey(flag.key)}
                            disabled={deleteMutation.isPending}
                            title="Удалить"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {flags && flags.length > 0
              ? 'Нет флагов, соответствующих фильтрам'
              : 'Флагов пока нет'}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKey ? `Редактировать флаг «${editingKey}»` : 'Новый флаг'}
            </DialogTitle>
            <DialogDescription>
              {editingKey
                ? 'Изменения применяются после следующего запроса /api/auth/me.'
                : 'Создайте новый feature-флаг. Ключ нельзя изменить после создания.'}
            </DialogDescription>
          </DialogHeader>
          <FlagForm
            mode={editingKey ? 'edit' : 'create'}
            initial={formInitial}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => setDialogOpen(false)}
            submitLabel={editingKey ? 'Сохранить' : 'Создать'}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteKey !== null} onOpenChange={(o) => !o && setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить флаг?</AlertDialogTitle>
            <AlertDialogDescription>
              Флаг «{deleteKey}» будет удалён безвозвратно. История изменений сохранится в журнале
              аудита.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKey && deleteMutation.mutate(deleteKey)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
