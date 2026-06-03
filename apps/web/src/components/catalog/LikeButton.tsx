import { Heart } from 'lucide-react';
import { useAuth } from '@/queries/useAuth';
import { useLikes } from '@/queries/useLikes';
import { SignInPrompt } from '@/components/auth/SignInPrompt';
import { Button } from '@/components/ui/button';

interface Props {
  gridId: string;
  likeCount: number;
  likedByMe: boolean;
}

export function LikeButton({ gridId, likeCount, likedByMe }: Props) {
  const { user } = useAuth();
  const { like, unlike } = useLikes();

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Heart className="size-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{likeCount}</span>
        <SignInPrompt action="лайкать" />
      </div>
    );
  }

  const isPending = like.isPending || unlike.isPending;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5"
      disabled={isPending}
      onClick={() => (likedByMe ? unlike.mutate(gridId) : like.mutate(gridId))}
      aria-label={likedByMe ? 'Убрать лайк' : 'Поставить лайк'}
    >
      <Heart className={`size-4 ${likedByMe ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
      <span className="text-sm">{likeCount}</span>
    </Button>
  );
}
