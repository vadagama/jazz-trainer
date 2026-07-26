import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';

/** Public dashboard placeholder — real catalog/player lands in F6/F8. */
export function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex items-center gap-3">
        <Logo className="size-9" />
        <h1 className="text-3xl font-semibold tracking-tight">Amazilia</h1>
      </div>
      <p className="max-w-md text-muted-foreground">
        Гармонические композиции, точный метроном, DSL для гармонии и генераторы прогрессий. Каркас
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
