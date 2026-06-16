import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Settings, User, Sun, Moon } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth, useLogout } from '@/queries/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const location = useLocation();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <header className="flex h-24 shrink-0 items-center justify-between border-b border-border bg-card px-5">
      {/* Logo + name */}
      <Link
        to="/"
        className="flex items-center gap-3 text-foreground hover:opacity-80 transition-opacity"
      >
        <Logo className="size-8 shrink-0 text-primary" />
        <span className="text-2xl font-semibold tracking-tight">Jazz Trainer</span>
      </Link>

      {/* Right: nav + theme toggle + profile */}
      <div className="flex items-center gap-1">
        <nav className="flex items-center gap-1 mr-2">
          {[
            { to: '/', label: 'Каталог', auth: false },
            { to: '/practice-cards', label: 'Упражнения', auth: false },
            { to: '/my', label: 'Мои сетки', auth: true },
          ]
            .filter(({ auth }) => !auth || !!user)
            .map(({ to, label }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
        </nav>
        <button
          onClick={toggle}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Сменить тему"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Меню профиля"
              >
                <Avatar className="size-6">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-medium leading-none">
                  {user.name || user.email}
                </p>
                {user.name && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 size-4" />
                Профиль
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 size-4" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout.mutate()}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 size-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            to="/login"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Войти"
          >
            <User className="size-4" />
          </Link>
        )}
      </div>
    </header>
  );
}
