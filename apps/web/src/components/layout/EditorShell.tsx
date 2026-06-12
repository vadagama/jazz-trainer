import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function EditorShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
