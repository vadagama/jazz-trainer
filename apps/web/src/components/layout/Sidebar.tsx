import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Music4,
  Settings,
  LogOut,
  Sun,
  Moon,
  User,
  BookOpen,
  Dumbbell,
  Shield,
  LayoutGrid,
  Pencil,
  Home,
  type LucideIcon,
} from 'lucide-react';
import { useAuth, useLogout } from '@/queries/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { contributions } from '@/shell/bootstrap';
import type { NavItemContribution } from '@jazz/plugin-sdk';

// ── Icon mapping ────────────────────────────────────────────────────────
const SECTION_ICONS: Record<string, LucideIcon> = {
  main: Home,
  create: Pencil,
  learn: BookOpen,
  practice: Dumbbell,
  play: Music4,
  admin: Shield,
};

const SECTION_LABELS: Record<string, string> = {
  main: 'Главное',
  create: 'Создать',
  learn: 'Теория',
  practice: 'Практика',
  play: 'Инструменты',
  admin: 'Админка',
};

const ICON_NAME_MAP: Record<string, LucideIcon> = {
  music: Music4,
  'book-open': BookOpen,
  dumbbell: Dumbbell,
  shield: Shield,
  disc: Music4,
  home: Home,
  edit: Pencil,
  grid: LayoutGrid,
  'help-circle': Music4,
  'list-music': Music4,
  drum: Music4,
  piano: Music4,
  image: Music4,
  'file-text': Music4,
  activity: Music4,
  flag: Music4,
  users: Music4,
  radio: Music4,
};

function resolveIcon(iconName?: string): LucideIcon {
  if (iconName && ICON_NAME_MAP[iconName]) return ICON_NAME_MAP[iconName]!;
  return BookOpen;
}

// ── NavLink ─────────────────────────────────────────────────────────────

function NavLink({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────────────

export function Sidebar() {
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();

  // Group plugin-contributed nav items by section
  const navBySection = new Map<string, NavItemContribution[]>();
  for (const item of contributions.navItems) {
    const list = navBySection.get(item.section);
    if (list) {
      list.push(item);
    } else {
      navBySection.set(item.section, [item]);
    }
  }

  // Section order
  const sectionOrder = ['main', 'create', 'learn', 'practice', 'play', 'admin'];

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

      {/* Plugin-contributed navigation by section */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {sectionOrder.map((section) => {
          const items = navBySection.get(section);
          if (!items || items.length === 0) return null;

          const SectionIcon = SECTION_ICONS[section] ?? BookOpen;
          const sectionLabel = SECTION_LABELS[section] ?? section;

          return (
            <div key={section} className="mb-3">
              {/* Section header */}
              <div className="flex items-center gap-2 px-3 py-1.5">
                <SectionIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {sectionLabel}
                </span>
              </div>

              {/* Section items */}
              {items.map((item) => {
                const Icon = resolveIcon(item.icon);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    icon={Icon}
                    label={item.label}
                    active={pathname === item.to}
                  />
                );
              })}
            </div>
          );
        })}
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
