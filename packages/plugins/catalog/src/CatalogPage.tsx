import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List } from 'lucide-react';
import { useDebounce } from '@jazz/ui';
import type { CatalogSort } from '@jazz/shared';
import { useCatalog } from './queries/usePublicCompositions';
import { SearchBar } from './components/SearchBar';
import { CatalogFilters, type CatalogFilterState } from './components/CatalogFilters';
import { PublicCompositionCard } from './components/PublicCompositionCard';

const EMPTY_FILTERS: CatalogFilterState = {
  style: [],
  timeSignature: [],
  difficulty: [],
  key: [],
  tags: [],
  author: '',
};

type ViewMode = 'big-tiles' | 'list';

const VIEW_OPTIONS: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { mode: 'big-tiles', icon: LayoutGrid, label: 'Крупные плитки' },
  { mode: 'list', icon: List, label: 'Список' },
];

const GRID_CLASS: Record<ViewMode, string> = {
  'big-tiles': 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
  list: 'flex flex-col gap-3',
};

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [sort, setSort] = useState<CatalogSort>(
    (searchParams.get('sort') as CatalogSort) ?? 'popular',
  );
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('big-tiles');
  const debouncedQuery = useDebounce(query, 300);

  const catalogParams = useMemo(
    () => ({
      q: debouncedQuery || undefined,
      sort,
      style: filters.style.join(',') || undefined,
      timeSignature: filters.timeSignature.join(',') || undefined,
      difficulty: filters.difficulty.join(',') || undefined,
      key: filters.key.join(',') || undefined,
      tags: filters.tags.join(',') || undefined,
      author: filters.author || undefined,
    }),
    [debouncedQuery, sort, filters],
  );

  const { data: entries, isLoading, isError } = useCatalog(catalogParams);

  const handleQueryChange = useCallback(
    (v: string) => {
      setQuery(v);
      const next = new URLSearchParams(searchParams);
      if (v) next.set('q', v);
      else next.delete('q');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleSortChange = useCallback(
    (v: CatalogSort) => {
      setSort(v);
      const next = new URLSearchParams(searchParams);
      next.set('sort', v);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const hasActiveFilters =
    filters.style.length > 0 ||
    filters.timeSignature.length > 0 ||
    filters.difficulty.length > 0 ||
    filters.key.length > 0 ||
    filters.tags.length > 0 ||
    !!filters.author;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Каталог композиций</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Джазовые стандарты, авторские произведения — для изучения и практики
          </p>
        </div>
        {entries && (
          <span className="shrink-0 text-sm text-muted-foreground">
            {entries.length}{' '}
            {entries.length === 1
              ? 'композиция'
              : entries.length < 5
                ? 'композиции'
                : 'композиций'}
          </span>
        )}
      </div>

      <SearchBar value={query} onChange={handleQueryChange} sort={sort} onSortChange={handleSortChange} />

      <div className="flex items-center justify-between gap-4">
        <CatalogFilters value={filters} onChange={setFilters} />
        <div className="inline-flex shrink-0 items-center rounded-md border border-border bg-card p-0.5">
          {VIEW_OPTIONS.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-accent text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={label}
              title={label}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => setFilters(EMPTY_FILTERS)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Сбросить фильтры
        </button>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          Не удалось загрузить каталог. Попробуйте обновить страницу.
        </div>
      )}

      {entries && entries.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {debouncedQuery || hasActiveFilters
            ? 'Ничего не найдено. Попробуйте изменить фильтры.'
            : 'Каталог пока пуст'}
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className={GRID_CLASS[viewMode]}>
          {entries.map((entry) => (
            <PublicCompositionCard key={entry.id} entry={entry} variant={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CatalogPage;
