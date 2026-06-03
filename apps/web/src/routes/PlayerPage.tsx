import { Link, useParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Полный плеер публичных сеток — F8. */
export function PlayerPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Play className="size-12 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Плеер</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        Полный плеер с метрономом, HarmonyGrid и локальными override будет реализован в F8.
        {id && <> (сетка: <code className="text-primary">{id}</code>)</>}
      </p>
      <Button asChild variant="outline">
        <Link to="/">← В каталог</Link>
      </Button>
    </div>
  );
}
