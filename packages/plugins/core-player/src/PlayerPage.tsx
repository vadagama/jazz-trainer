import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Key, Section, Style } from '@jazz/shared';
import { transposeSections, getStyleProfile } from '@jazz/music-core';
import type { InputPort } from '@jazz/music-core';
import type { SoloInstrumentManifest } from '@jazz/music-core/audio';
import { SOLO_INSTRUMENT_MANIFESTS } from '@jazz/music-core/audio';
import { usePublicComposition } from './queries/usePublicCompositions';
import {
  useEffectiveSettings,
  usePlaybackStore,
  usePluginTransport,
  useUpdateSettings,
  useMidiVisualizer,
  useMidiConnection,
  type KeyboardMode,
} from '@jazz/plugin-sdk';
import {
  HarmonyGrid,
  PlayerToolbar,
  VirtualKeyboardPanel,
  PlayerMidiControls,
  SoloSettingsDialog,
 InstrumentsDialog } from '@jazz/ui';

// ---------------------------------------------------------------------------
// -- Global adapter reference (for immediate solo volume/ducking feedback) --

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

// ---------------------------------------------------------------------------
// PlayerPage
// ---------------------------------------------------------------------------

export function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const { data: grid, isLoading, isError } = usePublicComposition(id ?? '');
  const settings = useEffectiveSettings();
  const updateSettings = useUpdateSettings();
  const { status, currentBar, currentBeat, countInActive, countInBeat } = usePlaybackStore();
  const displayBeat = countInActive ? countInBeat : currentBeat;
  const countingInBarIndex = countInActive ? currentBar : undefined;

  const [soloDialogOpen, setSoloDialogOpen] = useState(false);
  const [instrumentsDialogOpen, setInstrumentsDialogOpen] = useState(false);
  const [localBpm, setLocalBpm] = useState<number | null>(null);
  const [localKey, setLocalKey] = useState<Key | null>(null);
  const [localStyle, setLocalStyle] = useState<Style | null>(null);
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>('free');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showKeyLabels, setShowKeyLabels] = useState(false);
  const [baseOctave, setBaseOctave] = useState(0);
  const [containerWidth, setContainerWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );

  const [midiInitAttempted, setMidiInitAttempted] = useState(() =>
    typeof window !== 'undefined'
      ? !!(window as unknown as Record<string, unknown>).__midiInitialized
      : false,
  );
  const [midiConnecting, setMidiConnecting] = useState(false);
  // Track viewport width for responsive octave count
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

  // -- Solo state (from settings, reactively updated by MidiSoloProvider) --
  const soloVolume = settings.soloVolume ?? 0.8;

  const inputPort = getInputPort();

  const { connectionStatus, indicatorFlash } = useMidiConnection(inputPort);
  const { activeKeys } = useMidiVisualizer(inputPort, { mode: keyboardMode });

  // -- Auto-open virtual keyboard when MIDI connects ------------------------
  useEffect(() => {
    if (connectionStatus === 'connected' && !keyboardAutoOpenedRef.current) {
      keyboardAutoOpenedRef.current = true;
      setKeyboardVisible(true);
    }
    if (connectionStatus !== 'connected') {
      keyboardAutoOpenedRef.current = false;
    }
  }, [connectionStatus]);

  // -- Solo control handlers (settings persistence) -------------------------
  const handleToneSelect = useCallback(
    (manifestId: string) => {
      // Apply immediately for instant audio feedback
      const host = (window as unknown as Record<string, unknown>).__soloInstrumentHost as {
        selectTone(id: string): void;
      } | null;
      try {
        host?.selectTone(manifestId);
      } catch {
        /* will sync via settings if host isn't ready */
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

  const handleKeyDown = useCallback((midiNote: number) => {
    const host = (window as unknown as Record<string, unknown>).__soloInstrumentHost as {
      handleNoteOn(n: number, v: number): void;
    } | null;
    host?.handleNoteOn(midiNote, 100);
  }, []);

  const handleKeyUp = useCallback((midiNote: number) => {
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

  // Initialize local player state from composition metadata on load
  useEffect(() => {
    if (grid) {
      if (grid.recommendedTempo != null) setLocalBpm(grid.recommendedTempo);
      if (grid.recommendedStyle) setLocalStyle(grid.recommendedStyle as Style);
      setLocalKey(grid.key as Key);
    }
  }, [grid?.id]);

  const handleStyleChange = (style: Style) => {
    setLocalStyle(style);
  };

  const effectiveBpm = localBpm ?? grid?.recommendedTempo ?? settings.bpm;
  const effectiveVolume = localVolume ?? settings.volume;
  const effectiveStyle = (localStyle ?? (grid?.recommendedStyle as Style | undefined) ?? settings.style ?? 'swing') as Style;
  const effectiveDrumKit = useMemo(() => {
    const profile = getStyleProfile(effectiveStyle);
    return profile.defaultVariants.drums ?? 'jazz-drum-kit';
  }, [effectiveStyle]);
  const effectiveTimeSig = grid?.timeSignature ?? '4/4';
  const effectiveKey = localKey ?? grid?.key ?? 'C';

  const rawContent = grid?.content ?? { version: 1 as const, bars: [] };
  const sections: Section[] =
    rawContent.sections && rawContent.sections.length > 0
      ? rawContent.sections
      : rawContent.bars.length > 0
        ? [
            {
              id: 'section-main',
              name: 'A',
              type: 'verseA',
              timeSignature: effectiveTimeSig,
              bars: rawContent.bars,
            },
          ]
        : [];

  // Repeat override — allows changing loop count during playback
  const [repeatOverridden, setRepeatOverridden] = useState(false);
  const [repeatOverride, setRepeatOverride] = useState<number | null | undefined>(undefined);

  const repeatCount = useMemo(() => {
    if (repeatOverridden) return repeatOverride;
    if (sections.length === 0) return undefined;
    const lastSection = sections[sections.length - 1]!;
    const lastBar = lastSection.bars[lastSection.bars.length - 1];
    // Default to infinite loop when no repeatEnd is explicitly set
    return lastBar?.repeatEnd?.count ?? null;
  }, [sections, repeatOverridden, repeatOverride]);

  const handleRepeatChange = useCallback((value: number | null | undefined) => {
    setRepeatOverridden(true);
    setRepeatOverride(value);
  }, []);

  // Apply repeat override to sections for transport.
  // When no repeatEnd is set, default to infinite loop (count: null).
  const effectiveSections = useMemo(() => {
    if (sections.length === 0) return sections;

    const lastSection = sections[sections.length - 1]!;
    const lastBar = lastSection.bars[lastSection.bars.length - 1];
    const currentCount = lastBar?.repeatEnd?.count;
    const desiredCount = repeatOverridden
      ? repeatOverride
      : (currentCount ?? null); // default: infinite when no repeatEnd

    if (desiredCount === currentCount) return sections;

    return sections.map((s, si) => {
      if (si !== sections.length - 1) return s;
      const bars = s.bars.map((b, bi) => {
        if (bi !== s.bars.length - 1) return b;
        if (desiredCount === undefined) {
          const { repeatEnd: _, ...rest } = b;
          return rest as typeof b;
        }
        return { ...b, repeatEnd: { count: desiredCount } };
      });
      return { ...s, bars };
    });
  }, [sections, repeatOverridden, repeatOverride]);

  const originalKey = grid?.key ?? 'C';
  const displaySections = useMemo(
    () => transposeSections(effectiveSections, originalKey, effectiveKey),
    [effectiveSections, originalKey, effectiveKey],
  );

  const totalBars =
    effectiveSections.length > 0
      ? effectiveSections.reduce((s, sec) => s + sec.bars.length, 0)
      : (grid?.barsCount ?? 0);

  const transport = usePluginTransport({
    settings: { ...settings, bpm: effectiveBpm, volume: effectiveVolume, style: effectiveStyle, drumKit: effectiveDrumKit },
    timeSignature: effectiveTimeSig,
    totalBars,
    sections: displaySections,
  });

  const playingBarIndex = !countInActive && status !== 'idle' ? currentBar : undefined;
  const currentBarDisplay = playingBarIndex != null ? playingBarIndex + 1 : 1;

  const availableTones: SoloInstrumentManifest[] = SOLO_INSTRUMENT_MANIFESTS;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (isError || !grid) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-center">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-sm text-muted-foreground">Не удалось загрузить сетку</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Breadcrumbs */}
      <nav className="flex shrink-0 items-center gap-1.5 px-6 py-2 text-sm">
        <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
          Каталог
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="truncate font-medium text-foreground">{grid.name}</span>
      </nav>

      {/* Grid (read-only) */}
      <main className="flex-1 overflow-y-auto py-4">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">{grid.name}</h1>
            <span className="text-base font-semibold tabular-nums text-foreground">
              {currentBarDisplay} / {totalBars} тактов
            </span>
          </div>
          {sections.length > 0 && (
            <HarmonyGrid
              sections={displaySections}
              selectedBarId={null}
              playingBarIndex={playingBarIndex}
              countingInBarIndex={countingInBarIndex}
              readonly
              onSelectBar={() => {}}
              onRenameSection={() => {}}
              onSetSectionTimeSignature={() => {}}
              onAddBarToSection={() => {}}
              onDeleteSection={() => {}}
              onSetBarRepeatEnd={() => {}}
              onAddSection={() => {}}
            />
          )}
        </div>
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
          onKeyClick={handleKeyDown}
          onKeyRelease={handleKeyUp}
        />
      )}
      <PlayerToolbar
        status={countInActive ? 'playing' : status}
        currentBeat={displayBeat}
        currentBar={currentBar}
        totalBars={totalBars}
        totalBeats={parseInt(effectiveTimeSig.split('/')[0] ?? '4', 10)}
        bpm={effectiveBpm}
        currentKey={effectiveKey}
        onPlay={transport.play}
        onPause={transport.pause}
        onStop={transport.stop}
        onPrevBar={transport.prevBar}
        onNextBar={transport.nextBar}
        onBpmChange={setLocalBpm}
        onKeyChange={setLocalKey}
        volume={effectiveVolume}
        onVolumeChange={setLocalVolume}
        style={effectiveStyle}
        onStyleChange={handleStyleChange}
        repeatCount={repeatCount}
        onRepeatChange={handleRepeatChange}
        onInstrumentsClick={() => setInstrumentsDialogOpen(true)}
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
        selectedToneId={settings.soloToneId ?? 'rhodes-jrhodes3c'}
        onToneSelect={handleToneSelect}
        soloVolume={soloVolume}
        onSoloVolumeChange={handleSoloVolumeChange}
      />

      <InstrumentsDialog
        open={instrumentsDialogOpen}
        onClose={() => setInstrumentsDialogOpen(false)}
        onStyleChange={handleStyleChange}
        style={effectiveStyle}
      />
    </div>
  );
}

export default PlayerPage;
