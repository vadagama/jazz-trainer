import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STYLES, KEYS, TIME_SIGNATURES, CATALOG_DIFFICULTIES, CATALOG_TAGS } from '@jazz/shared';
import type { CatalogDifficulty, CatalogTagCategory } from '@jazz/shared';
import { Button, Input, Label, Textarea } from '@jazz/ui';
import { usePublishCatalogEntry } from './queries/useCatalogAdmin';

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

export function CatalogPublishPage() {
  const navigate = useNavigate();
  const publish = usePublishCatalogEntry();

  const [form, setForm] = useState({
    name: '',
    author: '',
    description: '',
    difficulty: 'intermediate' as CatalogDifficulty,
    recommendedStyle: 'swing' as (typeof STYLES)[number],
    recommendedTempo: 120,
    timeSignature: '4/4',
    key: 'C',
    dsl: '',
    tags: [] as string[],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleTag = (t: string) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t],
    }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // parse DSL → content
    const content = parseDslToContent(form.dsl);
    if (!content) {
      alert('Введите DSL-формат, например: Dm7 | G7 | Cmaj7 |');
      return;
    }

    const result = await publish.mutateAsync({
      name: form.name,
      author: form.author,
      description: form.description || undefined,
      difficulty: form.difficulty,
      tags: form.tags,
      recommendedStyle: form.recommendedStyle,
      recommendedTempo: form.recommendedTempo,
      timeSignature: form.timeSignature as (typeof TIME_SIGNATURES)[number],
      key: form.key as (typeof KEYS)[number],
      content,
    });

    navigate(`/play/${result.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Опубликовать композицию</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Заполните метаданные и гармоническое содержание. Композиция сразу появится в каталоге.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Название *</Label>
          <Input
            id="name"
            placeholder="Autumn Leaves"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="author">Композитор *</Label>
          <Input
            id="author"
            placeholder="Joseph Kosma"
            value={form.author}
            onChange={(e) => set('author', e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            placeholder="Краткое описание (до 500 символов)..."
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="difficulty">Уровень *</Label>
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
            <Label htmlFor="style">Стиль *</Label>
            <select
              id="style"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              value={form.recommendedStyle}
              onChange={(e) => set('recommendedStyle', e.target.value as (typeof STYLES)[number])}
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {STYLE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="tempo">BPM *</Label>
            <Input
              id="tempo"
              type="number"
              min={20}
              max={400}
              value={form.recommendedTempo}
              onChange={(e) => set('recommendedTempo', Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="key">Тональность *</Label>
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
            <Label htmlFor="ts">Размер *</Label>
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
        </div>

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

        <div className="space-y-1">
          <Label htmlFor="dsl">Гармония (DSL) *</Label>
          <Textarea
            id="dsl"
            placeholder={'Dm7 | G7 | Cmaj7 | A7 |\nDm7 | G7 | Em7b5 A7 | Dm7 |'}
            value={form.dsl}
            onChange={(e) => set('dsl', e.target.value)}
            rows={5}
            className="font-mono text-sm"
            required
          />
          <p className="text-xs text-muted-foreground">
            Каждый такт отделён «|», аккорды внутри такта — пробелом.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/catalog')}>
            Отмена
          </Button>
          <Button type="submit" disabled={publish.isPending}>
            {publish.isPending ? 'Публикация...' : 'Опубликовать'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Minimal DSL → CompositionContent converter (one chord per bar). */
function parseDslToContent(dsl: string) {
  const cleaned = dsl.trim();
  if (!cleaned) return null;
  // split by bar delimiter, filter empties
  const tokens = cleaned.split('|').map((s) => s.trim()).filter(Boolean);
  if (!tokens.length) return null;
  const bars = tokens.map((barStr, i) => {
    const symbols = barStr.split(/\s+/).filter(Boolean);
    return {
      id: `b${i + 1}`,
      chords: symbols.map((s, j) => ({ id: `b${i + 1}c${j + 1}`, symbol: s })),
    };
  });
  return { version: 1 as const, bars };
}

export default CatalogPublishPage;
