import { useMyGrids } from '@/queries/useMyGrids';
import { MyGridCard } from '@/components/dashboard/MyGridCard';
import { CreateGridDialog } from '@/components/dashboard/CreateGridDialog';

export function MyGridsPage() {
  const { data: grids, isLoading } = useMyGrids();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Мои сетки</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ваши гармонические сетки</p>
        </div>
        <CreateGridDialog />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {grids && grids.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-muted-foreground">У вас ещё нет сеток</p>
          <CreateGridDialog />
        </div>
      )}

      {grids && grids.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grids.map((grid) => (
            <MyGridCard key={grid.id} grid={grid} />
          ))}
        </div>
      )}
    </div>
  );
}
