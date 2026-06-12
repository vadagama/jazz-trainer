import { Link } from 'react-router-dom';
import { Play, Music2 } from 'lucide-react';
import type { PublicGridSummaryDTO } from '@jazz/shared';
import { Button } from '@jazz/ui';
import { LikeButton } from './LikeButton';
import { CopyToMineButton } from './CopyToMineButton';

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
  return (
    <div className="group flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
      <div className="flex-1 p-5">
        <h3 className="truncate font-semibold leading-snug">{grid.name}</h3>
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
        <div className="flex items-center gap-2">
          <CopyToMineButton gridId={grid.id} gridName={grid.name} />
          <Button asChild size="sm" className="gap-1.5">
            <Link to={`/play/${grid.id}`}>
              <Play className="size-3.5" /> Играть
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
