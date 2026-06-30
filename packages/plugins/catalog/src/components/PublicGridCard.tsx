import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2, Trash2 } from 'lucide-react';
import type { PublicGridSummaryDTO } from '@jazz/shared';
import { useAuth } from '@jazz/plugin-sdk';
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
} from '@jazz/ui';
import { LikeButton } from './LikeButton';
import { useDeleteGrid } from '../queries/useDeleteGrid';

interface Props {
  grid: PublicGridSummaryDTO;
}

function GridTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-secondary-foreground">
      {children}
    </span>
  );
}

export function PublicGridCard({ grid }: Props) {
  const { user } = useAuth();
  const deleteGrid = useDeleteGrid();
  const [open, setOpen] = useState(false);

  return (
    <div className="group flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
      <div className="flex-1 p-5">
        <Link to={`/play/${grid.id}`} className="block">
          <h3 className="truncate font-semibold leading-snug hover:text-primary transition-colors">
            {grid.name}
          </h3>
        </Link>
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
        <LikeButton gridId={grid.id} likeCount={grid.likeCount} likedByMe={grid.likedByMe} />
        {user && (
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                disabled={deleteGrid.isPending}
                aria-label="Удалить сетку"
              >
                <Trash2 className="size-3.5" />
              </button>
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
        )}
      </div>
    </div>
  );
}
