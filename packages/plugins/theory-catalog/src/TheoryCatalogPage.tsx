import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDebounce } from '@jazz/ui';
import {
  Search, Clock, Heart, Music4, Waves, Guitar, Drum, Triangle, Piano,
  Mic, Disc3, ListMusic, ArrowRightLeft, Workflow, Sparkles, Shuffle,
  Route, Compass, Gauge,
} from 'lucide-react';
import {
  Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Badge, Card, CardContent, CardFooter, Button,
} from '@jazz/ui';

// ── Static data ────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<number, string> = {
  1: 'Начинающий', 2: 'Средний', 3: 'Продвинутый', 4: 'Эксперт', 5: 'Мастер',
};

const LEVEL_WORDS = new Set(['начинающий', 'средний', 'продвинутый']);

interface Lecture {
  id: string;
  title: string;
  topic: string;
  level: number;
  duration: number;
  tags: string[];
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  publishedAt: number;
}

const LECTURES: Lecture[] = [
  { id: 'theory.chord-tones', title: 'Аккордовые звуки', topic: 'chord-tones', level: 1, duration: 15, tags: ['начинающий', 'гармония', 'импровизация'], route: '/theory/chord-tones', icon: Music4, gradient: 'from-sky-100 via-blue-50 to-indigo-100 dark:from-sky-950 dark:via-blue-900/50 dark:to-indigo-950', publishedAt: 1711929600000 },
  { id: 'theory.rhythm', title: 'Ритм в джазе', topic: 'rhythm', level: 1, duration: 15, tags: ['начинающий', 'ритм'], route: '/theory/rhythm', icon: Drum, gradient: 'from-rose-100 via-pink-50 to-fuchsia-100 dark:from-rose-950 dark:via-pink-900/50 dark:to-fuchsia-950', publishedAt: 1712016000000 },
  { id: 'theory.ii-v-i', title: 'ii–V–I прогрессия', topic: 'ii-v-i', level: 2, duration: 20, tags: ['гармония', 'каденция', 'импровизация'], route: '/theory/ii-v-i', icon: ArrowRightLeft, gradient: 'from-emerald-100 via-green-50 to-teal-100 dark:from-emerald-950 dark:via-green-900/50 dark:to-teal-950', publishedAt: 1712102400000 },
  { id: 'theory.approach-notes', title: 'Подходные ноты', topic: 'approach-notes', level: 2, duration: 20, tags: ['средний', 'импровизация'], route: '/theory/approach-notes', icon: Gauge, gradient: 'from-violet-100 via-purple-50 to-fuchsia-100 dark:from-violet-950 dark:via-purple-900/50 dark:to-fuchsia-950', publishedAt: 1712188800000 },
  { id: 'theory.arpeggios', title: 'Арпеджио', topic: 'arpeggios', level: 2, duration: 20, tags: ['средний', 'техника'], route: '/theory/arpeggios', icon: Waves, gradient: 'from-cyan-100 via-teal-50 to-emerald-100 dark:from-cyan-950 dark:via-teal-900/50 dark:to-emerald-950', publishedAt: 1712275200000 },
  { id: 'theory.blues', title: 'Блюз', topic: 'blues', level: 2, duration: 20, tags: ['средний', 'блюз', 'форма'], route: '/theory/blues', icon: Disc3, gradient: 'from-blue-100 via-indigo-50 to-violet-100 dark:from-blue-950 dark:via-indigo-900/50 dark:to-violet-950', publishedAt: 1712361600000 },
  { id: 'theory.groove', title: 'Грув', topic: 'groove', level: 2, duration: 20, tags: ['средний', 'ритм', 'ансамбль'], route: '/theory/groove', icon: Mic, gradient: 'from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-950 dark:via-amber-900/50 dark:to-yellow-950', publishedAt: 1712448000000 },
  { id: 'theory.secondary-dominants', title: 'Побочные доминанты', topic: 'secondary-dominants', level: 2, duration: 20, tags: ['средний', 'гармония', 'доминанты'], route: '/theory/secondary-dominants', icon: Shuffle, gradient: 'from-red-100 via-rose-50 to-pink-100 dark:from-red-950 dark:via-rose-900/50 dark:to-pink-950', publishedAt: 1712534400000 },
  { id: 'theory.modal-interchange', title: 'Ладовый обмен', topic: 'modal-interchange', level: 2, duration: 20, tags: ['средний', 'гармония', 'лады'], route: '/theory/modal-interchange', icon: Compass, gradient: 'from-lime-100 via-green-50 to-emerald-100 dark:from-lime-950 dark:via-green-900/50 dark:to-emerald-950', publishedAt: 1712620800000 },
  { id: 'theory.scales-jazz', title: 'Джазовые гаммы', topic: 'scales-jazz', level: 3, duration: 20, tags: ['гаммы', 'импровизация', 'продвинутый'], route: '/theory/scales-jazz', icon: Piano, gradient: 'from-amber-100 via-yellow-50 to-orange-100 dark:from-amber-950 dark:via-yellow-900/50 dark:to-orange-950', publishedAt: 1712707200000 },
  { id: 'theory.voicings', title: 'Аккордовые голосоведения', topic: 'voicings', level: 3, duration: 15, tags: ['голосоведение', 'аккорды', 'продвинутый'], route: '/theory/voicings', icon: ListMusic, gradient: 'from-purple-100 via-violet-50 to-indigo-100 dark:from-purple-950 dark:via-violet-900/50 dark:to-indigo-950', publishedAt: 1712793600000 },
  { id: 'theory.voice-leading', title: 'Голосоведение в ii–V–I', topic: 'voice-leading', level: 3, duration: 20, tags: ['голосоведение', 'гармония', 'продвинутый'], route: '/theory/voice-leading', icon: Workflow, gradient: 'from-teal-100 via-cyan-50 to-sky-100 dark:from-teal-950 dark:via-cyan-900/50 dark:to-sky-950', publishedAt: 1712880000000 },
  { id: 'theory.turnarounds', title: 'Обороты', topic: 'turnarounds', level: 3, duration: 20, tags: ['гармония', 'форма', 'импровизация'], route: '/theory/turnarounds', icon: Route, gradient: 'from-stone-100 via-neutral-50 to-zinc-100 dark:from-stone-950 dark:via-neutral-900/50 dark:to-zinc-950', publishedAt: 1712966400000 },
  { id: 'theory.tritone-sub', title: 'Тритоновая замена', topic: 'tritone-sub', level: 4, duration: 20, tags: ['гармония', 'продвинутый', 'substitution'], route: '/theory/tritone-sub', icon: Triangle, gradient: 'from-fuchsia-100 via-pink-50 to-rose-100 dark:from-fuchsia-950 dark:via-pink-900/50 dark:to-rose-950', publishedAt: 1713052800000 },
  { id: 'theory.diminished-harmony', title: 'Уменьшённая гармония', topic: 'diminished-harmony', level: 4, duration: 20, tags: ['продвинутый', 'гармония', 'diminished'], route: '/theory/diminished-harmony', icon: Sparkles, gradient: 'from-slate-100 via-gray-50 to-stone-100 dark:from-slate-950 dark:via-gray-900/50 dark:to-stone-950', publishedAt: 1713139200000 },
  { id: 'theory.blues-advanced', title: 'Продвинутый блюз', topic: 'blues-advanced', level: 4, duration: 20, tags: ['продвинутый', 'блюз', 'гармония'], route: '/theory/blues-advanced', icon: Disc3, gradient: 'from-indigo-100 via-blue-50 to-sky-100 dark:from-indigo-950 dark:via-blue-900/50 dark:to-sky-950', publishedAt: 1713225600000 },
  { id: 'theory.rhythm-changes', title: 'Rhythm Changes', topic: 'rhythm-changes', level: 4, duration: 20, tags: ['продвинутый', 'гармония', 'rhythm-changes'], route: '/theory/rhythm-changes', icon: Shuffle, gradient: 'from-rose-100 via-red-50 to-orange-100 dark:from-rose-950 dark:via-red-900/50 dark:to-orange-950', publishedAt: 1713312000000 },
  { id: 'theory.coltrane-changes', title: 'Coltrane Changes', topic: 'coltrane-changes', level: 5, duration: 20, tags: ['продвинутый', 'гармония', 'coltrane'], route: '/theory/coltrane-changes', icon: Guitar, gradient: 'from-yellow-100 via-amber-50 to-orange-100 dark:from-yellow-950 dark:via-amber-900/50 dark:to-orange-950', publishedAt: 1713398400000 },
];

// ── localStorage ───────────────────────────────────────────────────────────

function loadLikes(): { counts: Record<string, number>; liked: Set<string> } {
  try {
    return {
      counts: JSON.parse(localStorage.getItem('lt-likes') ?? '{}'),
      liked: new Set(JSON.parse(localStorage.getItem('lt-liked') ?? '[]')),
    };
  } catch { return { counts: {}, liked: new Set() }; }
}

function saveLikes(counts: Record<string, number>, liked: Set<string>) {
  localStorage.setItem('lt-likes', JSON.stringify(counts));
  localStorage.setItem('lt-liked', JSON.stringify([...liked]));
}

function getStatus(lectureId: string): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  const s = localStorage.getItem(`lt-progress:${lectureId}`);
  if (s === 'completed') return { label: 'Пройдено', variant: 'default' };
  if (s === 'in-progress') return { label: 'В процессе', variant: 'secondary' };
  return { label: 'Не начато', variant: 'outline' };
}

// ── Page ───────────────────────────────────────────────────────────────────

type SortKey = 'order' | 'published' | 'likes' | 'duration' | 'level';

export function TheoryCatalogPage() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('order');
  const debouncedQuery = useDebounce(query, 300);

  const [{ counts, liked }, setLikes] = useState(loadLikes);

  const toggleLike = useCallback((id: string) => {
    setLikes((prev) => {
      const nc = { ...prev.counts };
      const nl = new Set(prev.liked);
      if (nl.has(id)) { nc[id] = Math.max(0, (nc[id] ?? 0) - 1); nl.delete(id); }
      else { nc[id] = (nc[id] ?? 0) + 1; nl.add(id); }
      saveLikes(nc, nl);
      return { counts: nc, liked: nl };
    });
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedQuery) return LECTURES;
    const lo = debouncedQuery.toLowerCase();
    return LECTURES.filter((l) =>
      l.title.toLowerCase().includes(lo) ||
      l.tags.some((t) => t.toLowerCase().includes(lo)) ||
      l.topic.toLowerCase().includes(lo),
    );
  }, [debouncedQuery]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    switch (sort) {
      case 'level':   items.sort((a, b) => a.level - b.level); break;
      case 'duration': items.sort((a, b) => a.duration - b.duration); break;
      case 'likes':   items.sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0)); break;
      case 'published': items.sort((a, b) => b.publishedAt - a.publishedAt); break;
      // 'order' – keep original array order
    }
    return items;
  }, [filtered, sort, counts]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Теория</h1>
          <p className="mt-1 text-sm text-muted-foreground">Лекции по джазовой гармонии, ритму и импровизации</p>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? 'лекция' : sorted.length < 5 ? 'лекции' : 'лекций'}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск по названию или теме..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="order">По порядку</SelectItem>
            <SelectItem value="level">По уровню</SelectItem>
            <SelectItem value="published">По дате</SelectItem>
            <SelectItem value="likes">По рейтингу</SelectItem>
            <SelectItem value="duration">По длительности</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {debouncedQuery ? `Ничего не найдено по запросу «${debouncedQuery}»` : 'Лекций пока нет'}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((l) => {
            const status = getStatus(l.id);
            const levelLabel = LEVEL_LABELS[l.level] ?? '';
            const likeCount = counts[l.id] ?? 0;
            const likedByMe = liked.has(l.id);
            const Icon = l.icon;
            const displayTags = l.tags.filter((t) => !LEVEL_WORDS.has(t)).slice(0, 3);
            return (
              <Card key={l.id} className="group flex flex-col transition-colors hover:border-primary/40">
                <div className={`relative aspect-video w-full overflow-hidden rounded-t-lg bg-gradient-to-br ${l.gradient}`}>
                  <div className="flex h-full w-full items-center justify-center">
                    <Icon className="size-14 text-black/20 dark:text-white/15" />
                  </div>
                  <div className="absolute left-2 top-2 flex gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">{levelLabel}</Badge>
                    <Badge variant="outline" className="text-[10px]"><Clock className="mr-0.5 inline size-2.5" />{l.duration} мин</Badge>
                  </div>
                </div>
                <CardContent className="flex-1 p-4">
                  <Link to={l.route} className="font-semibold leading-snug transition-colors hover:text-primary">{l.title}</Link>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {displayTags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t border-border px-4 py-3">
                  <Button variant="ghost" size="sm" className={`gap-1.5 ${likedByMe ? 'hover:bg-red-50 dark:hover:bg-red-950/30' : ''}`} onClick={() => toggleLike(l.id)} aria-label={likedByMe ? 'Убрать лайк' : 'Поставить лайк'}>
                    <Heart className={`size-4 ${likedByMe ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                    <span className={`text-sm ${likedByMe ? 'text-red-500' : ''}`}>{likeCount}</span>
                  </Button>
                  <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TheoryCatalogPage;
