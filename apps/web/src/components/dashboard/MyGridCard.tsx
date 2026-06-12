import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Music2, Pencil, Globe } from 'lucide-react';
import type { HarmonyGridSummaryDTO } from '@jazz/shared';
import { useDeleteGrid } from '@/queries/useMyGrids';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  grid: HarmonyGridSummaryDTO;
}

function GridTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-secondary-foreground">
      {children}
    </span>
  );
}

export function MyGridCard({ grid }: Props) {
  const deleteGrid = useDeleteGrid();
  const [open, setOpen] = useState(false);

  return (
    <div className="group flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold leading-snug">{grid.name}</h3>
          {grid.visibility === 'public' && (
            <Globe className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-label="Публичная" />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <GridTag>{grid.key}</GridTag>
          <GridTag>{grid.timeSignature}</GridTag>
          <GridTag>
            <Music2 className="mr-0.5 inline size-2.5" />
            {grid.barsCount} тактов
          </GridTag>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link to={`/grids/${grid.id}`}>
            <Pencil className="size-3.5" /> Редактировать
          </Link>
        </Button>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              disabled={deleteGrid.isPending}
              aria-label="Удалить сетку"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить сетку?</AlertDialogTitle>
              <AlertDialogDescription>
                «{grid.name}» будет удалена без возможности восстановления.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteGrid.mutate(grid.id)}>
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
