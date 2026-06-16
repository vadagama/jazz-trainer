import { Music } from 'lucide-react';
import type { Style } from '@jazz/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

const STYLE_LABELS: Record<Style, string> = {
  swing: 'Swing',
  bossa: 'Bossa Nova',
  funk: 'Funk',
  latin: 'Latin',
  ballad: 'Ballad',
} as const;

interface StyleSelectorProps {
  value: Style;
  onChange: (style: Style) => void;
}

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Style)}>
      <SelectTrigger
        className="h-5 min-w-[96px] justify-center border-none bg-transparent p-0 text-xs font-semibold text-foreground shadow-none focus:ring-0 [&>svg]:hidden"
        aria-label="Стиль"
      >
        <div className="flex items-center gap-1">
          <Music className="size-3 text-muted-foreground" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STYLE_LABELS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
