import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { GridContainer } from './GridContainer';

export function AppShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="py-8">
          <GridContainer>
            <Outlet />
          </GridContainer>
        </div>
      </main>
    </div>
  );
}
