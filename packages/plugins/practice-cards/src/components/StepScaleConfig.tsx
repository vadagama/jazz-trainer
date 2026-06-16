import { useMemo, useCallback } from 'react';
import type { Key, UserSettingsDTO } from '@jazz/shared';
import { SCALE_TYPES, SCALE_LABELS, listPatterns } from '@jazz/music-core';
import type { ScaleType } from '@jazz/music-core';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@jazz/ui';
import type { ScaleExerciseConfig, ScaleDirection, ChordSource } from '../generators/types.js';
import { useSourceConfig, buildSourcePayload } from './config/useSourceConfig.js';
import {
  SourceCard,
  KeysCard,
  BarsPerUnitCard,
  CountInCard,
  CardModeCard,
  BackingCard,
  MetronomeTempoCard,
  RepetitionsCard,
  DslSourceEditor,
} from './config/index.js';

export interface StepScaleConfigProps {
  config: Partial<ScaleExerciseConfig>;
  onChange: (patch: Partial<ScaleExerciseConfig>) => void;
  settings: UserSettingsDTO | undefined;
}

const DIRECTIONS: { value: ScaleDirection; label: string }[] = [
  { value: 'up', label: '↑ Вверх' },
  { value: 'down', label: '↓ Вниз' },
  { value: 'both', label: '↕ Вверх-вниз' },
];

const OCTAVES = [1, 2] as const;

export function StepScaleConfig({ config, onChange, settings }: StepScaleConfigProps) {
  const patterns = useMemo(() => listPatterns().filter((p) => p.id !== 'random-diatonic'), []);

  const scaleType = config.scaleType ?? 'major';
  const direction = config.direction ?? 'both';
  const octaves = config.octaves ?? 1;

  const { sourceType, setSourceType, dslText, dslError, parsedPreview, handleDslChange } =
    useSourceConfig(config.source);

  const handleSourceTypeChange = useCallback(
    (type: ChordSource['type']) => {
      setSourceType(type);
      const payload = buildSourcePayload(type, {
        currentSource: config.source,
        dslText,
        defaultPatternId: patterns[0]?.id ?? 'ii-V-I',
        defaultKey: config.keys?.[0] ?? 'C',
      });
      onChange(payload);
    },
    [onChange, patterns, config.keys, config.source, dslText, setSourceType],
  );

  const handleDslChangeAndNotify = useCallback(
    (text: string) => {
      handleDslChange(text);
      onChange({ source: { type: 'dsl', dsl: text } });
    },
    [handleDslChange, onChange],
  );

  const handlePatternChange = useCallback(
    (patternId: string) => onChange({ source: { type: 'pattern', patternId } }),
    [onChange],
  );

  const toggleKey = useCallback(
    (key: Key) => {
      const keys = config.keys ?? [];
      onChange({ keys: keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key] });
    },
    [config.keys, onChange],
  );

  const tempo = config.tempo ?? settings?.bpm ?? 120;
  const repetitions = config.repetitions ?? 1;
  const infinite = config.infinite ?? false;
  const countInBars = config.countInBars ?? settings?.countIn ?? 1;
  const cardMode = config.cardMode ?? 'current';
  const metronomeEnabled = config.metronomeEnabled ?? settings?.metronomeEnabled ?? true;
  const metronomeVolume = config.metronomeVolume ?? settings?.metronomeVolume ?? 0.5;
  const keys = config.keys ?? [];

  return (
    <div className="space-y-5">
      {/* Scale type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Тип гаммы</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={scaleType} onValueChange={(v) => onChange({ scaleType: v as ScaleType })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCALE_TYPES.map((st) => (
                <SelectItem key={st} value={st}>
                  {SCALE_LABELS[st]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Source */}
      <SourceCard
        title="Источник"
        sourceType={sourceType}
        onSourceTypeChange={handleSourceTypeChange}
      >
        {sourceType === 'pattern' && (
          <Select
            value={config.source?.type === 'pattern' ? config.source.patternId : undefined}
            onValueChange={handlePatternChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите паттерн" />
            </SelectTrigger>
            <SelectContent>
              {patterns.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {sourceType === 'random' && (
          <p className="text-xs text-muted-foreground">
            Произвольная диатоническая прогрессия в выбранных тональностях.
          </p>
        )}

        {sourceType === 'dsl' && (
          <DslSourceEditor
            dslText={dslText}
            dslError={dslError}
            parsedPreview={parsedPreview}
            keys={keys}
            onChange={handleDslChangeAndNotify}
            textareaId="scale-dsl-input"
          />
        )}
      </SourceCard>

      {/* Direction + Octaves */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Направление и октавы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {DIRECTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => onChange({ direction: d.value })}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                  direction === d.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {OCTAVES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onChange({ octaves: o as 1 | 2 })}
                className={cn(
                  'min-w-[2.5rem] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                  octaves === o
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <BarsPerUnitCard
        label="Тактов на гамму"
        value={config.barsPerChord ?? 1}
        onChange={(v) => onChange({ barsPerChord: v })}
      />

      <KeysCard keys={keys} onToggle={toggleKey} />

      <CountInCard value={countInBars} onChange={(v) => onChange({ countInBars: v })} />

      <CardModeCard value={cardMode} onChange={(v) => onChange({ cardMode: v })} />

      <BackingCard values={config} onChange={onChange} />

      <MetronomeTempoCard
        metronomeEnabled={metronomeEnabled}
        metronomeVolume={metronomeVolume}
        tempo={tempo}
        onMetronomeEnabledChange={(v) => onChange({ metronomeEnabled: v })}
        onMetronomeVolumeChange={(v) => onChange({ metronomeVolume: v })}
        onTempoChange={(v) => onChange({ tempo: v })}
      />

      <RepetitionsCard
        repetitions={repetitions}
        infinite={infinite}
        onRepetitionsChange={(v) => onChange({ repetitions: v })}
        onInfiniteChange={(v) => onChange({ infinite: v })}
        inputId="scale-reps-input"
      />
    </div>
  );
}

export default StepScaleConfig;
