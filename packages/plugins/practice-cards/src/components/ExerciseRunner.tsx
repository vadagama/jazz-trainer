import { useEffect, useRef, useState, useCallback } from 'react';
import {
  usePluginTransport,
  usePlaybackStore,
  useEffectiveSettings,
  useUpdateSettings,
  useMidiConnection,
  useMidiVisualizer,
  type KeyboardMode,
} from '@jazz/plugin-sdk';
import type { Section, Style, TimeSignatureString } from '@jazz/shared';
import { parseTimeSignature } from '@jazz/music-core';
import type { InputPort } from '@jazz/music-core';
import type { SoloInstrumentManifest } from '@jazz/music-core/audio';
import { SOLO_INSTRUMENT_MANIFESTS } from '@jazz/music-core/audio';
import {
  PlayerToolbar,
  VirtualKeyboardPanel,
  PlayerMidiControls,
  SoloSettingsDialog,
} from '@jazz/ui';
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

// ── Global adapter helpers ──────────────────────────────────────────────────

function getInputPort(): InputPort | null {
  if (typeof window !== 'undefined') {
    return (window as unknown as Record<string, unknown>).__midiInputPort as InputPort | null;
  }
  return null;
}

function getToneAdapter() {
  if (typeof window !== 'undefined') {
    return (window as unknown as Record<string, unknown>).__toneAudioAdapter as {
      setSoloVolume: (v: number) => void;
      setDucking: (enabled: boolean) => void;
    } | null;
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ExerciseRunner({ bars, config, onComplete, onReconfigure }: ExerciseRunnerProps) {
  const serverSettings = useEffectiveSettings();
  const updateSettings = useUpdateSettings();

  // ── Local overrides for transport controls ─────────────────────────────
  const [localBpm, setLocalBpm] = useState<number | null>(null);
  const [localVolume, setLocalVolume] = useState<number | null>(null);

  // ── MIDI ----------------------------------------------------------------
  const [midiInitAttempted, setMidiInitAttempted] = useState(() =>
    typeof window !== 'undefined'
      ? !!(window as unknown as Record<string, unknown>).__midiInitialized
      : false,
  );
  const [midiConnecting, setMidiConnecting] = useState(false);
  const [soloDialogOpen, setSoloDialogOpen] = useState(false);

  const inputPort = getInputPort();

  const { connectionStatus, indicatorFlash } = useMidiConnection(inputPort);

  // ── Virtual keyboard state ──────────────────────────────────────────────
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>('free');

  const { activeKeys } = useMidiVisualizer(inputPort, { mode: keyboardMode });

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showKeyLabels, setShowKeyLabels] = useState(false);
  const [baseOctave, setBaseOctave] = useState(0);
  const [containerWidth, setContainerWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );

  useEffect(() => {
    const onResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const WHITE_W = 42;
  const displayedOctaves = Math.max(1, Math.floor(containerWidth / (7 * WHITE_W)));
  const maxBase = Math.max(0, 8 - displayedOctaves);
  const clampedBase = Math.min(baseOctave, maxBase);
  const octaveLow = clampedBase;
  const octaveHigh = Math.min(7, clampedBase + displayedOctaves - 1);
  const keyboardWidth = displayedOctaves * 7 * WHITE_W;

  const keyboardAutoOpenedRef = useRef(false);

  // ── Auto-open virtual keyboard when MIDI connects ───────────────────────
  useEffect(() => {
    if (connectionStatus === 'connected' && !keyboardAutoOpenedRef.current) {
      keyboardAutoOpenedRef.current = true;
      setKeyboardVisible(true);
    }
    if (connectionStatus !== 'connected') {
      keyboardAutoOpenedRef.current = false;
    }
  }, [connectionStatus]);

  // ── Solo state ──────────────────────────────────────────────────────────
  const soloVolume = serverSettings.soloVolume ?? 0.8;

  const handleToneSelect = useCallback(
    (manifestId: string) => {
      // Apply immediately for instant audio feedback
      const host = (window as unknown as Record<string, unknown>).__soloInstrumentHost as {
        selectTone(id: string): void;
      } | null;
      try {
        host?.selectTone(manifestId);
      } catch {
        /* will sync via settings */
      }
      // Persist to settings
      updateSettings.mutate({ soloToneId: manifestId });
    },
    [updateSettings],
  );

  const handleSoloVolumeChange = useCallback(
    (value: number) => {
      getToneAdapter()?.setSoloVolume(value);
      updateSettings.mutate({ soloVolume: value });
    },
    [updateSettings],
  );

  const toggleKeyboard = useCallback(() => {
    setKeyboardVisible((v) => !v);
  }, []);

  const shiftOctave = useCallback(
    (delta: number) => {
      setBaseOctave((b) => Math.max(0, Math.min(maxBase, b + delta)));
    },
    [maxBase],
  );

  const handleMidiKeyDown = useCallback((midiNote: number) => {
    const host = (window as unknown as Record<string, unknown>).__soloInstrumentHost as {
      handleNoteOn(n: number, v: number): void;
    } | null;
    host?.handleNoteOn(midiNote, 100);
  }, []);

  const handleMidiKeyUp = useCallback((midiNote: number) => {
    const host = (window as unknown as Record<string, unknown>).__soloInstrumentHost as {
      handleNoteOff(n: number): void;
    } | null;
    host?.handleNoteOff(midiNote);
  }, []);

  const triggerMidiInit = useCallback(async () => {
    setMidiConnecting(true);
    try {
      const initFn = (window as unknown as Record<string, () => Promise<void>>).__midiInitMidi;
      if (initFn) await initFn();
    } catch {
      /* handled internally */
    } finally {
      setMidiInitAttempted(true);
      setMidiConnecting(false);
    }
  }, []);

  const effectiveBpm = localBpm ?? config.tempo;
  const effectiveVolume = localVolume ?? serverSettings.volume;
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

  const availableTones: SoloInstrumentManifest[] = SOLO_INSTRUMENT_MANIFESTS;

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

      {keyboardVisible && (
        <VirtualKeyboardPanel
          keyboardMode={keyboardMode}
          onKeyboardModeChange={setKeyboardMode}
          showKeyLabels={showKeyLabels}
          onToggleKeyLabels={() => setShowKeyLabels((v) => !v)}
          octaveLow={octaveLow}
          octaveHigh={octaveHigh}
          onShiftOctave={shiftOctave}
          keyboardWidth={keyboardWidth}
          activeKeys={activeKeys}
          onKeyClick={handleMidiKeyDown}
          onKeyRelease={handleMidiKeyUp}
        />
      )}
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
      >
        <PlayerMidiControls
          midiConnectionStatus={connectionStatus}
          midiIndicatorFlash={indicatorFlash}
          midiInitAttempted={midiInitAttempted}
          midiConnecting={midiConnecting}
          onMidiClick={midiInitAttempted ? () => setSoloDialogOpen(true) : triggerMidiInit}
          keyboardVisible={keyboardVisible}
          onToggleKeyboard={toggleKeyboard}
        />
      </PlayerToolbar>

      <SoloSettingsDialog
        open={soloDialogOpen}
        onOpenChange={setSoloDialogOpen}
        tones={availableTones}
        selectedToneId={serverSettings.soloToneId ?? 'rhodes-jrhodes3c'}
        onToneSelect={handleToneSelect}
        soloVolume={soloVolume}
        onSoloVolumeChange={handleSoloVolumeChange}
      />
    </div>
  );
}

export default ExerciseRunner;
