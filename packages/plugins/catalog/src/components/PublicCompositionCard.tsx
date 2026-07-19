import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Copy, Pencil } from 'lucide-react';
import type { CatalogEntry } from '@jazz/shared';
import { useAuth, usePermission } from '@jazz/plugin-sdk';
import { Badge } from '@jazz/ui';
import { LikeButton } from './LikeButton';
import { CopyToMineButton } from './CopyToMineButton';
import { useLikes } from '../queries/useLikes';
import { useCopyToMine } from '../queries/useCopyToMine';

export type CardVariant = 'big-tiles' | 'list';

interface Props {
  entry: CatalogEntry;
  variant: CardVariant;
}

const DIFFICULTY_LABEL: Record<CatalogEntry['difficulty'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const DIFFICULTY_COLOR: Record<CatalogEntry['difficulty'], string> = {
  beginner: 'bg-green-500/15 text-green-400 border-green-500/30',
  intermediate: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function DifficultyBadge({ difficulty }: { difficulty: CatalogEntry['difficulty'] }) {
  return (
    <span
      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${DIFFICULTY_COLOR[difficulty]}`}
    >
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

function MetaFlow({ entry }: { entry: CatalogEntry }) {
  const parts: string[] = [entry.timeSignature];
  if (entry.recommendedTempo) parts.push(`${entry.recommendedTempo} BPM`);
  parts.push(...entry.tags.slice(0, 4));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {parts.map((p) => (
        <Badge key={p} variant="secondary" className="rounded-sm px-1.5 py-0 text-[10px] font-medium normal-case">
          {p}
        </Badge>
      ))}
    </div>
  );
}

function EditButton({ compositionId }: { compositionId: string }) {
  const canEdit = usePermission('catalog:moderate');
  if (!canEdit) return null;

  return (
    <Link
      to={`/compositions/${compositionId}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground"
      aria-label="Редактировать"
    >
      <Pencil className="size-4" />
      Изменить
    </Link>
  );
}

function ActionBar({ entry }: { entry: CatalogEntry }) {
  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3">
      <LikeButton
        compositionId={entry.id}
        likeCount={entry.likeCount}
        likedByMe={entry.likedByMe}
      />
      <div className="flex items-center gap-2">
        <EditButton compositionId={entry.id} />
        <CopyToMineButton
          compositionId={entry.id}
          compositionName={entry.name}
        />
      </div>
    </div>
  );
}

function ListActionButtons({ entry }: { entry: CatalogEntry }) {
  const { user } = useAuth();
  const { like, unlike } = useLikes();
  const copy = useCopyToMine();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(entry.likedByMe);
  const [likeCount, setLikeCount] = useState(entry.likeCount);

  const handleLike = () => {
    if (!user) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      unlike.mutate(entry.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      like.mutate(entry.id);
    }
  };

  const handleCopy = async () => {
    if (!user) return;
    const result = await copy.mutateAsync({
      compositionId: entry.id,
      name: `${entry.name} (копия)`,
    });
    navigate(`/compositions/${result.id}`);
  };

  const canEdit = usePermission('catalog:moderate');

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={handleLike}
        className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-red-500"
        aria-label={liked ? 'Убрать лайк' : 'Поставить лайк'}
      >
        <Heart
          className={`size-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`}
        />
        <span className="ml-0.5 text-[11px]">{likeCount}</span>
      </button>
      {canEdit && (
        <Link
          to={`/compositions/${entry.id}`}
          className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          aria-label="Редактировать"
        >
          <Pencil className="size-3.5" />
        </Link>
      )}
      {user && (
        <button
          type="button"
          onClick={handleCopy}
          disabled={copy.isPending}
          className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          aria-label="Копировать"
        >
          <Copy className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function PublicCompositionCard({ entry, variant }: Props) {
  // ── List variant ──
  if (variant === 'list') {
    return (
      <div className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={`/play/${entry.id}`} className="min-w-0">
              <h3 className="truncate font-semibold leading-snug hover:text-primary transition-colors">
                {entry.name}
              </h3>
            </Link>
            <DifficultyBadge difficulty={entry.difficulty} />
          </div>
          {entry.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {entry.description}
            </p>
          )}
          <div className="mt-1">
            <MetaFlow entry={entry} />
          </div>
        </div>
        <ListActionButtons entry={entry} />
      </div>
    );
  }

  // ── Big tiles variant (default: full card) ──
  return (
    <div className="group flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-primary/40">

      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/play/${entry.id}`} className="block min-w-0">
            <h3 className="truncate font-semibold leading-snug hover:text-primary transition-colors">
              {entry.name}
            </h3>
          </Link>
          <DifficultyBadge difficulty={entry.difficulty} />
        </div>

        {entry.author && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.author}</p>
        )}

        {entry.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{entry.description}</p>
        )}

        {(entry.tags.length > 0 || entry.recommendedTempo) && (
          <div className="mt-3">
            <MetaFlow entry={entry} />
          </div>
        )}
      </div>

      <ActionBar entry={entry} />
    </div>
  );
}
