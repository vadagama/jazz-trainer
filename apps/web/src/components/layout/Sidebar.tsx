import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Music4, LayoutGrid, Library, Settings, LogOut, Sun, Moon, User } from 'lucide-react';
import { useAuth, useLogout } from '@/queries/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const PUBLIC_NAV: NavItem[] = [{ to: '/', icon: LayoutGrid, label: 'Каталог' }];
const AUTH_NAV: NavItem[] = [{ to: '/my', icon: Library, label: 'Мои сетки' }];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();

  const navItems = user ? [...PUBLIC_NAV, ...AUTH_NAV] : PUBLIC_NAV;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <Music4 className="size-5 shrink-0 text-primary" />
        <span className="font-semibold tracking-tight">Jazz Trainer</span>
      </div>

      {/* Primary navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {navItems.map((item) => (
          <NavLink key={item.to} item={item} active={pathname === item.to} />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="space-y-1 border-t border-border p-2">
        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            pathname === '/settings'
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Settings className="size-4 shrink-0" />
          Настройки
        </Link>

        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {theme === 'dark' ? (
            <Sun className="size-4 shrink-0" />
          ) : (
            <Moon className="size-4 shrink-0" />
          )}
          {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        </button>

        {user ? (
          <>
            <button
              onClick={() => navigate('/profile')}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <Avatar className="size-6 shrink-0">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-left text-foreground">
                {user.name || user.email}
              </span>
            </button>

            <button
              onClick={() => logout.mutate()}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            >
              <LogOut className="size-4 shrink-0" />
              Выйти
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <User className="size-4 shrink-0" />
            Войти
          </Link>
        )}
      </div>
    </aside>
  );
}
