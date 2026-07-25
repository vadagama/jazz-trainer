import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Play, Star, Check, X } from 'lucide-react';
import {
  STYLES,
  KEYS,
  TIME_SIGNATURES,
  CATALOG_DIFFICULTIES,
  CATALOG_TAGS,
} from '@jazz/shared';
import type { CatalogDifficulty, CatalogTagCategory } from '@jazz/shared';
import { Button, Input, Label, Textarea ,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@jazz/ui';
import { ApiError } from '@jazz/plugin-sdk';
import {
  useAdminCatalog,
  useAdminUpdateEntry,
  useDeleteEntry,
  useRejectEntry,
  useApproveEntry,
  useToggleFeatured,
} from './queries/useCatalogAdmin';

const DIFFICULTY_LABEL: Record<CatalogDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const STYLE_LABEL: Record<string, string> = {
  swing: 'Swing',
  bossa: 'Bossa',
  funk: 'Funk',
  latin: 'Latin',
  ballad: 'Ballad',
};

const TAGS_BY_CATEGORY = CATALOG_TAGS.reduce(
  (acc, t) => {
    (acc[t.category] ??= []).push(t.value);
    return acc;
  },
  {} as Record<CatalogTagCategory, string[]>,
);

const CATEGORY_LABEL: Record<CatalogTagCategory, string> = {
  genre: 'Жанр / Форма',
  harmony: 'Гармония',
  ensemble: 'Ансамбль',
  method: 'Методика',
};

interface EditForm {
  name: string;
  author: string;
  description: string;
  difficulty: CatalogDifficulty;
  recommendedStyle: (typeof STYLES)[number];
  recommendedTempo: number;
  timeSignature: string;
  key: string;
  tags: string[];
}

export function CatalogEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entries } = useAdminCatalog();
  const updateEntry = useAdminUpdateEntry();
  const deleteEntry = useDeleteEntry();
  const reject = useRejectEntry();
  const approve = useApproveEntry();
  const toggleFeatured = useToggleFeatured();

  const entry = entries?.find((e) => e.id === id);

  const [form, setForm] = useState<EditForm | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (entry && !form) {
      const validStyle = STYLES.includes(entry.recommendedStyle as (typeof STYLES)[number])
        ? (entry.recommendedStyle as (typeof STYLES)[number])
        : 'swing';
      const validKey = KEYS.includes(entry.key as (typeof KEYS)[number])
        ? (entry.key as (typeof KEYS)[number])
        : 'C';
      const validTs = TIME_SIGNATURES.includes(
        entry.timeSignature as (typeof TIME_SIGNATURES)[number],
      )
        ? (entry.timeSignature as (typeof TIME_SIGNATURES)[number])
        : '4/4';
      const validDifficulty = CATALOG_DIFFICULTIES.includes(
        entry.difficulty as CatalogDifficulty,
      )
        ? entry.difficulty
        : 'intermediate';
      setForm({
        name: entry.name,
        author: entry.author,
        description: entry.description ?? '',
        difficulty: validDifficulty,
        recommendedStyle: validStyle,
        recommendedTempo: entry.recommendedTempo ?? 120,
        timeSignature: validTs,
        key: validKey,
        tags: entry.tags,
      });
    }
  }, [entry, form]);

  if (!entries) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-muted-foreground">Композиция не найдена</p>
        <Link to="/admin/catalog" className="text-sm text-primary hover:underline">
          ← К списку
        </Link>
      </div>
    );
  }

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const toggleTag = (t: string) =>
    setForm((f) =>
      f
        ? {
            ...f,
            tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t],
          }
        : f,
    );

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form) return false;
    if (!form.name.trim()) next.name = 'Название обязательно';
    if (!form.author.trim()) next.author = 'Композитор обязателен';
    if (
      !Number.isFinite(form.recommendedTempo) ||
      form.recommendedTempo < 20 ||
      form.recommendedTempo > 400
    ) {
      next.recommendedTempo = 'BPM должен быть от 20 до 400';
    }
    if (form.description.length > 500) next.description = 'Не более 500 символов';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!form) return;
    if (!validate()) return;
    try {
      await updateEntry.mutateAsync({
        id: entry.id,
        name: form.name,
        author: form.author,
        description: form.description || null,
        difficulty: CATALOG_DIFFICULTIES.includes(form.difficulty as CatalogDifficulty)
          ? form.difficulty
          : 'intermediate',
        recommendedStyle: STYLES.includes(form.recommendedStyle as (typeof STYLES)[number])
          ? form.recommendedStyle
          : 'swing',
        recommendedTempo: Math.min(400, Math.max(20, Math.round(form.recommendedTempo) || 120)),
        timeSignature: TIME_SIGNATURES.includes(
          form.timeSignature as (typeof TIME_SIGNATURES)[number],
        )
          ? (form.timeSignature as (typeof TIME_SIGNATURES)[number])
          : '4/4',
        key: KEYS.includes(form.key as (typeof KEYS)[number])
          ? (form.key as (typeof KEYS)[number])
          : 'C',
        tags: form.tags,
      });
      navigate('/admin/catalog');
    } catch (err) {
      let msg = 'Не удалось сохранить композицию';
      if (err instanceof ApiError && err.issues?.length) {
        const fields = (err.issues as Array<{ path?: (string | number)[]; message: string }>)
          .map((i) => `${i.path?.join('.') ?? '—'}: ${i.message}`)
          .join('\n');
        msg += ':\n' + fields;
      } else if (err instanceof Error) {
        msg += ': ' + err.message;
      }
      alert(msg);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEntry.mutateAsync(entry.id);
      navigate('/admin/catalog');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Не удалось удалить композицию';
      alert(msg);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        onClick={() => navigate('/admin/catalog')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Назад к списку
      </button>

      {/* Header with status + actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            {entry.featured && (
              <Star className="size-4 fill-amber-400 text-amber-400" />
            )}
            <h1 className="text-2xl font-semibold tracking-tight">Редактирование</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Опубликовал: {entry.publisherName} ·{' '}
            {new Date(entry.catalogPublishedAt).toLocaleString('ru-RU')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link to={`/play/${entry.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Play className="size-3.5" /> Плеер
            </Button>
          </Link>
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <span className="text-sm text-muted-foreground">Статус:</span>
        {entry.moderationStatus === 'approved' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-400">
            <Check className="size-3" /> Опубликовано
          </span>
        ) : entry.moderationStatus === 'modified' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-400">
            Изменено
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
            <X className="size-3" /> Скрыто
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={reject.isPending || entry.moderationStatus === 'rejected'}
            onClick={() => reject.mutate(entry.id)}
          >
            <X className="size-3.5" /> Скрыть
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={approve.isPending || entry.moderationStatus === 'approved'}
            onClick={() => approve.mutate(entry.id)}
          >
            <Check className="size-3.5" /> Одобрить
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 ${entry.featured ? 'border-amber-500/40 text-amber-400' : ''}`}
            disabled={toggleFeatured.isPending}
            onClick={() => toggleFeatured.mutate(entry.id)}
          >
            <Star className={`size-3.5 ${entry.featured ? 'fill-amber-400' : ''}`} />
            {entry.featured ? 'В избранном' : 'В избранное'}
          </Button>
        </div>
      </div>

      {/* Edit form */}
      {form && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="author">Композитор *</Label>
            <Input
              id="author"
              value={form.author}
              onChange={(e) => set('author', e.target.value)}
              className={errors.author ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.author && (
              <p className="text-xs text-red-500">{errors.author}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={500}
              rows={3}
              className={errors.description ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="difficulty">Уровень</Label>
              <select
                id="difficulty"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={form.difficulty}
                onChange={(e) => set('difficulty', e.target.value as CatalogDifficulty)}
              >
                {CATALOG_DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="style">Стиль</Label>
              <select
                id="style"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={form.recommendedStyle}
                onChange={(e) =>
                  set('recommendedStyle', e.target.value as (typeof STYLES)[number])
                }
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {STYLE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tempo">BPM</Label>
              <Input
                id="tempo"
                type="number"
                min={20}
                max={400}
                value={form.recommendedTempo}
                onChange={(e) => set('recommendedTempo', Number(e.target.value))}
                className={errors.recommendedTempo ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.recommendedTempo && (
                <p className="text-xs text-red-500">{errors.recommendedTempo}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="key">Тональность</Label>
              <select
                id="key"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={form.key}
                onChange={(e) => set('key', e.target.value)}
              >
                {KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ts">Размер</Label>
              <select
                id="ts"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={form.timeSignature}
                onChange={(e) => set('timeSignature', e.target.value)}
              >
                {TIME_SIGNATURES.map((ts) => (
                  <option key={ts} value={ts}>
                    {ts}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Метрики</Label>
              <div className="flex h-[38px] items-center gap-3 text-xs text-muted-foreground">
                <span>{entry.barsCount} тактов</span>
                <span>·</span>
                <span>❤ {entry.likeCount}</span>
                <span>·</span>
                <span>⧉ {entry.copyCount}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Теги</Label>
            <div className="space-y-2">
              {(Object.keys(TAGS_BY_CATEGORY) as CatalogTagCategory[]).map((cat) => (
                <div key={cat}>
                  <p className="mb-1 text-xs text-muted-foreground">{CATEGORY_LABEL[cat]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TAGS_BY_CATEGORY[cat].map((tag) => {
                      const active = form.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive">
              <Trash2 className="size-3.5" /> Удалить
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить композицию?</AlertDialogTitle>
              <AlertDialogDescription>
                «{entry.name}» будет удалена без возможности восстановления.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/catalog')}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={updateEntry.isPending} className="gap-1.5">
            <Save className="size-4" />
            {updateEntry.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CatalogEditPage;
