import { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AdminShell } from './components/layout/AdminShell';
import { EditorShell } from './components/layout/EditorShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RbacGuard } from './components/layout/RbacGuard';
import { contributions, instrumentRegistry } from './shell/bootstrap';
import type { RouteContribution } from '@jazz/plugin-sdk';
import { PluginProvider } from '@jazz/plugin-sdk';
import { useTransport } from '@/hooks/useTransport';
import { useDrumPreview } from '@/hooks/useDrumPreview';
import { usePercussionPreview } from '@/hooks/usePercussionPreview';
import { MidiSoloProvider } from './shell/MidiSoloProvider';

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
    r.path.startsWith('/compositions') ||
    r.path.startsWith('/admin');

  if (isProtected) {
    element = <ProtectedRoute>{element}</ProtectedRoute>;
  }

  return element;
}

/** Маршруты, которые рендерятся внутри AppShell (Header + GridContainer). */
const APP_SHELL_PATHS = new Set(['/', '/my', '/theory', '/settings', '/profile']);

function isAppShellRoute(path: string): boolean {
  return APP_SHELL_PATHS.has(path) || path.startsWith('/theory/');
}

function isAdminRoute(path: string): boolean {
  return path.startsWith('/admin/');
}

export function App() {
  const shellRoutes = contributions.routes.filter((r) => isAppShellRoute(r.path));
  const adminRoutes = contributions.routes.filter((r) => isAdminRoute(r.path));
  const editorRoutes = contributions.routes.filter(
    (r) =>
      r.path.startsWith('/compositions') ||
      r.path.startsWith('/play') ||
      r.path === '/practice-cards',
  );
  const bareRoutes = contributions.routes.filter(
    (r) =>
      !isAppShellRoute(r.path) &&
      !isAdminRoute(r.path) &&
      !r.path.startsWith('/compositions') &&
      !r.path.startsWith('/play') &&
      r.path !== '/practice-cards',
  );

  return (
    <PluginProvider
      useTransport={useTransport}
      useDrumPreview={useDrumPreview}
      usePercussionPreview={usePercussionPreview}
      instruments={instrumentRegistry}
    >
      <MidiSoloProvider>
        <Routes>
          {/* Admin: Header + AdminSidebar + content */}
          <Route element={<AdminShell />}>
            {adminRoutes.map((r) => {
              const element = <LazyRoute key={r.path} importer={r.element} />;
              return <Route key={r.path} path={r.path} element={wrapRoute(r, element)} />;
            })}
          </Route>

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
      </MidiSoloProvider>
    </PluginProvider>
  );
}
