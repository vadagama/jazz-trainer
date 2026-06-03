import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { PublicDashboardPage } from './routes/PublicDashboardPage';
import { LoginPage } from './routes/LoginPage';
import { PlayerPage } from './routes/PlayerPage';
import { MyGridsPage } from './routes/MyGridsPage';
import { EditorPage } from './routes/EditorPage';
import { SettingsPage } from './routes/SettingsPage';
import { ProfilePage } from './routes/ProfilePage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Public */}
        <Route path="/" element={<PublicDashboardPage />} />
        <Route path="/play" element={<PlayerPage />} />
        <Route path="/play/:id" element={<PlayerPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route
          path="/my"
          element={
            <ProtectedRoute>
              <MyGridsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/grids/:id"
          element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
