import { cn } from '@/lib/utils';
import type { ChordSlot } from '@jazz/shared';

interface ChordChipProps {
  slot: ChordSlot;
  className?: string;
}

export function ChordChip({ slot, className }: ChordChipProps) {
  const isInvalid = slot.parsed === null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-medium',
        isInvalid
          ? 'bg-destructive/20 text-destructive border border-destructive/40'
          : 'bg-primary/10 text-primary border border-primary/20',
        className,
      )}
      title={isInvalid ? `Неизвестный аккорд: ${slot.symbol}` : undefined}
    >
      {slot.symbol}
      {slot.beats != null && (
        <span className="ml-1 text-[10px] opacity-60">×{slot.beats}</span>
      )}
    </span>
  );
}
