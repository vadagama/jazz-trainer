import { cn } from '@/lib/utils';
import type { GridContent } from '@jazz/shared';
import { ChordChip } from './ChordChip';

interface HarmonyGridProps {
  content: GridContent;
  selectedBarId: string | null;
  onSelectBar: (barId: string) => void;
}

export function HarmonyGrid({ content, selectedBarId, onSelectBar }: HarmonyGridProps) {
  const { bars } = content;

  if (bars.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
        Нет тактов — добавьте такт или импортируйте DSL
      </div>
    );
  }

  return (
    <div
      className="grid gap-px bg-border rounded-lg overflow-hidden"
      style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
      data-testid="harmony-grid"
    >
      {bars.map((bar, index) => {
        const isSelected = bar.id === selectedBarId;

        return (
          <button
            key={bar.id}
            type="button"
            onClick={() => onSelectBar(bar.id)}
            data-testid={`bar-cell-${bar.id}`}
            aria-label={`Такт ${index + 1}${isSelected ? ', выбран' : ''}`}
            aria-pressed={isSelected}
            className={cn(
              'relative min-h-[72px] p-2 text-left transition-colors',
              'bg-card hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              isSelected && 'bg-accent ring-2 ring-ring ring-inset',
            )}
          >
            <span className="absolute top-1 left-2 text-[10px] text-muted-foreground font-mono select-none">
              {index + 1}
            </span>
            <div className="mt-4 flex flex-wrap gap-1">
              {bar.chords.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">пусто</span>
              ) : (
                bar.chords.map((slot, i) => <ChordChip key={i} slot={slot} />)
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
