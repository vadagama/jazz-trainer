import { Check } from 'lucide-react';
import { cn } from './utils';

export type CheckboxProps = Omit<React.ComponentPropsWithoutRef<'input'>, 'type'>;

/**
 * Кастомный чекбокс: нативный input без системной отрисовки (`appearance-none`)
 * со скруглённой рамкой и галочкой из lucide. Заменяет дефолтный чекбокс ОС.
 */
export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center">
      <input
        type="checkbox"
        className={cn(
          'peer size-4 cursor-pointer appearance-none rounded-[5px] border border-border bg-card transition-colors',
          'hover:border-primary/60',
          'checked:border-primary checked:bg-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <Check
        className="pointer-events-none absolute size-3 stroke-[3] text-primary-foreground opacity-0 peer-checked:opacity-100"
        aria-hidden
      />
    </span>
  );
}
