import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="shrink-0">
      <nav
        aria-label="breadcrumb"
        className="mx-auto flex h-9 max-w-6xl items-center gap-1.5 px-4 text-sm"
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <span className="text-muted-foreground/50">/</span>}
              {isLast ? (
                <span className="truncate font-medium text-foreground" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href ?? '/'}
                  className="truncate text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
