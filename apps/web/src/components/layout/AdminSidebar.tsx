import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users, BookOpen, Dumbbell, Library, Wrench, Flag,
  Drum, Music, Piano, Shield, Sliders, CreditCard,
  Image, Activity, FileText,
  ChevronDown, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@jazz/plugin-sdk';
import { contributions } from '@/shell/bootstrap';
import type { NavItemContribution } from '@jazz/plugin-sdk';

const ICON_MAP: Record<string, LucideIcon> = {
  users: Users, shield: Shield, library: Library, dumbbell: Dumbbell,
  'book-open': BookOpen, flag: Flag, sliders: Sliders, 'credit-card': CreditCard,
  drum: Drum, bass: Music, piano: Piano, image: Image,
  activity: Activity, 'file-text': FileText, wrench: Wrench,
};

function constructorShortLabel(item: NavItemContribution): string {
  const name = item.label.replace(/^Конструктор\s*/i, '').trim();
  if (name) return name;
  const seg = item.to.split('/').pop() ?? item.to;
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
}

function NavLink({ to, icon, label, indent }: { to: string; icon?: string; label: string; indent?: boolean }) {
  const { pathname } = useLocation();
  const Icon = icon ? ICON_MAP[icon] ?? Wrench : Wrench;
  const active = pathname === to || pathname.startsWith(to + '/');
  return (
    <Link to={to} className={cn(
      'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors',
      indent && 'pl-9',
      active ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    )}>
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AdminSidebar() {
  const { permissions } = useAuth();
  const [constructorOpen, setConstructorOpen] = useState(true);
  const { regularItems, constructorItems } = useMemo(() => {
    const all = (contributions.navItems ?? [])
      .filter((item) => item.section === 'admin')
      .filter((item) => !item.requires || permissions.includes(item.requires));
    return {
      regularItems: all.filter((item) => !item.label.toLowerCase().includes('конструктор')),
      constructorItems: all.filter((item) => item.label.toLowerCase().includes('конструктор')),
    };
  }, [permissions]);
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Wrench className="size-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold tracking-tight">Администрирование</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {regularItems.map((item) => (
          <NavLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
        ))}
        {constructorItems.length > 0 && (
          <div>
            <button onClick={() => setConstructorOpen((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <Wrench className="size-3.5 shrink-0" />
              <span className="flex-1 text-left">Конструктор</span>
              {constructorOpen ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
            </button>
            {constructorOpen && (
              <div className="mt-0.5 space-y-0.5">
                {constructorItems.map((item) => (
                  <NavLink key={item.to} to={item.to} icon={item.icon} label={constructorShortLabel(item)} indent />
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}
