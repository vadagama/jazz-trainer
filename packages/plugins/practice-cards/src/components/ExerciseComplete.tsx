import type { ExerciseConfig } from '../generators/types.js';

const TYPE_LABEL: Record<string, string> = {
  chords: 'Аккорды',
  scales: 'Гаммы',
  enclosures: 'Опевания',
  sequences: 'Секвенции',
};

export interface ExerciseCompleteProps {
  config: ExerciseConfig;
  barsCount: number;
  tempo: number;
  onRepeat: () => void;
  onReconfigure: () => void;
  onFinish: () => void;
}

export function ExerciseComplete({
  config,
  barsCount,
  tempo,
  onRepeat,
  onReconfigure,
  onFinish,
}: ExerciseCompleteProps) {
  const typeLabel = TYPE_LABEL[config.type] ?? config.type;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-xl font-semibold">Упражнение завершено!</h2>

      <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
        <span>
          {barsCount} {plural(barsCount, 'такт', 'такта', 'тактов')} в темпе {tempo} BPM
        </span>
        <span>
          Тональность: {config.keys.join(', ')} &middot; {typeLabel}
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          onClick={onRepeat}
        >
          Повторить
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          onClick={onReconfigure}
        >
          Настроить заново
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
          onClick={onFinish}
        >
          Закончить
        </button>
      </div>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
