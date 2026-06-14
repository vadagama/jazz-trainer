import { useState, useCallback } from 'react';
import { useDebounce } from '@jazz/ui';
import { usePublicGrids } from './queries/usePublicGrids';
import { SearchBar } from './components/SearchBar';
import { PublicGridCard } from './components/PublicGridCard';

export function CatalogPage() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'updated' | 'likes' | 'name'>('updated');
  const debouncedQuery = useDebounce(query, 300);

  const {
    data: grids,
    isLoading,
    isError,
  } = usePublicGrids({
    q: debouncedQuery || undefined,
    sort,
  });

  const handleQueryChange = useCallback((v: string) => setQuery(v), []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Каталог сеток</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Публичные гармонические сетки для изучения и практики
          </p>
        </div>
        {grids && (
          <span className="shrink-0 text-sm text-muted-foreground">
            {grids.length} {grids.length === 1 ? 'сетка' : grids.length < 5 ? 'сетки' : 'сеток'}
          </span>
        )}
      </div>

      <SearchBar value={query} onChange={handleQueryChange} sort={sort} onSortChange={setSort} />

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

      {grids && grids.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {debouncedQuery
            ? `Ничего не найдено по запросу «${debouncedQuery}»`
            : 'Каталог пока пуст'}
        </div>
      )}

      {grids && grids.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grids.map((grid) => (
            <PublicGridCard key={grid.id} grid={grid} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CatalogPage;
