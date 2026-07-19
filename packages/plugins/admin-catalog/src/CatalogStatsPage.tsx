import { CheckCircle, XCircle, Star, Library } from 'lucide-react';
import { useAdminStats } from './queries/useCatalogAdmin';

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className={`flex size-10 items-center justify-center rounded-md ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-semibold leading-none">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function DistributionBar({
  label,
  data,
}: {
  label: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));

  if (!entries.length) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">{label}</h3>
      <div className="space-y-2">
        {entries.map(([key, count]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-20 text-xs capitalize text-muted-foreground">{key}</span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary/60 transition-all"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopList({
  title,
  items,
  metric,
}: {
  title: string;
  items: { id: string; name: string; author: string; likeCount?: number; copyCount?: number }[];
  metric: 'likeCount' | 'copyCount';
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="overflow-hidden rounded-lg border border-border">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 text-sm ${
              i > 0 ? 'border-t border-border' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.author}</div>
              </div>
            </div>
            <span className="font-semibold">{item[metric]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CatalogStatsPage() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Статистика каталога</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Метрики публикаций, распределение по стилям и сложности
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Library className="size-5 text-primary" />}
          label="Всего композиций"
          value={stats.total}
          color="bg-primary/10"
        />
        <StatCard
          icon={<CheckCircle className="size-5 text-green-400" />}
          label="Одобрено"
          value={stats.approved}
          color="bg-green-500/10"
        />
        <StatCard
          icon={<XCircle className="size-5 text-red-400" />}
          label="Скрыто"
          value={stats.rejected}
          color="bg-red-500/10"
        />
        <StatCard
          icon={<Star className="size-5 text-amber-400" />}
          label="Избранных"
          value={stats.featured}
          color="bg-amber-500/10"
        />
      </div>

      {/* Distributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DistributionBar label="Распределение по стилям" data={stats.byStyle} />
        <DistributionBar label="Распределение по сложности" data={stats.byDifficulty} />
      </div>

      {/* Top lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopList title="Топ-10 по лайкам" items={stats.topByLikes} metric="likeCount" />
        <TopList title="Топ-10 по копированиям" items={stats.topByCopies} metric="copyCount" />
      </div>
    </div>
  );
}

export default CatalogStatsPage;
