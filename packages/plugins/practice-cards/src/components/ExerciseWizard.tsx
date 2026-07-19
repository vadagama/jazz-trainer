import { useState, useCallback, useMemo } from 'react';
import { useSettings, useUpdateSettings } from '@jazz/plugin-sdk';

import { cn, Checkbox, Card, CardContent, CardHeader, CardTitle } from '@jazz/ui';
import { generateChordExercise } from '../generators/chordExercise.js';
import { generateScaleExercise } from '../generators/scaleExercise.js';
import { generateEnclosureExercise } from '../generators/enclosureExercise.js';
import { generateSequenceExercise } from '../generators/sequenceExercise.js';
import type {
  ExerciseConfig,
  ChordExerciseConfig,
  ScaleExerciseConfig,
  EnclosureExerciseConfig,
  SequenceExerciseConfig,
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
  DEF_SEQUENCE_TYPE,
  DEF_SEQUENCE_START_DEGREES,
  DEF_SEQUENCE_DIRECTION,
} from '../defaults.js';
import { StepTypeSelect } from './StepTypeSelect.js';
import { StepChordConfig } from './StepChordConfig.js';
import { StepScaleConfig } from './StepScaleConfig.js';
import { StepEnclosureConfig } from './StepEnclosureConfig.js';
import { StepSequenceConfig } from './StepSequenceConfig.js';
import { StepPreview } from './StepPreview.js';
import { Step2Shell } from './Step2Shell.js';

export interface ExerciseWizardProps {
  onStart: (config: ExerciseConfig, bars: PracticeBar[]) => void;
  initialConfig?: ExerciseConfig | null;
}

type WizardStep = 1 | 2 | 3;
type ExerciseKind = 'chords' | 'scales' | 'enclosures' | 'sequences';

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

    const common = { ...defs, keys: pc.lastKeys };

    if (kind === 'scales') {
      return {
        ...common,
        type: 'scales' as const,
        source,
        scaleType: 'major' as const,
        direction: 'both' as const,
        octaves: 1 as const,
      };
    }
    if (kind === 'enclosures') {
      return {
        ...common,
        type: 'enclosures' as const,
        source: { type: 'unified' as const, symbols: [] },
        enclosureType: (pc.lastEnclosureType ?? 'diatonic-upper') as EnclosureExerciseConfig['enclosureType'],
        targetDegrees:
          (pc.lastEnclosureDegrees?.map(
            (d) => Number(d) as EnclosureExerciseConfig['targetDegrees'][number],
          ) ?? [1]),
        scaleType: (pc.lastEnclosureScaleType ?? 'major') as EnclosureExerciseConfig['scaleType'],
      };
    }
    if (kind === 'sequences') {
      return {
        ...common,
        type: 'sequences' as const,
        source: { type: 'unified' as const, symbols: [] },
        sequenceType: (pc.lastSequenceType ?? DEF_SEQUENCE_TYPE) as SequenceExerciseConfig['sequenceType'],
        startDegrees:
          (pc.lastSequenceStartDegrees?.map(
            (d) => Number(d) as SequenceExerciseConfig['startDegrees'][number],
          ) ?? DEF_SEQUENCE_START_DEGREES),
        scaleType: (pc.lastSequenceScaleType ?? 'major') as SequenceExerciseConfig['scaleType'],
        direction: DEF_SEQUENCE_DIRECTION,
      };
    }
    // chords fallback
    return { ...common, type: 'chords' as const, source };
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
    ...(kind === 'enclosures'
      ? {
          lastEnclosureType: (config as EnclosureExerciseConfig).enclosureType,
          lastEnclosureDegrees: (config as EnclosureExerciseConfig).targetDegrees.map((d) =>
            String(d),
          ) as ('1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11')[],
          lastEnclosureScaleType: (config as EnclosureExerciseConfig).scaleType,
        }
      : {}),
    ...(kind === 'sequences'
      ? {
          lastSequenceType: (config as SequenceExerciseConfig).sequenceType,
          lastSequenceStartDegrees: (config as SequenceExerciseConfig).startDegrees.map((d) =>
            String(d) as '1' | '2' | '3' | '4' | '5' | '6' | '7',
          ),
          lastSequenceScaleType: (config as SequenceExerciseConfig).scaleType,
        }
      : {}),
  };
}

function isValidSource(src: ChordSource | undefined, kind?: ExerciseKind): boolean {
  if (!src) return false;
  switch (src.type) {
    case 'unified':
      return kind === 'scales' || kind === 'enclosures' || kind === 'sequences'
        ? true
        : (src.symbols?.length ?? 0) > 0;
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

  if (kind === 'scales') {
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

  if (kind === 'sequences') {
    return {
      ...base,
      type: 'sequences' as const,
      source: (partial as Partial<SequenceExerciseConfig>).source ?? {
        type: 'unified' as const,
        symbols: [],
      },
      sequenceType:
        (partial as Partial<SequenceExerciseConfig>).sequenceType ?? DEF_SEQUENCE_TYPE,
      startDegrees:
        (partial as Partial<SequenceExerciseConfig>).startDegrees ?? DEF_SEQUENCE_START_DEGREES,
      scaleType: (partial as Partial<SequenceExerciseConfig>).scaleType ?? 'major',
      direction: (partial as Partial<SequenceExerciseConfig>).direction ?? DEF_SEQUENCE_DIRECTION,
    } as SequenceExerciseConfig;
  }

  return {
    ...base,
    type: 'enclosures' as const,
    source: { type: 'unified' as const, symbols: [] },
    enclosureType: (partial as Partial<EnclosureExerciseConfig>).enclosureType ?? 'diatonic-upper',
    targetDegrees: (partial as Partial<EnclosureExerciseConfig>).targetDegrees ?? [1, 3, 5, 7],
    scaleType: (partial as Partial<EnclosureExerciseConfig>).scaleType ?? 'major',
  } as EnclosureExerciseConfig;
}

const STEPS = [
  { num: 1 as const, label: 'Тип' },
  { num: 2 as const, label: 'Параметры' },
  { num: 3 as const, label: 'Превью' },
];

/** Сгенерировать PracticeBar[] по выбранному типу упражнения. */
function generateExerciseBars(config: ExerciseConfig, kind: ExerciseKind | null): PracticeBar[] {
  switch (kind) {
    case 'chords':
      return generateChordExercise(config as ChordExerciseConfig);
    case 'scales':
      return generateScaleExercise(config as ScaleExerciseConfig);
    case 'enclosures':
      return generateEnclosureExercise(config as EnclosureExerciseConfig);
    case 'sequences':
      return generateSequenceExercise(config as SequenceExerciseConfig);
    default:
      throw new Error('Тип упражнения не выбран');
  }
}

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
      const next: Partial<ExerciseConfig> = {
        ...defaults,
        type,
        keys: [],
        source: { type: 'unified', symbols: [] },
      };
      if (type === 'scales') {
        Object.assign(next, {
          scaleType: 'major' as const,
          direction: 'both' as const,
          octaves: 1 as const,
        });
      } else if (type === 'enclosures') {
        Object.assign(next, {
          enclosureType: 'diatonic-upper' as const,
          targetDegrees: [1, 3, 5, 7],
          scaleType: 'major' as const,
        });
      } else if (type === 'sequences') {
        Object.assign(next, {
          sequenceType: DEF_SEQUENCE_TYPE,
          startDegrees: DEF_SEQUENCE_START_DEGREES,
          scaleType: 'major' as const,
          direction: DEF_SEQUENCE_DIRECTION,
        });
      }
      setConfig(next);
      setStep(2);
    },
    [defaults],
  );

  const handleConfigChange = useCallback((patch: Partial<ExerciseConfig>) => {
    setConfig((prev) => ({ ...(prev as object), ...(patch as object) }) as Partial<ExerciseConfig>);
  }, []);

  const handlePreview = useCallback(() => {
    setError(null);
    try {
      const built = buildConfig(config, kind, defaults);
      const bars = generateExerciseBars(built, kind);
      setPreview(bars);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка генерации превью');
    }
  }, [kind, config, defaults]);

  const handleQuickStart = useCallback(() => {
    try {
      const built = buildConfig(config, kind, defaults);
      const bars = generateExerciseBars(built, kind);

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
      : isValidSource(
          (config as Partial<
            ScaleExerciseConfig | EnclosureExerciseConfig | SequenceExerciseConfig
          >).source,
          kind,
        ));

  const step2Label =
    kind === 'chords'
      ? 'Аккорды'
      : kind === 'scales'
        ? 'Гаммы'
        : kind === 'enclosures'
          ? 'Опевания'
          : 'Секвенции';

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

      {step === 2 && kind === 'enclosures' && (
        <Step2Shell
          canPreview={canPreview}
          onBack={() => setStep(1)}
          onPreview={handlePreview}
          onQuickStart={handleQuickStart}
          playRandomlyToggle={playRandomlyToggle}
        >
          <StepEnclosureConfig
            config={config as Partial<EnclosureExerciseConfig>}
            onChange={handleConfigChange}
            settings={settings}
          />
        </Step2Shell>
      )}

      {step === 2 && kind === 'sequences' && (
        <Step2Shell
          canPreview={canPreview}
          onBack={() => setStep(1)}
          onPreview={handlePreview}
          onQuickStart={handleQuickStart}
          playRandomlyToggle={playRandomlyToggle}
        >
          <StepSequenceConfig
            config={config as Partial<SequenceExerciseConfig>}
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
