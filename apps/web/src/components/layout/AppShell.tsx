import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { GridContainer } from './GridContainer';

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="py-6">
        <GridContainer>
          <Outlet />
        </GridContainer>
      </main>
    </div>
  );
}
