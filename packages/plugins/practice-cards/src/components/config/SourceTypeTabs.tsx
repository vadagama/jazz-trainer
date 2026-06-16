import type { ChordSource } from '../../generators/types.js';
import { cn } from '@jazz/ui';
import { SOURCE_TYPES, sourceToLabel } from './configConstants.js';

export interface SourceTypeTabsProps {
  value: ChordSource['type'];
  types?: ChordSource['type'][];
  onChange: (type: ChordSource['type']) => void;
}

export function SourceTypeTabs({
  value,
  types = SOURCE_TYPES,
  onChange,
}: SourceTypeTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((st) => (
        <button
          key={st}
          type="button"
          onClick={() => onChange(st)}
          className={cn(
            'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
            value === st
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
          )}
        >
          {sourceToLabel(st)}
        </button>
      ))}
    </div>
  );
}
