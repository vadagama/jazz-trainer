import { Repeat } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

const REPEAT_COUNTS = [2, 3, 4, 8] as const;

export interface RepeatSelectorProps {
  value: number | null | undefined;
  onChange: (value: number | null | undefined) => void;
}

export function RepeatSelector({ value, onChange }: RepeatSelectorProps) {
  return (
    <Select
      value={value === undefined ? '__off__' : value === null ? '__inf__' : String(value)}
      onValueChange={(v) => {
        if (v === '__off__') onChange(undefined);
        else if (v === '__inf__') onChange(null);
        else onChange(Number(v));
      }}
    >
      <SelectTrigger
        className="h-5 min-w-[56px] justify-center border-none bg-transparent p-0 text-xs font-semibold text-foreground shadow-none focus:ring-0 [&>svg]:hidden"
        aria-label="Повтор"
      >
        <div className="flex items-center gap-1">
          <Repeat className="size-3 text-muted-foreground" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__off__">—</SelectItem>
        {REPEAT_COUNTS.map((n) => (
          <SelectItem key={n} value={String(n)}>
            ×{n}
          </SelectItem>
        ))}
        <SelectItem value="__inf__">∞</SelectItem>
      </SelectContent>
    </Select>
  );
}
