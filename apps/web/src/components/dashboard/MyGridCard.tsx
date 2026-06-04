import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Music, Pencil } from 'lucide-react';
import type { HarmonyGridSummaryDTO } from '@jazz/shared';
import { useDeleteGrid } from '@/queries/useMyGrids';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export function MyGridCard({ grid }: Props) {
  const deleteGrid = useDeleteGrid();
  const [open, setOpen] = useState(false);

  return (
    <Card className="flex flex-col">
      <CardContent className="flex-1 p-4">
        <h3 className="truncate font-medium leading-tight">{grid.name}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{grid.key}</Badge>
          <Badge variant="outline">{grid.timeSignature}</Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Music className="size-3" /> {grid.barsCount} тактов
          </span>
          {grid.visibility === 'public' && (
            <Badge variant="default" className="text-[10px]">публичная</Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between px-4 pb-4 pt-0">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to={`/grids/${grid.id}`}>
            <Pencil className="size-4" /> Редактировать
          </Link>
        </Button>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              disabled={deleteGrid.isPending}
              aria-label="Удалить сетку"
            >
              <Trash2 className="size-4" />
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
      </CardFooter>
    </Card>
  );
}
