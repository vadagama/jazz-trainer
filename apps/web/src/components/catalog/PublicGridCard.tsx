import { Link } from 'react-router-dom';
import { Play, Music } from 'lucide-react';
import type { PublicGridSummaryDTO } from '@jazz/shared';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LikeButton } from './LikeButton';
import { CopyToMineButton } from './CopyToMineButton';

interface Props {
  grid: PublicGridSummaryDTO;
}

export function PublicGridCard({ grid }: Props) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-medium leading-tight">{grid.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{grid.key}</Badge>
              <Badge variant="outline">{grid.timeSignature}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Music className="size-3" /> {grid.barsCount} тактов
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4 pt-0">
        <LikeButton gridId={grid.id} likeCount={grid.likeCount} likedByMe={grid.likedByMe} />

        <div className="flex items-center gap-2">
          <CopyToMineButton gridId={grid.id} gridName={grid.name} />
          <Button asChild size="sm" className="gap-1.5">
            <Link to={`/play/${grid.id}`}>
              <Play className="size-4" /> Играть
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
