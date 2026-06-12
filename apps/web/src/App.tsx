import { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { EditorShell } from './components/layout/EditorShell';
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

/** Маршруты, которые рендерятся внутри AppShell (Header + GridContainer). */
const APP_SHELL_PATHS = new Set(['/', '/my', '/settings', '/profile']);

/** Маршруты редактора — Header + full-height layout без скролла. */
const EDITOR_SHELL_PATHS = new Set(['/grids/:id']);

export function App() {
  const shellRoutes = contributions.routes.filter((r) => APP_SHELL_PATHS.has(r.path));
  const editorRoutes = contributions.routes.filter(
    (r) => r.path.startsWith('/grids') || r.path.startsWith('/play'),
  );
  const bareRoutes = contributions.routes.filter(
    (r) =>
      !APP_SHELL_PATHS.has(r.path) &&
      !r.path.startsWith('/grids') &&
      !r.path.startsWith('/play'),
  );

  return (
    <PluginProvider useTransport={useTransport}>
      <Routes>
        {/* Header + scrollable GridContainer */}
        <Route element={<AppShell />}>
          {shellRoutes.map((r) => {
            const element = <LazyRoute key={r.path} importer={r.element} />;
            return <Route key={r.path} path={r.path} element={wrapRoute(r, element)} />;
          })}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Header + full-height editor */}
        <Route element={<EditorShell />}>
          {editorRoutes.map((r) => {
            const element = <LazyRoute key={r.path} importer={r.element} />;
            return <Route key={r.path} path={r.path} element={wrapRoute(r, element)} />;
          })}
        </Route>

        {/* Bare routes (login, etc.) */}
        {bareRoutes.map((r) => {
          const element = <LazyRoute key={r.path} importer={r.element} />;
          return <Route key={r.path} path={r.path} element={wrapRoute(r, element)} />;
        })}
      </Routes>
    </PluginProvider>
  );
}
