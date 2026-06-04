import { Link, useNavigate } from 'react-router-dom';
import { Music4, LogOut, Settings, User } from 'lucide-react';
import { useAuth, useLogout } from '@/queries/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  editorMode?: boolean;
  onOpenDsl?: () => void;
  onOpenGenerator?: () => void;
}

export function Header({ editorMode, onOpenDsl, onOpenGenerator }: HeaderProps) {
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Music4 className="size-5 text-primary" />
          Jazz Trainer
        </Link>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              Каталог
            </Link>
            {user && (
              <Link to="/my" className="text-sm text-muted-foreground hover:text-foreground">
                Мои сетки
              </Link>
            )}
            {editorMode && (
              <>
                <button
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={onOpenDsl}
                >
                  DSL
                </button>
                <button
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={onOpenGenerator}
                >
                  Генератор
                </button>
              </>
            )}
          </nav>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar>
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="size-4" /> Профиль
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="size-4" /> Настройки
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout.mutate()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" /> Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">Войти</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
