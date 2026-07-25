/**
 * Индикатор статуса сохранения конструктора.
 *
 * Три состояния:
 * - "Опубликовано" (green) — последние изменения записаны в код (publishedSnapshot актуален).
 * - "Несохранённые изменения" (amber, пульсирует) — есть правки сверх последней публикации.
 * - "Черновик" (gray) — autosave в localStorage активен, но публикаций ещё не было.
 */
import { Check, CircleDot, Loader2 } from 'lucide-react';
import { cn } from '@jazz/ui';

interface SaveIndicatorProps {
  isDirty: boolean;
  hasPublished: boolean;
  saving: boolean;
  lastPublishedAt: number | null;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function SaveIndicator({ isDirty, hasPublished, saving, lastPublishedAt }: SaveIndicatorProps) {
  if (saving) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Сохранение…
      </span>
    );
  }

  if (isDirty) {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <CircleDot className="h-3 w-3 animate-pulse" />
        {hasPublished ? 'Несохранённые изменения' : 'Черновик (не опубликован)'}
      </span>
    );
  }

  return (
    <span
      className={cn('flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400')}
      title={lastPublishedAt ? `Опубликовано в ${formatTime(lastPublishedAt)}` : undefined}
    >
      <Check className="h-3 w-3" />
      {lastPublishedAt ? `Опубликовано ${formatTime(lastPublishedAt)}` : 'Опубликовано'}
    </span>
  );
}
