import type { ReactNode } from 'react';

export interface Step2ShellProps {
  canPreview: boolean;
  onBack: () => void;
  onPreview: () => void;
  onQuickStart: () => void;
  playRandomlyToggle: ReactNode;
  children: ReactNode;
}

/**
 * Обёртка для второго шага мастера: рандомизация + кнопки навигации «Назад / Превью / Быстрый старт».
 * Используется и для аккордов, и для гамм — различается только внутренний конфигуратор.
 */
export function Step2Shell({
  canPreview,
  onBack,
  onPreview,
  onQuickStart,
  playRandomlyToggle,
  children,
}: Step2ShellProps) {
  return (
    <>
      {children}
      {playRandomlyToggle}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          onClick={onBack}
        >
          ← Назад
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-opacity hover:bg-muted disabled:opacity-40"
            disabled={!canPreview}
            onClick={onPreview}
          >
            Показать превью →
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            disabled={!canPreview}
            onClick={onQuickStart}
          >
            ▶ Быстрый старт
          </button>
        </div>
      </div>
    </>
  );
}
