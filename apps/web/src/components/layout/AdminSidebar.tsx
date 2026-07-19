import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Dumbbell,
  Library,
  Wrench,
  Flag,
  BarChart3,
  Drum,
  Music,
  Piano,
  Shield,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminSubItem {
  label: string;
  to: string;
  iconKey: string;
}

interface AdminSection {
  label: string;
  to?: string;
  icon: LucideIcon;
  /** Sub-items for collapsible sections (e.g. Конструктор). */
  children?: AdminSubItem[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  drums: Drum,
  bass: Music,
  piano: Piano,
  percussion: Drum,
};

const CONSTRUCTOR_ITEMS: AdminSubItem[] = [
  { label: 'Drum Kit', to: '/admin/drum-constructor', iconKey: 'drums' },
  { label: 'Piano', to: '/admin/piano-constructor', iconKey: 'piano' },
  { label: 'Bass', to: '/admin/constructor/bass', iconKey: 'bass' },
  { label: 'Rhodes', to: '/admin/constructor/rhodes', iconKey: 'piano' },
  { label: 'Percussion', to: '/admin/constructor/percussion', iconKey: 'percussion' },
];

const SECTIONS: AdminSection[] = [
  { label: 'Пользователи', to: '/admin/users', icon: Users },
  { label: 'Роли', to: '/admin/roles', icon: Shield },
  { label: 'Каталог', to: '/admin/catalog', icon: Library },
  { label: 'Упражнения', to: '/admin/exercises', icon: Dumbbell },
  { label: 'Теория', to: '/admin/theory', icon: BookOpen },
  {
    label: 'Конструктор',
    icon: Wrench,
    children: CONSTRUCTOR_ITEMS,
  },
  { label: 'Фичи', to: '/admin/flags', icon: Flag },
  { label: 'Аналитика', to: '/admin/analytics', icon: BarChart3 },
];

function NavLink({
  to,
  icon: Icon,
  label,
  active,
  indent,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors',
        indent && 'pl-9',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AdminSidebar() {
  const { pathname } = useLocation();
  const [constructorOpen, setConstructorOpen] = useState(true);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Wrench className="size-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold tracking-tight">Администрирование</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {SECTIONS.map((section) => {
          if (section.to) {
            return (
              <NavLink
                key={section.label}
                to={section.to}
                icon={section.icon}
                label={section.label}
                active={pathname === section.to || pathname.startsWith(section.to + '/')}
              />
            );
          }

          // Collapsible section (Конструктор)
          return (
            <div key={section.label}>
              <button
                onClick={() => setConstructorOpen((v) => !v)}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <section.icon className="size-3.5 shrink-0" />
                <span className="flex-1 text-left">{section.label}</span>
                {constructorOpen ? (
                  <ChevronDown className="size-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0" />
                )}
              </button>

              {constructorOpen && section.children && (
                <div className="mt-0.5 space-y-0.5">
                  {section.children.map((child) => {
                    const ChildIcon = ICON_MAP[child.iconKey] ?? Wrench;
                    const isActive = pathname === child.to || pathname.startsWith(child.to + '/');
                    return (
                      <NavLink
                        key={child.label}
                        to={child.to}
                        icon={ChildIcon}
                        label={child.label}
                        active={isActive}
                        indent
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
