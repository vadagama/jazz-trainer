import { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RbacGuard } from './components/layout/RbacGuard';
import { contributions } from './shell/bootstrap';
import type { RouteContribution } from '@jazz/plugin-sdk';
import { PluginProvider } from '@jazz/plugin-sdk';
import { useTransport } from '@/engine/useTransport';

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

/** Determine protection level for a route based on path and requires. */
function wrapRoute(r: RouteContribution, child: React.ReactNode): React.ReactNode {
  let element = child;

  // If route requires a specific permission, wrap with RbacGuard
  if (r.requires) {
    element = <RbacGuard permission={r.requires}>{element}</RbacGuard>;
  }

  // Auth-protected routes
  const isProtected =
    ['/my', '/settings', '/profile'].includes(r.path) ||
    r.path.startsWith('/grids') ||
    r.path.startsWith('/admin');

  if (isProtected) {
    element = <ProtectedRoute>{element}</ProtectedRoute>;
  }

  return element;
}

/** Маршруты, которые рендерятся внутри AppShell (layout с Header + GridContainer). */
const APP_SHELL_PATHS = new Set(['/', '/login', '/my', '/settings', '/profile']);

export function App() {
  return (
    <PluginProvider useTransport={useTransport}>
      <Routes>
        <Route element={<AppShell />}>
          {contributions.routes
            .filter((r) => APP_SHELL_PATHS.has(r.path))
            .map((r) => {
              const element = <LazyRoute importer={r.element} />;
              return <Route key={r.path} path={r.path} element={wrapRoute(r, element)} />;
            })}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Full-screen layouts outside AppShell */}
        {contributions.routes
          .filter((r) => !APP_SHELL_PATHS.has(r.path))
          .map((r) => {
            const element = <LazyRoute importer={r.element} />;
            return <Route key={r.path} path={r.path} element={wrapRoute(r, element)} />;
          })}
      </Routes>
    </PluginProvider>
  );
}
