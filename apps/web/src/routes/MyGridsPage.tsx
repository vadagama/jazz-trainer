import { useState } from 'react';
import { Search } from 'lucide-react';
import { useMyGrids } from '@/queries/useMyGrids';
import { MyGridCard } from '@/components/dashboard/MyGridCard';
import { CreateGridDialog } from '@/components/dashboard/CreateGridDialog';
import { Input } from '@/components/ui/input';

export default function MyGridsPage() {
  const { data: grids, isLoading } = useMyGrids();
  const [query, setQuery] = useState('');

  const filtered = grids?.filter(
    (g) =>
      g.name.toLowerCase().includes(query.toLowerCase()) ||
      g.key.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Мои сетки</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ваши гармонические сетки</p>
        </div>
        <CreateGridDialog />
      </div>

      {grids && grids.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или тональности…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {grids && grids.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">У вас ещё нет сеток</p>
          <CreateGridDialog />
        </div>
      )}

      {filtered && filtered.length === 0 && query && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Ничего не найдено по запросу «{query}»
        </p>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((grid) => (
            <MyGridCard key={grid.id} grid={grid} />
          ))}
        </div>
      )}
    </div>
  );
}
