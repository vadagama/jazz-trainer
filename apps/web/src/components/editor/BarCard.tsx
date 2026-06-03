import { cn } from '@/lib/utils';
import type { Bar } from '@jazz/shared';

interface BarCardProps {
  bar: Bar;
  barIndex: number;
  isSelected: boolean;
  isPlaying?: boolean;
  onClick: () => void;
}

export function BarCard({ bar, barIndex, isSelected, isPlaying, onClick }: BarCardProps) {
  const chords = bar.chords;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={cn(
        'group relative cursor-pointer rounded-lg border bg-card p-4 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'hover:border-primary/60 hover:shadow-md',
        isPlaying
          ? 'border-green-500 shadow-md ring-1 ring-green-500/40 animate-pulse'
          : isSelected
            ? 'border-primary shadow-md ring-1 ring-primary/40'
            : 'border-border',
      )}
    >
      {/* Bar number badge */}
      <span className="absolute left-3 top-2.5 text-[10px] font-medium text-muted-foreground">
        {barIndex + 1}
      </span>

      {/* Chords display */}
      <div
        className={cn(
          'mt-3 flex items-center gap-1',
          chords.length === 1 ? 'justify-center' : 'justify-around',
        )}
      >
        {chords.map((slot, i) => (
          <div key={i} className="text-center">
            <span className="block text-2xl font-bold leading-tight tracking-tight text-foreground">
              {slot.symbol}
            </span>
            {slot.beats && (
              <span className="text-[10px] text-muted-foreground">{slot.beats}b</span>
            )}
          </div>
        ))}
      </div>

      {/* Empty bar placeholder */}
      {chords.length === 0 && (
        <div className="mt-3 flex h-8 items-center justify-center">
          <span className="text-sm text-muted-foreground/40">—</span>
        </div>
      )}
    </div>
  );
}
