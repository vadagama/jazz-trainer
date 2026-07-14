import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { AdminSidebar } from './AdminSidebar';

export function AdminShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
