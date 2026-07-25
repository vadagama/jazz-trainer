import { Badge, cn } from '@jazz/ui';
import type { FeatureState } from '@jazz/plugin-sdk';
import { Clock } from 'lucide-react';

export type ExerciseTileType = 'chords' | 'scales' | 'sequences' | 'embellishments';

export interface StepTypeSelectProps {
  /** Feature state per tile type. Missing entries fall back to `hidden`. */
  states?: Partial<Record<ExerciseTileType, FeatureState>>;
  onSelect: (type: 'chords' | 'scales' | 'enclosures' | 'sequences') => void;
}

interface TileDef {
  type: ExerciseTileType;
  icon: string;
  label: string;
  description: string;
}

const TILES: TileDef[] = [
  {
    type: 'chords',
    icon: '🎸',
    label: 'Аккорды',
    description: 'Тренировка джазовых прогрессий: II-V-I, блюз, ритм-чейнджеры и другие',
  },
  {
    type: 'scales',
    icon: '🎹',
    label: 'Гаммы',
    description: 'Лады и гаммы по карточкам: отдельно или поверх аккордовой прогрессии',
  },
  {
    type: 'sequences',
    icon: '🎯',
    label: 'Секвенции',
    description: 'Мелодические паттерны, повторяемые с разных ступеней лада',
  },
  {
    type: 'embellishments',
    icon: '〰️',
    label: 'Опевания',
    description: 'Хроматические и диатонические опевания аккордовых тонов',
  },
];

export function StepTypeSelect({ states, onSelect }: StepTypeSelectProps) {
  const visible = TILES.filter((t) => (states?.[t.type] ?? 'active') !== 'hidden');
  visible.sort((a, b) => {
    const sa = (states?.[a.type] ?? 'active') === 'active' ? 0 : 1;
    const sb = (states?.[b.type] ?? 'active') === 'active' ? 0 : 1;
    return sa - sb;
  });
  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Нет доступных упражнений для вашей роли
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-center text-lg font-semibold text-foreground">Выберите тип упражнения</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((tile) => {
          const state = states?.[tile.type] ?? 'active';
          const isInactive = state === 'inactive';
          return (
            <button
              key={tile.type}
              type="button"
              disabled={isInactive}
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
                'relative flex flex-col items-center gap-2 rounded-xl border-2 p-6 text-left transition-all',
                isInactive
                  ? 'cursor-not-allowed border-border/50 bg-card/40 opacity-60'
                  : 'border-border bg-card hover:border-primary/50 hover:shadow-md active:scale-[0.98]',
              )}
            >
              {isInactive && (
                <Badge
                  variant="outline"
                  className="absolute right-2 top-2 gap-1 border-amber-400/50 bg-amber-50/80 text-[10px] text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                >
                  <Clock className="size-2.5" />
                  Скоро
                </Badge>
              )}
              <span className="text-3xl" aria-hidden="true">
                {tile.icon}
              </span>
              <span
                className={cn(
                  'text-base font-semibold',
                  isInactive ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {tile.label}
              </span>
              <span className="text-center text-xs leading-relaxed text-muted-foreground">
                {tile.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StepTypeSelect;
