import { cn } from '@jazz/ui';

export interface StepTypeSelectProps {
  onSelect: (type: 'chords' | 'scales' | 'enclosures' | 'sequences') => void;
}

interface TileDef {
  type: 'chords' | 'scales' | 'sequences' | 'embellishments';
  icon: string;
  label: string;
  description: string;
  disabled: boolean;
}

const TILES: TileDef[] = [
  {
    type: 'chords',
    icon: '🎸',
    label: 'Аккорды',
    description: 'Тренировка джазовых прогрессий: II-V-I, блюз, ритм-чейнджеры и другие',
    disabled: false,
  },
  {
    type: 'scales',
    icon: '🎹',
    label: 'Гаммы',
    description: 'Лады и гаммы по карточкам: отдельно или поверх аккордовой прогрессии',
    disabled: false,
  },
  {
    type: 'sequences',
    icon: '🎯',
    label: 'Секвенции',
    description: 'Мелодические паттерны, повторяемые с разных ступеней лада',
    disabled: false,
  },
  {
    type: 'embellishments',
    icon: '〰️',
    label: 'Опевания',
    description: 'Хроматические и диатонические опевания аккордовых тонов',
    disabled: false,
  },
];

export function StepTypeSelect({ onSelect }: StepTypeSelectProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-center text-lg font-semibold text-foreground">Выберите тип упражнения</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {TILES.map((tile) => (
          <button
            key={tile.type}
            type="button"
            disabled={tile.disabled}
            onClick={() => {
              if (tile.type === 'chords' || tile.type === 'scales') {
                onSelect(tile.type);
              }
              if (tile.type === 'embellishments') {
                onSelect('enclosures');
              }
              if (tile.type === 'sequences') {
                onSelect('sequences');
              }
            }}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-6 text-left transition-all',
              tile.disabled
                ? 'cursor-not-allowed border-border/50 bg-card/40 opacity-50'
                : 'border-border bg-card hover:border-primary/50 hover:shadow-md active:scale-[0.98]',
            )}
          >
            <span className="text-3xl" aria-hidden="true">
              {tile.icon}
            </span>
            <span
              className={cn(
                'text-base font-semibold',
                tile.disabled ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {tile.label}
            </span>
            <span className="text-center text-xs leading-relaxed text-muted-foreground">
              {tile.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default StepTypeSelect;
