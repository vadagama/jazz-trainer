import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Trash2, Check, X, Eye, Upload } from 'lucide-react';
import type { CatalogEntry } from '@jazz/shared';
import { Button, useDebounce } from '@jazz/ui';
import {
  useAdminCatalog,
  useRejectEntry,
  useApproveEntry,
  useToggleFeatured,
  useDeleteEntry,
  useBatchAction,
  usePublishEntry,
} from './queries/useCatalogAdmin';
import { AdminSearchBar, type AdminSort } from './AdminSearchBar';
import { AdminFilters, EMPTY_ADMIN_FILTERS, type AdminFilterState } from './AdminFilters';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function matchesQuery(entry: CatalogEntry, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    entry.name.toLowerCase().includes(lower) ||
    entry.author.toLowerCase().includes(lower) ||
    (entry.description ?? '').toLowerCase().includes(lower) ||
    entry.tags.some((t) => t.toLowerCase().includes(lower)) ||
    entry.publisherName.toLowerCase().includes(lower)
  );
}

function matchesFilters(entry: CatalogEntry, f: AdminFilterState): boolean {
  if (f.style.length > 0 && !f.style.includes(entry.recommendedStyle ?? '')) return false;
  if (f.timeSignature.length > 0 && !f.timeSignature.includes(entry.timeSignature)) return false;
  if (f.difficulty.length > 0 && !f.difficulty.includes(entry.difficulty)) return false;
  if (f.key.length > 0 && !f.key.includes(entry.key)) return false;
  if (f.tags.length > 0) {
    const want = new Set(f.tags);
    if (!entry.tags.some((t) => want.has(t))) return false;
  }
  if (f.author && !entry.author.toLowerCase().includes(f.author.toLowerCase())) return false;
  if (f.visibility.length > 0 && !f.visibility.includes(entry.visibility)) return false;
  if (f.moderationStatus.length > 0) {
    if (entry.visibility === 'private') {
      /* private entries have no moderation — skip moderation filter for them */
      if (!f.moderationStatus.includes('rejected')) return false;
    } else {
      if (!f.moderationStatus.includes(entry.moderationStatus)) return false;
    }
  }
  return true;
}

export function CatalogModerationPage() {
  const { data: entries, isLoading } = useAdminCatalog();
  const reject = useRejectEntry();
  const approve = useApproveEntry();
  const toggleFeatured = useToggleFeatured();
  const deleteEntry = useDeleteEntry();
  const batch = useBatchAction();
  const publishEntry = usePublishEntry();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState<'publish' | 'unpublish' | 'addToCatalog' | 'delete'>(
    'publish',
  );

  // Search & filter state
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<AdminSort>('newest');
  const [filters, setFilters] = useState<AdminFilterState>(EMPTY_ADMIN_FILTERS);
  const debouncedQuery = useDebounce(query, 300);

  // Client-side filtering & sorting
  const filteredEntries = useMemo(() => {
    if (!entries) return undefined;
    let result = entries.filter((e) => matchesQuery(e, debouncedQuery) && matchesFilters(e, filters));
    if (sort === 'name_asc') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    } else if (sort === 'updated') {
      result = [...result].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    // 'newest' is already the default ordering from the API (catalogPublishedAt desc)
    return result;
  }, [entries, debouncedQuery, sort, filters]);

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!filteredEntries) return;
    if (selected.size === filteredEntries.length) setSelected(new Set());
    else setSelected(new Set(filteredEntries.map((e) => e.id)));
  };

  const runBatch = () => {
    if (selected.size === 0) return;
    batch.mutate(
      { ids: [...selected], action: batchAction },
      { onSuccess: () => setSelected(new Set()) },
    );
  };

  const handleFilterChange = useCallback((next: AdminFilterState) => {
    setFilters(next);
    setSelected(new Set());
  }, []);

  const hasActiveFilters =
    filters.style.length > 0 ||
    filters.timeSignature.length > 0 ||
    filters.difficulty.length > 0 ||
    filters.key.length > 0 ||
    filters.tags.length > 0 ||
    filters.visibility.length > 0 ||
    filters.moderationStatus.length > 0 ||
    !!filters.author;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Модерация каталога</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Управление публикациями: одобрение, скрытие, featured, удаление
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/catalog/tags"
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Теги
          </Link>
          <Link
            to="/admin/catalog/stats"
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Статистика
          </Link>
        </div>
      </div>

      {/* Search & sort */}
      <AdminSearchBar value={query} onChange={setQuery} sort={sort} onSortChange={setSort} />

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <AdminFilters value={filters} onChange={handleFilterChange} />
        {filteredEntries && (
          <span className="shrink-0 text-sm text-muted-foreground">
            {filteredEntries.length}{' '}
            {filteredEntries.length === 1
              ? 'запись'
              : filteredEntries.length < 5
                ? 'записи'
                : 'записей'}
          </span>
        )}
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => handleFilterChange(EMPTY_ADMIN_FILTERS)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Сбросить фильтры
        </button>
      )}

      {/* Batch actions */}
      {filteredEntries && filteredEntries.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">
            Выбрано: {selected.size}
          </span>
          <select
            value={batchAction}
            onChange={(e) => setBatchAction(e.target.value as typeof batchAction)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="publish">Опубликовать</option>
            <option value="unpublish">Снять с публикации</option>
            <option value="addToCatalog">Добавить в каталог</option>
            <option value="delete">Удалить</option>
          </select>
          <Button
            size="sm"
            disabled={selected.size === 0 || batch.isPending}
            onClick={runBatch}
          >
            Применить
          </Button>
        </div>
      )}

      {/* Table */}
      {filteredEntries && filteredEntries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {debouncedQuery || hasActiveFilters
            ? 'Ничего не найдено. Попробуйте изменить фильтры.'
            : 'Нет публикаций для модерации'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={!!filteredEntries && selected.size === filteredEntries.length && filteredEntries.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="p-3">Название</th>
                <th className="p-3">Автор / Публикатор</th>
                <th className="p-3">Дата и время</th>
                <th className="p-3">Статус</th>
                <th className="p-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries?.map((entry) => (
                <ModerationRow
                  key={entry.id}
                  entry={entry}
                  selected={selected.has(entry.id)}
                  onToggleSelect={() => toggleSelect(entry.id)}
                  onReject={() => reject.mutate(entry.id)}
                  onApprove={() => approve.mutate(entry.id)}
                  onPublish={() => publishEntry.mutate(entry.id)}
                  onToggleFeatured={() => toggleFeatured.mutate(entry.id)}
                  onDelete={() => deleteEntry.mutate(entry.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ entry }: { entry: CatalogEntry }) {
  if (entry.visibility === 'private') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/15 px-2 py-0.5 text-xs text-gray-400">
        Черновик
      </span>
    );
  }
  if (entry.moderationStatus === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-400">
        <Check className="size-3" /> Опубликовано
      </span>
    );
  }
  if (entry.moderationStatus === 'modified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-400">
        Изменено
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
      Не опубликовано
    </span>
  );
}

function ModerationRow({
  entry,
  selected,
  onToggleSelect,
  onReject,
  onApprove,
  onPublish,
  onToggleFeatured,
  onDelete,
}: {
  entry: CatalogEntry;
  selected: boolean;
  onToggleSelect: () => void;
  onReject: () => void;
  onApprove: () => void;
  onPublish: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30">
      <td className="p-3">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      </td>
      <td className="p-3">
        <Link
          to={`/admin/catalog/${entry.id}/edit`}
          className="font-medium text-primary hover:underline"
        >
          {entry.name}
        </Link>
        {entry.tags.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {entry.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                {t}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="p-3">
        <div className="text-xs">
          <div className="text-foreground">{entry.author}</div>
          <div className="text-muted-foreground">{entry.publisherName}</div>
        </div>
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        {formatDate(entry.catalogPublishedAt)}
      </td>
      <td className="p-3">
        <StatusBadge entry={entry} />
      </td>
      <td className="p-3">
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/compositions/${entry.id}`}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Редактировать"
          >
            <Eye className="size-3.5" />
          </Link>
          {entry.visibility === 'private' ? (
            <button
              onClick={onPublish}
              className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              title="Добавить в каталог"
            >
              <Upload className="size-3.5" />
            </button>
          ) : entry.moderationStatus === 'approved' ? (
            <>
              <button
                onClick={onToggleFeatured}
                className={`rounded p-1.5 transition-colors ${
                  entry.featured
                    ? 'text-amber-400 hover:bg-amber-500/10'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
                title={entry.featured ? 'Убрать из избранного' : 'В избранное'}
              >
                <Star className={`size-3.5 ${entry.featured ? 'fill-amber-400' : ''}`} />
              </button>
              <button
                onClick={onReject}
                className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                title="Снять с публикации"
              >
                <X className="size-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={onApprove}
              className="rounded p-1.5 text-muted-foreground hover:bg-green-500/10 hover:text-green-400"
              title="Опубликовать"
            >
              <Check className="size-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
            title="Удалить"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default CatalogModerationPage;
