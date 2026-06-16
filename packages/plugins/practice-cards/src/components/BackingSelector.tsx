import { Guitar, Drum, Piano, AudioLines, type LucideIcon } from 'lucide-react';
import { cn } from '@jazz/ui';

export type BackingKey = 'backingBass' | 'backingDrums' | 'backingPiano' | 'backingRhodes';

interface BackingTile {
  key: BackingKey;
  label: string;
  Icon: LucideIcon;
}

const BACKING_TILES: BackingTile[] = [
  { key: 'backingBass', label: 'Бас', Icon: Guitar },
  { key: 'backingDrums', label: 'Барабаны', Icon: Drum },
  { key: 'backingPiano', label: 'Ф-но', Icon: Piano },
  { key: 'backingRhodes', label: 'Rhodes', Icon: AudioLines },
];

export interface BackingSelectorProps {
  /** Текущие значения слоёв аккомпанемента (по умолчанию включены). */
  values: Partial<Record<BackingKey, boolean>>;
  onChange: (patch: Partial<Record<BackingKey, boolean>>) => void;
}

/** Выбор слоёв аккомпанемента в виде иконок-плиток (тоггл вкл/выкл). */
export function BackingSelector({ values, onChange }: BackingSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {BACKING_TILES.map(({ key, label, Icon }) => {
        const active = values[key] ?? true;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange({ [key]: !active })}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all active:scale-[0.98]',
              active
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BackingSelector;
