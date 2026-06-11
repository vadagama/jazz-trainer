import { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { contributions } from './shell/bootstrap';
import type { RouteContribution } from '@jazz/plugin-sdk';

/**
 * Создаёт ленивый компонент из RouteContribution.element().
 * Каждый element() возвращает Promise<модуль>, у модуля должен быть default-экспорт.
 */
function LazyRoute({ importer }: { importer: RouteContribution['element'] }) {
  const LazyComponent = useMemo(
    () => lazy(() => importer().then((mod) => ({ default: mod.default || mod }))),
    [importer],
  );
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-muted-foreground">
          Загрузка…
        </div>
      }
    >
      <LazyComponent />
    </Suspense>
  );
}

/** Маршруты, которые рендерятся внутри AppShell (layout с Header + GridContainer). */
const APP_SHELL_PATHS = new Set(['/', '/login', '/my', '/settings', '/profile']);

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {contributions.routes
          .filter((r) => APP_SHELL_PATHS.has(r.path))
          .map((r) => {
            const isProtected = ['/my', '/settings', '/profile'].includes(r.path);
            const element = <LazyRoute importer={r.element} />;

            return (
              <Route
                key={r.path}
                path={r.path}
                element={isProtected ? <ProtectedRoute>{element}</ProtectedRoute> : element}
              />
            );
          })}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      {/* Full-screen layouts outside AppShell */}
      {contributions.routes
        .filter((r) => !APP_SHELL_PATHS.has(r.path))
        .map((r) => {
          const isProtected = r.path.startsWith('/grids');
          const element = <LazyRoute importer={r.element} />;

          return (
            <Route
              key={r.path}
              path={r.path}
              element={isProtected ? <ProtectedRoute>{element}</ProtectedRoute> : element}
            />
          );
        })}
    </Routes>
  );
}
