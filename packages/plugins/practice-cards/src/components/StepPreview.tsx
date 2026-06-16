import { useMemo } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from '@jazz/ui';
import type { ExerciseConfig, PracticeBar } from '../generators/types.js';
import { buildFunctionPreview } from './degreeFunctions.js';
import { ChipSequence } from './config/ChipSequence.js';

export interface StepPreviewProps {
  config: ExerciseConfig;
  bars: PracticeBar[];
  onBack: () => void;
  onStart: () => void;
}

function makeRows(bars: PracticeBar[], rowSize: number): PracticeBar[][] {
  const result: PracticeBar[][] = [];
  for (let i = 0; i < bars.length; i += rowSize) {
    result.push(bars.slice(i, i + rowSize));
  }
  return result;
}

function BarChip({ bar }: { bar: PracticeBar }) {
  if (bar.chords.length > 0) {
    return (
      <div className="flex min-w-0 items-center justify-center gap-0.5 truncate rounded bg-primary/10 px-1 py-2.5 text-xs font-semibold text-foreground">
        {bar.chords.length === 1 ? (
          bar.chords[0]
        ) : (
          <span className="truncate">{bar.chords.join('·')}</span>
        )}
        {bar.direction && (
          <span
            title={bar.direction === 'up' ? 'вверх' : 'вниз'}
            className="shrink-0 text-[10px] leading-none text-muted-foreground"
          >
            {bar.direction === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
    );
  }
  if (bar.scaleLabel) {
    return (
      <div
        title={bar.scaleLabel}
        className="flex items-center justify-center gap-0.5 rounded bg-primary/10 px-1.5 py-2 text-center text-xs font-semibold leading-tight text-foreground"
      >
        <span className="min-w-0 break-words hyphens-auto">{bar.scaleLabel}</span>
        {bar.direction && (
          <span
            title={bar.direction === 'up' ? 'вверх' : 'вниз'}
            className="shrink-0 text-[10px] leading-none text-muted-foreground"
          >
            {bar.direction === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
    );
  }
  return null;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  4: 'grid-cols-4',
  8: 'grid-cols-8',
};

function BarGrid({ bars, rowSize }: { bars: PracticeBar[]; rowSize: number }) {
  const rows = useMemo(() => makeRows(bars, rowSize), [bars, rowSize]);
  const gridClass = GRID_COLS[rowSize] ?? 'grid-cols-8';

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground/40">
            {ri + 1}
          </span>
          <div className={cn('grid flex-1 gap-1', gridClass)}>
            {row.map((bar) => (
              <BarChip key={bar.index} bar={bar} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const DIRECTION_LABEL: Record<string, string> = {
  up: '↑ вверх',
  down: '↓ вниз',
  both: '↕ вверх и вниз',
};

/** Пояснение: как именно будет проигрываться выбранный материал. */
function explainPlayback(config: ExerciseConfig): string {
  const random = config.playRandomly;
  const tail = config.infinite ? ', бесконечно по кругу' : '';
  const keyPhrase = random ? 'в произвольной тональности' : 'в каждой выбранной тональности';

  if (config.type === 'scales' && config.source.type === 'unified') {
    const dir = DIRECTION_LABEL[config.direction] ?? config.direction;
    const order = random ? 'в произвольном порядке' : 'по очереди';
    return `Эти гаммы будут проигрываться ${order}, ${keyPhrase}${tail}. Направление: ${dir}.`;
  }

  if (config.type === 'scales') {
    const dir = DIRECTION_LABEL[config.direction] ?? config.direction;
    const order = random ? 'в произвольной тональности' : `последовательно, ${keyPhrase}`;
    return `Гаммы поверх прогрессии будут проигрываться ${order}${tail}. Направление: ${dir}.`;
  }

  const source = config.source;
  if (source?.type === 'unified') {
    const order = random ? 'в произвольном порядке' : 'по очереди, по одному на такт';
    return `Выбранные аккорды будут проигрываться ${order}, ${keyPhrase}${tail}.`;
  }
  if (source?.type === 'random') {
    return `Будут проигрываться произвольные диатонические аккорды${tail}.`;
  }
  const order = random ? 'в произвольной тональности' : `последовательно, ${keyPhrase}`;
  return `Эта последовательность будет проигрываться ${order}${tail}.`;
}

export function StepPreview({ config, bars, onBack, onStart }: StepPreviewProps) {
  const chordSourceLabel: Record<string, string> = {
    pattern: 'паттерн',
    random: 'произвольная',
    dsl: 'DSL',
    unified: 'отдельно',
  };

  const summary = useMemo(() => {
    const tempo = config.tempo ?? 120;
    const keysStr = (config.keys ?? []).join(', ');
    const typeLabel = config.type === 'chords' ? 'аккордов' : 'гамм';
    const sourceLabel = chordSourceLabel[config.source.type] ?? config.source.type;
    const repeatLabel = config.infinite ? '∞ повторов' : `${bars.length} тактов ${typeLabel}`;
    return `${repeatLabel}, ${sourceLabel}, ${keysStr || 'C'}, ${tempo} BPM`;
  }, [config, bars, chordSourceLabel]);

  const compact = config.infinite || config.playRandomly;
  const fnPreview = useMemo(() => buildFunctionPreview(config), [config]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Превью упражнения</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </CardContent>
      </Card>

      {compact ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Что будет играть</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fnPreview.kind === 'chord-set' && <ChipSequence labels={fnPreview.labels} />}
            {fnPreview.kind === 'chord-sequence' && <ChipSequence labels={fnPreview.labels} />}
            {fnPreview.kind === 'scale-standalone' && (
              <ChipSequence labels={fnPreview.scaleLabels} />
            )}
            {fnPreview.kind === 'scale-over-chords' && (
              <div className="space-y-2">
                <ChipSequence labels={fnPreview.chordLabels} />
                <p className="text-sm font-medium text-foreground">{fnPreview.scaleLabel}</p>
              </div>
            )}
            {fnPreview.kind === 'chord-random' && (
              <p className="text-sm font-medium text-foreground">
                Произвольные диатонические аккорды
              </p>
            )}
            {fnPreview.kind === 'empty' && (
              <p className="text-sm text-muted-foreground">Ничего не выбрано.</p>
            )}
            {fnPreview.kind !== 'empty' && (
              <p className="text-xs text-muted-foreground">{explainPlayback(config)}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Такты ({bars.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="sm:hidden">
              <BarGrid bars={bars} rowSize={config.type === 'scales' ? 2 : 4} />
            </div>
            <div className="hidden sm:block">
              <BarGrid bars={bars} rowSize={config.type === 'scales' ? 4 : 8} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Назад
        </Button>
        <Button type="button" variant="default" onClick={onStart}>
          ▶ Старт
        </Button>
      </div>
    </div>
  );
}

export default StepPreview;
