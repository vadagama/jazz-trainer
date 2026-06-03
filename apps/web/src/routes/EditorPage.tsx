import { Link, useParams } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Редактор гармонической сетки — F7. */
export function EditorPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <LayoutGrid className="size-12 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Редактор</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        Harmony editor с DSL-панелью, генератором и транспортом будет реализован в F7.
        {id && <> (сетка: <code className="text-primary">{id}</code>)</>}
      </p>
      <Button asChild variant="outline">
        <Link to="/my">← Мои сетки</Link>
      </Button>
    </div>
  );
}
