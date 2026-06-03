import { cn } from '@/lib/utils';
import type { GridContent } from '@jazz/shared';

interface HarmonyGridProps {
  content: GridContent;
  selectedBarId: string | null;
  onSelectBar: (barId: string) => void;
}

export function HarmonyGrid({ content, selectedBarId, onSelectBar }: HarmonyGridProps) {
  const { bars } = content;

  if (bars.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Нет тактов — добавьте такт или импортируйте DSL
      </div>
    );
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
      data-testid="harmony-grid"
    >
      {bars.map((bar, index) => {
        const isSelected = bar.id === selectedBarId;
        const chordCount = bar.chords.length;

        return (
          <div
            key={bar.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectBar(bar.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectBar(bar.id)}
            data-testid={`bar-cell-${bar.id}`}
            aria-label={`Такт ${index + 1}${isSelected ? ', выбран' : ''}`}
            aria-pressed={isSelected}
            className={cn(
              'group relative min-h-[100px] cursor-pointer rounded-lg border bg-card p-4 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'hover:border-primary/50 hover:shadow-sm',
              isSelected
                ? 'border-primary shadow-sm ring-1 ring-primary/30'
                : 'border-border',
            )}
          >
            {/* Bar number */}
            <span className="absolute left-2.5 top-2 select-none font-mono text-[10px] text-muted-foreground">
              {index + 1}
            </span>

            {/* Chords */}
            <div
              className={cn(
                'mt-3 flex min-h-[52px] items-center gap-1.5',
                chordCount === 1 ? 'justify-center' : 'justify-around',
              )}
            >
              {bar.chords.length === 0 ? (
                <span className="text-sm text-muted-foreground/30">—</span>
              ) : (
                bar.chords.map((slot, i) => (
                  <div key={i} className="text-center">
                    <span
                      className={cn(
                        'block font-bold leading-none tracking-tight text-foreground',
                        chordCount === 1 ? 'text-3xl' : chordCount === 2 ? 'text-2xl' : 'text-xl',
                      )}
                    >
                      {slot.symbol}
                    </span>
                    {slot.beats != null && (
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        ×{slot.beats}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
