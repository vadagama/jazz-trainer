import { Link } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import type { CatalogEntry } from '@jazz/shared';
import { useFeatured } from '../queries/usePublicCompositions';

function FeaturedCard({ entry }: { entry: CatalogEntry }) {
  return (
    <Link
      to={`/play/${entry.id}`}
      className="group relative flex min-w-[260px] max-w-[260px] flex-col gap-2 overflow-hidden rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4 transition-colors hover:border-amber-500/40"
    >
      <div className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
        <Star className="size-3 fill-amber-400" />
        Выбор редакции
      </div>
      <h3 className="truncate font-semibold leading-snug">{entry.name}</h3>
      {entry.author && (
        <p className="truncate text-xs text-muted-foreground">{entry.author}</p>
      )}
      <div className="mt-auto flex items-center gap-2 text-xs capitalize text-muted-foreground">
        <span>{entry.timeSignature}</span>
        {entry.recommendedTempo && (
          <>
            <span className="text-border">·</span>
            <span>{entry.recommendedTempo} BPM</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">❤ {entry.likeCount}</span>
        <Play className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
    </Link>
  );
}

export function CatalogFeatured() {
  const { data: featured, isLoading } = useFeatured();

  if (isLoading || !featured || featured.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">⭐ Избранное</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {featured.map((entry) => (
          <FeaturedCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
