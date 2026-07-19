import { useMemo, useCallback } from 'react';
import type { Key, UserSettingsDTO } from '@jazz/shared';
import { SCALE_TYPES, SCALE_LABELS, listPatterns } from '@jazz/music-core';
import type { ScaleType, SequenceType, TargetDegree } from '@jazz/music-core';
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
import type {
  SequenceExerciseConfig,
  SequenceDirection,
  ChordSource,
} from '../generators/types.js';
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

export interface StepSequenceConfigProps {
  config: Partial<SequenceExerciseConfig>;
  onChange: (patch: Partial<SequenceExerciseConfig>) => void;
  settings: UserSettingsDTO | undefined;
}

const SEQUENCE_TYPE_OPTIONS: { value: SequenceType; label: string }[] = [
  { value: '1235', label: '1-2-3-5 (бибоп)' },
  { value: '1234', label: '1-2-3-4' },
  { value: '1357', label: '1-3-5-7 (арпеджио)' },
  { value: '1531', label: '1-5-3-1 (период)' },
  { value: 'pentatonic', label: 'Пентатоника' },
  { value: '5321', label: '5-3-2-1 (нисх. бибоп)' },
  { value: '8765', label: '8-7-6-5 (нисх. тетрахорд)' },
  { value: '1324', label: '1-3-2-4 (терции)' },
  { value: '1345', label: '1-3-4-5 (skip-step)' },
  { value: '1356', label: '1-3-5-6 (maj6)' },
  { value: '1231', label: '1-2-3-1 (поворот)' },
  { value: '3212', label: '3-2-1-2 (нижн. поворот)' },
  { value: '3579', label: '3-5-7-9 (арпеджио 9)' },
  { value: 'all', label: 'Случайная' },
];

const START_DEGREES: { value: TargetDegree; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
];

const DIRECTIONS: { value: SequenceDirection; label: string }[] = [
  { value: 'up', label: '↑ Вверх' },
  { value: 'down', label: '↓ Вниз' },
  { value: 'both', label: '↕ Вверх-вниз' },
];

export function StepSequenceConfig({ config, onChange, settings }: StepSequenceConfigProps) {
  const patterns = useMemo(() => listPatterns().filter((p) => p.id !== 'random-diatonic'), []);

  const sequenceType = config.sequenceType ?? '1235';
  const startDegrees = config.startDegrees ?? [1, 2, 3, 4, 5];
  const scaleType = config.scaleType ?? 'major';
  const direction = config.direction ?? 'up';

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

  const toggleDegree = useCallback(
    (degree: TargetDegree) => {
      const next = startDegrees.includes(degree)
        ? startDegrees.filter((d) => d !== degree)
        : [...startDegrees, degree].sort((a, b) => a - b);
      onChange({ startDegrees: next as TargetDegree[] });
    },
    [startDegrees, onChange],
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
      {/* Sequence type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Тип секвенции</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={sequenceType}
            onValueChange={(v) => onChange({ sequenceType: v as SequenceType })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEQUENCE_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Start degrees */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Стартовые ступени</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {START_DEGREES.map((opt) => {
              const active = startDegrees.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleDegree(opt.value)}
                  className={cn(
                    'min-w-[2.5rem] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Ступени, с которых стартует паттерн. Секвенция поднимается/опускается по ладу, повторяя
            форму паттерна от каждой выбранной ступени.
          </p>
        </CardContent>
      </Card>

      {/* Scale type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Лад для секвенций</CardTitle>
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

      {/* Direction */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Направление</CardTitle>
        </CardHeader>
        <CardContent>
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

        {sourceType === 'unified' && (
          <p className="text-xs text-muted-foreground">
            Отдельная отработка на тоническом аккорде каждой выбранной тональности.
          </p>
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
            textareaId="sequence-dsl-input"
          />
        )}
      </SourceCard>

      <BarsPerUnitCard
        label="Тактов на секвенцию"
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
        inputId="sequence-reps-input"
      />
    </div>
  );
}

export default StepSequenceConfig;
