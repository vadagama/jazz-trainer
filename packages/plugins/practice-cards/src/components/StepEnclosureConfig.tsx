import { useCallback } from 'react';
import type { Key, UserSettingsDTO } from '@jazz/shared';
import { SCALE_TYPES, SCALE_LABELS } from '@jazz/music-core';
import type { ScaleType, EnclosureType, TargetDegree } from '@jazz/music-core';
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
import type { EnclosureExerciseConfig } from '../generators/types.js';
import {
  KeysCard,
  BarsPerUnitCard,
  CountInCard,
  CardModeCard,
  BackingCard,
  MetronomeTempoCard,
  RepetitionsCard,
} from './config/index.js';

export interface StepEnclosureConfigProps {
  config: Partial<EnclosureExerciseConfig>;
  onChange: (patch: Partial<EnclosureExerciseConfig>) => void;
  settings: UserSettingsDTO | undefined;
}

const ENCLOSURE_TYPE_OPTIONS: { value: EnclosureType; label: string }[] = [
  { value: 'diatonic-upper', label: 'Диатоническое сверху' },
  { value: 'diatonic-lower', label: 'Диатоническое снизу' },
  { value: 'chromatic-upper', label: 'Хроматическое сверху' },
  { value: 'chromatic-lower', label: 'Хроматическое снизу' },
  { value: 'full-diatonic', label: 'Полное диатоническое' },
  { value: 'full-chromatic', label: 'Полное хроматическое' },
  { value: 'diatonic-upper-chromatic-lower', label: 'Сверху диатоника, снизу хроматика' },
  { value: 'four-note-top-down', label: '4 звука сверху вниз' },
  { value: 'four-note-bottom-up', label: '4 звука снизу вверх' },
  { value: 'all', label: 'Случайное' },
];

const TARGET_DEGREES: { value: TargetDegree; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
  { value: 8, label: '8' },
  { value: 9, label: '9' },
  { value: 10, label: '10' },
  { value: 11, label: '11' },
];

export function StepEnclosureConfig({ config, onChange, settings }: StepEnclosureConfigProps) {
  const enclosureType = config.enclosureType ?? 'diatonic-upper';
  const targetDegrees = config.targetDegrees ?? [1, 3, 5, 7];
  const scaleType = config.scaleType ?? 'major';

  const toggleKey = useCallback(
    (key: Key) => {
      const keys = config.keys ?? [];
      onChange({ keys: keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key] });
    },
    [config.keys, onChange],
  );

  const toggleDegree = useCallback(
    (degree: TargetDegree) => {
      const degrees = targetDegrees.includes(degree)
        ? targetDegrees.filter((d) => d !== degree)
        : [...targetDegrees, degree].sort((a, b) => a - b);
      onChange({ targetDegrees: degrees as TargetDegree[] });
    },
    [targetDegrees, onChange],
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
      {/* Enclosure type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Тип опевания</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={enclosureType}
            onValueChange={(v) => onChange({ enclosureType: v as EnclosureType })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENCLOSURE_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Target degrees */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Целевые ступени</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TARGET_DEGREES.map((opt) => {
              const active = targetDegrees.includes(opt.value);
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
        </CardContent>
      </Card>

      {/* Scale type for standalone spelling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Лад для опеваний</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={scaleType}
            onValueChange={(v) => onChange({ scaleType: v as ScaleType })}
          >
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

      <BarsPerUnitCard
        label="Тактов на опевание"
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
        inputId="enclosure-reps-input"
      />
    </div>
  );
}

export default StepEnclosureConfig;
