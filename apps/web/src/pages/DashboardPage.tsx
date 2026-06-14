import { Link } from 'react-router-dom';
import { Music4 } from 'lucide-react';

/** Public dashboard placeholder — real catalog/player lands in F6/F8. */
export function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex items-center gap-3">
        <Music4 className="size-9 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">Jazz Trainer</h1>
      </div>
      <p className="max-w-md text-muted-foreground">
        Гармонические сетки, точный метроном, DSL для гармонии и генераторы прогрессий. Каркас
        приложения — публичный каталог и плеер появятся в следующих фичах.
      </p>
      <Link
        to="/login"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Войти
      </Link>
    </main>
  );
}
