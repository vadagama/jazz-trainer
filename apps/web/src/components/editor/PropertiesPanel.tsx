import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Bar, HarmonyGridDTO } from '@jazz/shared';

interface PropertiesPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  grid: HarmonyGridDTO | null;
  selectedBar: Bar | null;
  selectedBarIndex: number | null;
}

export function PropertiesPanel({
  isOpen,
  onToggle,
  grid,
  selectedBar,
  selectedBarIndex,
}: PropertiesPanelProps) {
  return (
    <div className="relative flex h-full flex-shrink-0">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        title={isOpen ? 'Скрыть панель' : 'Показать панель'}
        className={cn(
          'absolute -left-3 top-6 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-card shadow-sm',
          'text-muted-foreground transition-colors hover:text-foreground',
        )}
      >
        <ChevronRight
          className={cn('size-3.5 transition-transform', isOpen ? 'rotate-0' : 'rotate-180')}
        />
      </button>

      {/* Panel content */}
      <div
        className={cn(
          'h-full overflow-y-auto border-l border-border bg-card transition-all duration-200',
          isOpen ? 'w-64' : 'w-0 overflow-hidden border-l-0',
        )}
      >
        <div className="p-4">
          {selectedBar && selectedBarIndex !== null ? (
            <>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Такт {selectedBarIndex + 1}
              </h3>
              <div className="space-y-2">
                {selectedBar.chords.map((chord, i) => (
                  <div key={i} className="rounded-md border border-border bg-secondary/40 p-3">
                    <p className="text-lg font-bold">{chord.symbol}</p>
                    {chord.beats && (
                      <p className="text-xs text-muted-foreground">Длительность: {chord.beats}b</p>
                    )}
                  </div>
                ))}
                {selectedBar.chords.length === 0 && (
                  <p className="text-xs text-muted-foreground">Такт пустой</p>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Сетка
              </h3>
              {grid ? (
                <div className="space-y-3">
                  <Row label="Название" value={grid.name} />
                  <Row label="Тональность" value={grid.key} />
                  <Row label="Размер" value={grid.timeSignature} />
                  <Row label="Тактов" value={String(grid.barsCount)} />
                  <Row
                    label="Видимость"
                    value={grid.visibility === 'public' ? 'Публичная' : 'Приватная'}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Выберите такт, чтобы увидеть детали.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
