import { Link } from 'react-router-dom';

/** Login placeholder — Google OAuth + dev-login wired up in F4/F6. */
export function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Вход</h1>
      <p className="max-w-md text-muted-foreground">
        Аутентификация (Google OAuth + dev-login) подключается в фиче F4.
      </p>
      <Link to="/" className="text-sm text-primary underline-offset-4 hover:underline">
        ← На главную
      </Link>
    </main>
  );
}
