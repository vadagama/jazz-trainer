import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Globe, Upload } from 'lucide-react';
import type { HarmonyCompositionSummaryDTO } from '@jazz/shared';
import { useDeleteComposition, usePublishComposition } from '@/queries/useMyCompositions';
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
  composition: HarmonyCompositionSummaryDTO;
}

const STYLE_LABEL: Record<string, string> = {
  swing: 'Swing',
  bossa: 'Bossa',
  funk: 'Funk',
  latin: 'Latin',
  ballad: 'Ballad',
};

function CompTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-secondary-foreground">
      {children}
    </span>
  );
}

export function MyCompositionCard({ composition }: Props) {
  const deleteComposition = useDeleteComposition();
  const publishComposition = usePublishComposition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const style = composition.recommendedStyle ?? 'swing';
  const tempo = composition.recommendedTempo ?? 120;

  return (
    <div className="group flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/compositions/${composition.id}`} className="block min-w-0">
            <h3 className="truncate font-semibold leading-snug hover:text-primary transition-colors">
              {composition.name}
            </h3>
          </Link>
          {composition.visibility === 'public' && (
            <Globe
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              aria-label="Публичная"
            />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <CompTag>{composition.timeSignature}</CompTag>
          <CompTag>{STYLE_LABEL[style] ?? style}</CompTag>
          <CompTag>{tempo} BPM</CompTag>
        </div>
      </div>

      <div className="flex items-center border-t border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={deleteComposition.isPending}
              >
                <Trash2 className="size-4" />
                Удалить
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить композицию?</AlertDialogTitle>
                <AlertDialogDescription>
                  «{composition.name}» будет удалена без возможности восстановления.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteComposition.mutate(composition.id)}>
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={publishComposition.isPending}
            onClick={() => publishComposition.mutate(composition.id)}
          >
            <Upload className="size-4" />
            Публиковать
          </Button>
        </div>
      </div>
    </div>
  );
}
