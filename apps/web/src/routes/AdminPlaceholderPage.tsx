import { useLocation } from 'react-router-dom';

const LABELS: Record<string, string> = {
  '/admin/catalog': 'Каталог',
  '/admin/exercises': 'Упражнения',
  '/admin/theory': 'Теория',
  '/admin/analytics': 'Аналитика',
  '/admin/constructor/piano': 'Конструктор — Piano',
  '/admin/constructor/percussion': 'Конструктор — Percussion',
};

export default function AdminPlaceholderPage() {
  const { pathname } = useLocation();
  const label = LABELS[pathname] ?? pathname;

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">🚧</div>
      <h1 className="text-xl font-semibold mb-2">{label}</h1>
      <p className="text-sm text-muted-foreground">Раздел в разработке</p>
    </div>
  );
}
