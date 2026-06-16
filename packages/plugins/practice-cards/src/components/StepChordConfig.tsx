import { useState, useMemo, useCallback } from 'react';
import type { Key, UserSettingsDTO } from '@jazz/shared';
import { listPatterns, PATTERNS } from '@jazz/music-core';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@jazz/ui';
import type { ChordExerciseConfig, ChordSource } from '../generators/types.js';
import { CHORD_GROUPS } from './unifiedChordCatalog.js';
import { degreeLabel, patternSequence } from './degreeFunctions.js';
import { useSourceConfig, buildSourcePayload } from './config/useSourceConfig.js';
import {
  SourceCard,
  KeysCard,
  BarsPerUnitCard,
  TimeSignatureCard,
  CountInCard,
  CardModeCard,
  BackingCard,
  MetronomeTempoCard,
  RepetitionsCard,
  DslSourceEditor,
  ChipSequence,
} from './config/index.js';

export interface StepChordConfigProps {
  config: Partial<ChordExerciseConfig>;
  onChange: (patch: Partial<ChordExerciseConfig>) => void;
  settings: UserSettingsDTO | undefined;
}

export function StepChordConfig({ config, onChange, settings }: StepChordConfigProps) {
  const patterns = useMemo(() => listPatterns().filter((p) => p.id !== 'random-diatonic'), []);

  const { sourceType, setSourceType, dslText, dslError, parsedPreview, handleDslChange } =
    useSourceConfig(config.source);

  const unifiedSymbols = useMemo(
    () => (config.source?.type === 'unified' ? config.source.symbols : []),
    [config.source],
  );
  const [showFullCatalog, setShowFullCatalog] = useState(false);

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

  const toggleSymbol = useCallback(
    (symbol: string) => {
      const next = unifiedSymbols.includes(symbol)
        ? unifiedSymbols.filter((s) => s !== symbol)
        : [...unifiedSymbols, symbol];
      onChange({ source: { type: 'unified', symbols: next } });
    },
    [onChange, unifiedSymbols],
  );

  const clearUnified = useCallback(
    () => onChange({ source: { type: 'unified', symbols: [] } }),
    [onChange],
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
  const barsPerChord = config.barsPerChord ?? 1;
  const timeSignature = config.timeSignature ?? '4/4';
  const countInBars = config.countInBars ?? settings?.countIn ?? 1;
  const cardMode = config.cardMode ?? 'current';
  const metronomeEnabled = config.metronomeEnabled ?? settings?.metronomeEnabled ?? true;
  const metronomeVolume = config.metronomeVolume ?? settings?.metronomeVolume ?? 0.5;
  const keys = config.keys ?? [];

  return (
    <div className="space-y-5">
      {/* Source */}
      <SourceCard
        title="Источник аккордов"
        sourceType={sourceType}
        onSourceTypeChange={handleSourceTypeChange}
      >
        {sourceType === 'unified' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Выберите ступени — каждая прозвучит отдельным тактом в каждой выбранной тональности.
              </p>
              <button
                type="button"
                onClick={() => setShowFullCatalog((v) => !v)}
                className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {showFullCatalog ? 'Частый набор' : 'Полный каталог'}
              </button>
            </div>

            {CHORD_GROUPS.map((group) => {
              const items = showFullCatalog ? group.full : group.common;
              return (
                <div key={group.label} className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((symbol) => {
                      const active = unifiedSymbols.includes(symbol);
                      return (
                        <button
                          key={symbol}
                          type="button"
                          onClick={() => toggleSymbol(symbol)}
                          className={cn(
                            'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
                          )}
                        >
                          {symbol}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {unifiedSymbols.length > 0 ? (
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Выбрано ({unifiedSymbols.length}):
                  </span>
                  <button
                    type="button"
                    onClick={clearUnified}
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                  >
                    Очистить
                  </button>
                </div>
                <ChipSequence labels={unifiedSymbols} variant="degree" />
                {keys.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                    <span className="mr-1 text-xs text-muted-foreground">
                      В тональности {keys[0]}:
                    </span>
                    <ChipSequence labels={unifiedSymbols} variant="chord" sep="→" />
                  </div>
                )}
              </div>
            ) : (
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                Пока ничего не выбрано — выберите хотя бы один аккорд.
              </p>
            )}
          </div>
        )}

        {sourceType === 'pattern' && (
          <>
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
            {config.source?.type === 'pattern' &&
              config.source.patternId &&
              (() => {
                const src = config.source!;
                if (src.type !== 'pattern') return null;
                const patDef = PATTERNS.find((p) => p.id === src.patternId);
                if (!patDef) return null;
                const seq = patternSequence(patDef);
                if (!seq) return null;
                if (seq === 'random') {
                  return (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Последовательность: произвольные диатонические аккорды (новые при каждом
                      запуске).
                    </p>
                  );
                }
                return (
                  <div className="mt-3 space-y-1">
                    <span className="text-xs text-muted-foreground">Последовательность:</span>
                    <ChipSequence
                      labels={seq.map((s) => degreeLabel(s.degree, s.quality))}
                      variant="degree"
                    />
                  </div>
                );
              })()}
          </>
        )}

        {sourceType === 'random' && (
          <p className="text-xs text-muted-foreground">
            Будет сгенерирована произвольная диатоническая прогрессия в выбранных тональностях.
          </p>
        )}

        {sourceType === 'dsl' && (
          <DslSourceEditor
            dslText={dslText}
            dslError={dslError}
            parsedPreview={parsedPreview}
            keys={keys}
            onChange={handleDslChangeAndNotify}
          />
        )}
      </SourceCard>

      <KeysCard keys={keys} onToggle={toggleKey} />

      <BarsPerUnitCard
        label="Тактов на аккорд"
        value={barsPerChord}
        onChange={(v) => onChange({ barsPerChord: v })}
      />

      <TimeSignatureCard value={timeSignature} onChange={(v) => onChange({ timeSignature: v })} />

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
      />
    </div>
  );
}

export default StepChordConfig;
