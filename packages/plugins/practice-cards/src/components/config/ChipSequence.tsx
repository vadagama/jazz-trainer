import { cn } from '@jazz/ui';

export interface ChipSequenceProps {
  labels: string[];
  sep?: string;
  variant?: 'degree' | 'chord' | 'key';
  chipClassName?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  degree: 'bg-primary/10 text-primary',
  chord: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  key: 'bg-primary/10 text-primary',
};

/** Цепочка чипов с разделителем. */
export function ChipSequence({
  labels,
  sep = '→',
  variant = 'degree',
  chipClassName,
}: ChipSequenceProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
      {labels.map((label, i) => (
        <span key={`${label}-${i}`} className="inline-flex items-center gap-0.5">
          {i > 0 && (
            <span className="mx-0.5 select-none text-[10px] text-muted-foreground/50">{sep}</span>
          )}
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-xs font-medium',
              VARIANT_CLASSES[variant],
              chipClassName,
            )}
          >
            {label}
          </span>
        </span>
      ))}
    </div>
  );
}
