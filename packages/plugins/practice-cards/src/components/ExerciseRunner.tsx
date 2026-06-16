import { useEffect, useRef, useState, useCallback } from 'react';
import {
  usePluginTransport,
  usePlaybackStore,
  useEffectiveSettings,
  useUpdateSettings,
} from '@jazz/plugin-sdk';
import type { Section, Style, TimeSignatureString } from '@jazz/shared';
import { parseTimeSignature } from '@jazz/music-core';
import { PlayerToolbar } from '@jazz/ui';
import { Settings } from 'lucide-react';
import { CardDisplay } from './CardDisplay.js';
import type { PracticeBar, ExerciseConfig } from '../generators/types.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExerciseRunnerProps {
  bars: PracticeBar[];
  config: ExerciseConfig;
  onComplete: () => void;
  onReconfigure: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSections(
  bars: PracticeBar[],
  infinite: boolean,
  timeSignature: TimeSignatureString,
): Section[] {
  const sectionBars = bars.map((bar, i) => ({
    id: `bar-${i}`,
    chords: bar.chords.map((symbol) => ({ symbol })),
    ...(infinite && i === bars.length - 1 ? { repeatEnd: { count: null } as const } : {}),
  }));

  return [
    {
      id: 'practice-section',
      name: 'Practice',
      timeSignature,
      bars: sectionBars,
    },
  ];
}

// ── Component ────────────────────────────────────────────────────────────────

export function ExerciseRunner({ bars, config, onComplete, onReconfigure }: ExerciseRunnerProps) {
  const serverSettings = useEffectiveSettings();
  const updateSettings = useUpdateSettings();

  // ── Local overrides for transport controls ─────────────────────────────
  const [localBpm, setLocalBpm] = useState<number | null>(null);
  const [localVolume, setLocalVolume] = useState<number | null>(null);

  const effectiveBpm = localBpm ?? config.tempo;
  const effectiveVolume = localVolume ?? serverSettings.volume;
  // Style is a global user setting — single source of truth across all sections.
  const effectiveStyle = (serverSettings.style as Style) ?? 'swing';

  const timeSignature = config.timeSignature ?? '4/4';
  const beatsPerBar = parseTimeSignature(timeSignature).beatsPerBar;

  // ── Sections ───────────────────────────────────────────────────────────
  const sections = buildSections(bars, config.infinite, timeSignature);

  // ── Transport ──────────────────────────────────────────────────────────
  const transport = usePluginTransport({
    settings: {
      ...serverSettings,
      bpm: effectiveBpm,
      volume: effectiveVolume,
      style: effectiveStyle,
      metronomeEnabled: config.metronomeEnabled,
      metronomeVolume: config.metronomeVolume,
      bassEnabled: config.backingBass,
      bassVolume: config.backingBass ? (serverSettings.bassVolume ?? 0.8) : 0,
      drumsEnabled: config.backingDrums,
      drumsVolume: config.backingDrums ? (serverSettings.drumsVolume ?? 0.8) : 0,
      pianoEnabled: config.backingPiano,
      pianoVolume: config.backingPiano ? (serverSettings.pianoVolume ?? 0.8) : 0,
      rhodesEnabled: config.backingRhodes,
      rhodesVolume: config.backingRhodes ? (serverSettings.rhodesVolume ?? 0.8) : 0,
      countIn: config.countInBars,
    },
    timeSignature,
    totalBars: bars.length,
    sections,
  });

  // ── Playback state ─────────────────────────────────────────────────────
  const { status, currentBar, currentBeat, countInActive, countInBeat } = usePlaybackStore();

  // ── Completion detection ───────────────────────────────────────────────
  // seenIdleRef guards against stale 'playing' state from a previous exercise
  // leaking into this mount and triggering onComplete before the user even starts.
  const seenIdleRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const infiniteRef = useRef(config.infinite);
  infiniteRef.current = config.infinite;

  useEffect(() => {
    if (status === 'idle') {
      seenIdleRef.current = true;
      if (wasPlayingRef.current && !infiniteRef.current) {
        wasPlayingRef.current = false;
        const timer = setTimeout(() => onCompleteRef.current(), 0);
        return () => clearTimeout(timer);
      }
      wasPlayingRef.current = false;
    }
    if (status === 'playing' && seenIdleRef.current) {
      wasPlayingRef.current = true;
    }
    return undefined;
  }, [status]);

  // ── Callbacks ──────────────────────────────────────────────────────────
  const handleStyleChange = useCallback(
    (style: Style) => updateSettings.mutate({ style }),
    [updateSettings],
  );
  // ── Render ─────────────────────────────────────────────────────────────
  const barIndex = config.infinite ? currentBar % bars.length : currentBar;
  const displayStatus = countInActive ? ('playing' as const) : status;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      {/* Bar counter + reconfigure */}
      <div className="flex w-full items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm tabular-nums text-muted-foreground">
          Такт {barIndex + 1}
          {config.infinite ? ' / ∞' : ` из ${bars.length}`}
        </span>
        <button
          type="button"
          onClick={onReconfigure}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          Настроить
        </button>
      </div>

      {/* Cards / count-in dots */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden">
        {status === 'idle' || countInActive ? (
          <div
            className="flex items-center gap-5"
            role="status"
            aria-label={countInActive ? 'Затакт' : 'Готов к старту'}
          >
            {Array.from({ length: beatsPerBar }, (_, i) => (
              <span
                key={i}
                className={`block rounded-full transition-all duration-100 ${
                  countInActive && i === countInBeat
                    ? 'h-8 w-8 bg-primary scale-110'
                    : 'h-6 w-6 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        ) : (
          <CardDisplay bars={bars} currentIndex={barIndex} mode={config.cardMode} />
        )}
      </main>

      {/* Player toolbar */}
      <PlayerToolbar
        status={displayStatus}
        currentBeat={countInActive ? countInBeat : currentBeat}
        currentBar={currentBar}
        totalBars={bars.length}
        totalBeats={beatsPerBar}
        bpm={effectiveBpm}
        volume={effectiveVolume}
        showKey={false}
        currentKey={config.keys[0] ?? 'C'}
        style={effectiveStyle}
        onPlay={transport.play}
        onStop={transport.stop}
        onPrevBar={transport.prevBar}
        onNextBar={transport.nextBar}
        onBpmChange={setLocalBpm}
        onVolumeChange={setLocalVolume}
        onStyleChange={handleStyleChange}
        onKeyChange={undefined}
      />
    </div>
  );
}

export default ExerciseRunner;
