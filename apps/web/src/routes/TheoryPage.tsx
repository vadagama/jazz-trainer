import { Link } from 'react-router-dom';
import { BookOpen, Music4 } from 'lucide-react';
import { contributions } from '@/shell/bootstrap';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  music: Music4,
  'book-open': BookOpen,
  disc: Music4,
  radio: Music4,
};

function resolveIcon(iconName?: string) {
  if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName]!;
  return BookOpen;
}

export default function TheoryPage() {
  const theoryItems = contributions.navItems.filter((item) => item.section === 'learn');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Теория</h1>
        <p className="mt-1 text-sm text-muted-foreground">Разделы теории джазовой гармонии</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {theoryItems.map((item) => {
          const Icon = resolveIcon(item.icon);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-start gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{item.label}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
