import { useState, useCallback, useMemo } from 'react';
import { useSettings, useUpdateSettings } from '@jazz/plugin-sdk';

import { cn, Checkbox, Card, CardContent, CardHeader, CardTitle } from '@jazz/ui';
import { generateChordExercise } from '../generators/chordExercise.js';
import { generateScaleExercise } from '../generators/scaleExercise.js';
import type {
  ExerciseConfig,
  ChordExerciseConfig,
  ScaleExerciseConfig,
  PracticeBar,
  CardMode,
  ChordSource,
} from '../generators/types.js';
import {
  DEF_TEMPO,
  DEF_COUNT_IN,
  DEF_METRONOME_ENABLED,
  DEF_METRONOME_VOLUME,
  DEF_REPETITIONS,
  DEF_BARS_PER_CHORD,
  DEF_TIME_SIGNATURE,
  DEF_CARD_MODE,
  DEF_INFINITE,
  DEF_PLAY_RANDOMLY,
} from '../defaults.js';
import { StepTypeSelect } from './StepTypeSelect.js';
import { StepChordConfig } from './StepChordConfig.js';
import { StepScaleConfig } from './StepScaleConfig.js';
import { StepPreview } from './StepPreview.js';
import { Step2Shell } from './Step2Shell.js';

export interface ExerciseWizardProps {
  onStart: (config: ExerciseConfig, bars: PracticeBar[]) => void;
  initialConfig?: ExerciseConfig | null;
}

type WizardStep = 1 | 2 | 3;
type ExerciseKind = 'chords' | 'scales';

function buildDefaults(settings: ReturnType<typeof useSettings>['data']) {
  const pc = settings?.practiceCards;
  return {
    tempo: pc?.lastTempo ?? settings?.bpm ?? DEF_TEMPO,
    countInBars: pc?.countInBars ?? settings?.countIn ?? DEF_COUNT_IN,
    metronomeEnabled: pc?.metronomeEnabled ?? settings?.metronomeEnabled ?? DEF_METRONOME_ENABLED,
    metronomeVolume: settings?.metronomeVolume ?? DEF_METRONOME_VOLUME,
    backingBass: pc?.backingBass ?? settings?.bassEnabled ?? true,
    backingDrums: pc?.backingDrums ?? settings?.drumsEnabled ?? true,
    backingPiano: pc?.backingPiano ?? settings?.pianoEnabled ?? true,
    backingRhodes: pc?.backingRhodes ?? settings?.rhodesEnabled ?? false,
    cardMode: (pc?.cardMode as CardMode | undefined) ?? DEF_CARD_MODE,
    repetitions: pc?.lastRepetitions ?? DEF_REPETITIONS,
    infinite: pc?.lastInfinite ?? DEF_INFINITE,
    barsPerChord: pc?.barsPerChord ?? DEF_BARS_PER_CHORD,
    timeSignature: pc?.timeSignature ?? DEF_TIME_SIGNATURE,
    playRandomly: pc?.playRandomly ?? DEF_PLAY_RANDOMLY,
    // Read back write-only fields: source, keys, pattern
    lastSource: pc?.lastSource,
    lastPatternId: pc?.lastPatternId,
    lastKeys: pc?.lastKeys,
    lastExerciseType: pc?.lastExerciseType,
  };
}

function buildInitialConfig(
  settings: ReturnType<typeof useSettings>['data'],
  initialConfig?: ExerciseConfig | null,
): Partial<ExerciseConfig> {
  if (initialConfig) return initialConfig;

  const defs = buildDefaults(settings);
  const pc = settings?.practiceCards;

  // Restore from persisted settings if available
  if (pc?.lastExerciseType && pc.lastKeys?.length) {
    const kind = pc.lastExerciseType;
    const source: ChordSource =
      pc.lastSource === 'pattern' && pc.lastPatternId
        ? { type: 'pattern', patternId: pc.lastPatternId }
        : pc.lastSource === 'dsl'
          ? { type: 'dsl', dsl: '' }
          : { type: 'unified', symbols: [] };

    return {
      ...defs,
      type: kind,
      keys: pc.lastKeys,
      source,
      ...(kind === 'scales'
        ? { scaleType: 'major' as const, direction: 'both' as const, octaves: 1 as const }
        : {}),
    };
  }

  return defs;
}

function buildPracticeCardsSettings(
  config: ExerciseConfig,
  kind: ExerciseKind,
): NonNullable<ReturnType<typeof useSettings>['data']>['practiceCards'] {
  return {
    lastExerciseType: kind,
    lastSource: (config as ChordExerciseConfig).source?.type,
    lastPatternId:
      'source' in config && config.source.type === 'pattern' ? config.source.patternId : undefined,
    lastKeys: config.keys,
    lastTempo: config.tempo,
    lastRepetitions: config.repetitions,
    lastInfinite: config.infinite,
    cardMode: config.cardMode,
    countInBars: config.countInBars,
    backingBass: config.backingBass,
    backingDrums: config.backingDrums,
    backingPiano: config.backingPiano,
    backingRhodes: config.backingRhodes,
    metronomeEnabled: config.metronomeEnabled,
    metronomeVolume: config.metronomeVolume,
    barsPerChord: config.barsPerChord,
    timeSignature: config.timeSignature,
    playRandomly: config.playRandomly,
  };
}

function isValidSource(src: ChordSource | undefined, kind?: ExerciseKind): boolean {
  if (!src) return false;
  switch (src.type) {
    case 'unified':
      return kind === 'scales' ? true : (src.symbols?.length ?? 0) > 0;
    case 'pattern':
      return typeof src.patternId === 'string' && src.patternId.length > 0;
    case 'dsl':
      return typeof src.dsl === 'string' && src.dsl.trim().length > 0;
    default:
      return false;
  }
}

/** Build a valid ExerciseConfig from a partial, applying defaults. */
function buildConfig(
  partial: Partial<ExerciseConfig>,
  kind: ExerciseKind | null,
  defaults: ReturnType<typeof buildDefaults>,
): ExerciseConfig {
  if (!kind) {
    throw new Error('Тип упражнения не выбран');
  }

  const base = {
    type: kind,
    keys: partial.keys ?? [],
    repetitions: partial.repetitions ?? defaults.repetitions,
    infinite: partial.infinite ?? defaults.infinite,
    countInBars: partial.countInBars ?? defaults.countInBars,
    cardMode: partial.cardMode ?? defaults.cardMode,
    backingBass: partial.backingBass ?? defaults.backingBass,
    backingDrums: partial.backingDrums ?? defaults.backingDrums,
    backingPiano: partial.backingPiano ?? defaults.backingPiano,
    backingRhodes: partial.backingRhodes ?? defaults.backingRhodes,
    metronomeEnabled: partial.metronomeEnabled ?? defaults.metronomeEnabled,
    metronomeVolume: partial.metronomeVolume ?? defaults.metronomeVolume,
    tempo: partial.tempo ?? defaults.tempo,
    timeSignature: partial.timeSignature ?? defaults.timeSignature,
    playRandomly: partial.playRandomly ?? defaults.playRandomly,
    barsPerChord: partial.barsPerChord ?? defaults.barsPerChord,
  };

  if (kind === 'chords') {
    const source = (partial as Partial<ChordExerciseConfig>).source ?? {
      type: 'unified' as const,
      symbols: [],
    };
    return { ...base, type: 'chords' as const, source } as ChordExerciseConfig;
  }

  return {
    ...base,
    type: 'scales' as const,
    source: (partial as Partial<ScaleExerciseConfig>).source ?? {
      type: 'unified' as const,
      symbols: [],
    },
    scaleType: (partial as Partial<ScaleExerciseConfig>).scaleType ?? 'major',
    direction: (partial as Partial<ScaleExerciseConfig>).direction ?? 'both',
    octaves: (partial as Partial<ScaleExerciseConfig>).octaves ?? 1,
  } as ScaleExerciseConfig;
}

const STEPS = [
  { num: 1 as const, label: 'Тип' },
  { num: 2 as const, label: 'Параметры' },
  { num: 3 as const, label: 'Превью' },
];

export function ExerciseWizard({ onStart, initialConfig }: ExerciseWizardProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [step, setStep] = useState<WizardStep>(initialConfig ? 2 : 1);
  const [kind, setKind] = useState<ExerciseKind | null>(initialConfig?.type ?? null);
  const [config, setConfig] = useState<Partial<ExerciseConfig>>(() =>
    buildInitialConfig(settings, initialConfig),
  );
  const [preview, setPreview] = useState<PracticeBar[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaults = useMemo(() => buildDefaults(settings), [settings]);

  const handleTypeSelect = useCallback(
    (type: ExerciseKind) => {
      setKind(type);
      setError(null);
      setConfig({
        ...defaults,
        type,
        keys: [],
        source: { type: 'unified', symbols: [] },
        ...(type === 'scales'
          ? { scaleType: 'major' as const, direction: 'both' as const, octaves: 1 as const }
          : {}),
      });
      setStep(2);
    },
    [defaults],
  );

  const handleConfigChange = useCallback((patch: Partial<ExerciseConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handlePreview = useCallback(() => {
    setError(null);
    try {
      const built = buildConfig(config, kind, defaults);
      const bars =
        kind === 'chords'
          ? generateChordExercise(built as ChordExerciseConfig)
          : generateScaleExercise(built as ScaleExerciseConfig);
      setPreview(bars);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка генерации превью');
    }
  }, [kind, config, defaults]);

  const handleQuickStart = useCallback(() => {
    try {
      const built = buildConfig(config, kind, defaults);
      const bars =
        kind === 'chords'
          ? generateChordExercise(built as ChordExerciseConfig)
          : generateScaleExercise(built as ScaleExerciseConfig);

      updateSettings.mutate({ practiceCards: buildPracticeCardsSettings(built, kind!) });
      onStart(built, bars);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось начать упражнение');
    }
  }, [kind, defaults, config, onStart, updateSettings]);

  const handleStart = useCallback(() => {
    if (!preview || !kind) return;
    try {
      const built = buildConfig(config, kind, defaults);
      updateSettings.mutate({ practiceCards: buildPracticeCardsSettings(built, kind) });
      onStart(built, preview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось начать упражнение');
    }
  }, [config, preview, onStart, kind, updateSettings, defaults]);

  const canPreview =
    (config.keys?.length ?? 0) > 0 &&
    kind != null &&
    (kind === 'chords'
      ? isValidSource((config as Partial<ChordExerciseConfig>).source, kind)
      : isValidSource((config as Partial<ScaleExerciseConfig>).source, kind));

  const step2Label = kind === 'chords' ? 'Аккорды' : kind === 'scales' ? 'Гаммы' : 'Параметры';

  const effectiveSteps = STEPS.map((s, i) => ({
    ...s,
    label: i === 1 ? step2Label : s.label,
  }));

  const playRandomlyToggle = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Рандомизация</CardTitle>
      </CardHeader>
      <CardContent>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={config.playRandomly ?? false}
            onChange={(e) => handleConfigChange({ playRandomly: e.target.checked })}
          />
          Играть рандомно
        </label>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Выбранные элементы проигрываются в случайном порядке и случайных тональностях из
          выбранного списка, генерируясь заново по ходу игры.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Stepper */}
      <nav className="flex items-center justify-center gap-2 py-4" aria-label="Шаги мастера">
        {effectiveSteps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                step === s.num && 'border-primary bg-primary text-primary-foreground',
                step > s.num && 'border-primary bg-primary/20 text-primary',
                step < s.num && 'border-muted-foreground/30 text-muted-foreground',
              )}
              aria-current={step === s.num ? 'step' : undefined}
            >
              {s.num}
            </div>
            <span
              className={cn(
                'hidden text-sm font-medium sm:inline',
                step === s.num ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
            {i < effectiveSteps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8 transition-colors',
                  step > s.num ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        ))}
      </nav>

      {/* Error banner */}
      {error && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Step content */}
      {step === 1 && <StepTypeSelect onSelect={handleTypeSelect} />}

      {step === 2 && kind === 'chords' && (
        <Step2Shell
          canPreview={canPreview}
          onBack={() => setStep(1)}
          onPreview={handlePreview}
          onQuickStart={handleQuickStart}
          playRandomlyToggle={playRandomlyToggle}
        >
          <StepChordConfig
            config={config as Partial<ChordExerciseConfig>}
            onChange={handleConfigChange}
            settings={settings}
          />
        </Step2Shell>
      )}

      {step === 2 && kind === 'scales' && (
        <Step2Shell
          canPreview={canPreview}
          onBack={() => setStep(1)}
          onPreview={handlePreview}
          onQuickStart={handleQuickStart}
          playRandomlyToggle={playRandomlyToggle}
        >
          <StepScaleConfig
            config={config as Partial<ScaleExerciseConfig>}
            onChange={handleConfigChange}
            settings={settings}
          />
        </Step2Shell>
      )}

      {step === 3 && preview && config.type && (
        <StepPreview
          config={config as ExerciseConfig}
          bars={preview}
          onBack={() => setStep(2)}
          onStart={handleStart}
        />
      )}
    </div>
  );
}

export default ExerciseWizard;
