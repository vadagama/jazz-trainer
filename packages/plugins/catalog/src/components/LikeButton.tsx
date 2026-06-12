import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@jazz/plugin-sdk';
import { useLikes } from '../queries/useLikes';
import { Button } from '@jazz/ui';

interface Props {
  gridId: string;
  likeCount: number;
  likedByMe: boolean;
}

export function LikeButton({ gridId, likeCount, likedByMe }: Props) {
  const { user } = useAuth();
  const { like, unlike } = useLikes();
  const [localLiked, setLocalLiked] = useState(likedByMe);
  const [localCount, setLocalCount] = useState(likeCount);

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Heart className="size-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{likeCount}</span>
      </div>
    );
  }

  const handleToggle = () => {
    if (localLiked) {
      setLocalLiked(false);
      setLocalCount((c) => Math.max(0, c - 1));
      unlike.mutate(gridId, {
        onError: () => {
          setLocalLiked(true);
          setLocalCount((c) => c + 1);
        },
      });
    } else {
      setLocalLiked(true);
      setLocalCount((c) => c + 1);
      like.mutate(gridId, {
        onError: () => {
          setLocalLiked(false);
          setLocalCount((c) => Math.max(0, c - 1));
        },
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-1.5 ${localLiked ? 'hover:bg-red-50 dark:hover:bg-red-950/30' : ''}`}
      onClick={handleToggle}
      disabled={like.isPending || unlike.isPending}
      aria-label={localLiked ? 'Убрать лайк' : 'Поставить лайк'}
    >
      <Heart className={`size-4 ${localLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
      <span className={`text-sm ${localLiked ? 'text-red-500' : ''}`}>{localCount}</span>
    </Button>
  );
}
