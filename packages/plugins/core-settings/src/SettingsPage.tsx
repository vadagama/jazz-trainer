import { useMemo, useCallback, useSyncExternalStore, useState, useRef } from 'react';
import { Loader2, Plus, Minus } from 'lucide-react';
import type { Style, UserSettingsDTO, MetronomeMode } from '@jazz/shared';
import { STYLES, METRONOME_MODES } from '@jazz/shared';
import {
  getStyleProfile,
  getVisibleInstruments,
  METRONOME_SAMPLES,
  buildKeyMap,
  SOLO_INSTRUMENT_MANIFESTS,
  SoloInstrumentHost,
  type InstrumentId,
  type InputPort,
} from '@jazz/music-core';
import {
  useSettings,
  useEffectiveSettings,
  useUpdateSettings,
  useMidiConnection,
  useComputerKeyboardStore,
  useInstruments,
} from '@jazz/plugin-sdk';
import {
  Button,
  Slider,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  MidiDeviceSelector,
  MidiIndicator,
  useClampedNumberInput,
  clampNumber,
} from '@jazz/ui';
import { InstrumentTile } from './InstrumentTile';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STYLE_LABELS: Record<Style, string> = {
  swing: 'Swing',
  bossa: 'Bossa Nova',
  funk: 'Funk',
  latin: 'Latin',
  ballad: 'Ballad',
};

const MODE_LABELS: Record<MetronomeMode, string> = {
  both: 'Везде',
  'pickup-only': 'Только затакт',
  'main-only': 'Только такты',
};

const TABS = [
  { id: 'main', label: 'Основные' },
  { id: 'instruments', label: 'Инструменты' },
  { id: 'system', label: 'Системные' },
  { id: 'midi', label: 'MIDI' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const NONE_VALUE = '__none__';

// ─── Window globals (MIDI/solo wiring) ────────────────────────────────────────

function getInputPort(): InputPort | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>).__midiInputPort as InputPort | null;
}

function getSoloHost(): SoloInstrumentHost | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>)
    .__soloInstrumentHost as SoloInstrumentHost | null;
}

async function ensureAudioReady(): Promise<void> {
  const fn = (window as unknown as Record<string, (() => Promise<void>) | undefined>)
    .__ensureAudioReady;
  if (fn) await fn();
}

async function initMidi(): Promise<void> {
  const fn = (window as unknown as Record<string, (() => Promise<void>) | undefined>)
    .__midiInitMidi;
  if (fn) await fn();
}

// ─── Theme (localStorage) ──────────────────────────────────────────────────────

const THEME_KEY = 'jazz-trainer-theme';

function getStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') ?? 'light';
}

function setStoredTheme(theme: 'light' | 'dark') {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function subscribeToTheme(cb: () => void) {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
}

function useTheme() {
  const theme = useSyncExternalStore(subscribeToTheme, getStoredTheme);
  const toggle = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    setStoredTheme(next);
    window.dispatchEvent(new Event('storage'));
  }, [theme]);
  return { theme, toggle };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve settings prefix for an instrument id via the registry. */

// ─── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <div className="flex border-b border-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tempo input (keyboard-friendly, +5/-5 buttons) ────────────────────────────

function TempoControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => clampNumber(v, 20, 400);
  const {
    text,
    onChange: onTextChange,
    onBlur,
    onKeyDown: onHookKeyDown,
  } = useClampedNumberInput({ value, onCommit: onChange, min: 20, max: 400 });

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(clamp(value + 5));
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(clamp(value - 5));
    }
    onHookKeyDown(e);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="size-7"
        onClick={() => onChange(clamp(value - 5))}
      >
        <Minus className="size-3" />
      </Button>
      <Input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={onTextChange}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        className="w-[72px] text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        variant="outline"
        size="icon"
        className="size-7"
        onClick={() => onChange(clamp(value + 5))}
      >
        <Plus className="size-3" />
      </Button>
      <span className="text-xs text-muted-foreground ml-1">BPM</span>
    </div>
  );
}

// ─── Count-in input (keyboard-friendly) ────────────────────────────────────────

function CountInControl({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const {
    text,
    onChange: onTextChange,
    onBlur,
    onKeyDown,
  } = useClampedNumberInput({ value, onCommit: onChange, min: 0, max: 4 });

  return (
    <Input
      type="text"
      inputMode="numeric"
      disabled={disabled}
      value={text}
      onChange={onTextChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className="w-24 text-right"
    />
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { isLoading } = useSettings();
  const settings = useEffectiveSettings();
  const updateSettings = useUpdateSettings();
  const instruments = useInstruments();
  const { theme, toggle: toggleTheme } = useTheme();
  const [tab, setTab] = useState<TabId>('main');

  const currentStyle: Style = (settings?.style as Style) ?? 'swing';
  const styleProfile = useMemo(() => getStyleProfile(currentStyle), [currentStyle]);
  const visibleInstruments = useMemo(() => getVisibleInstruments(currentStyle), [currentStyle]);

  const mutate = useCallback(
    (patch: Partial<UserSettingsDTO>) => {
      updateSettings.mutate(patch as Parameters<typeof updateSettings.mutate>[0]);
    },
    [updateSettings],
  );

  const handleStyleChange = useCallback(
    (style: Style) => {
      const profile = getStyleProfile(style);
      const drumVariant = profile.defaultVariants.drums ?? 'jazz-drum-kit';
      // Normalize legacy 'drums' alias → concrete kit id
      const drumKit = drumVariant === 'drums' ? 'jazz-drum-kit' : drumVariant;
      mutate({
        style,
        drumKit,
      });
    },
    [mutate],
  );

  const handleBpmChange = useCallback(
    (value: number) => {
      const clamped = Math.max(20, Math.min(400, Math.round(value)));
      const perStyleOverrides = {
        ...((settings?.perStyleOverrides ?? {}) as Record<string, Record<string, unknown>>),
      };
      const currentOverrides = { ...(perStyleOverrides[currentStyle] ?? {}) };
      currentOverrides.bpm = clamped;
      perStyleOverrides[currentStyle] = currentOverrides;
      mutate({
        bpm: clamped,
        perStyleOverrides,
      } as Partial<UserSettingsDTO>);
    },
    [mutate, currentStyle, settings?.perStyleOverrides],
  );

  const handleSwingChange = useCallback(
    (value: number[]) => {
      const perStyleOverrides = { ...(settings?.perStyleOverrides ?? {}) };
      const currentOverrides = {
        ...((perStyleOverrides[currentStyle] ?? {}) as Record<string, unknown>),
      };
      currentOverrides.swingRatio = value[0];
      perStyleOverrides[currentStyle] = currentOverrides;
      mutate({
        perStyleOverrides,
      } as Partial<UserSettingsDTO>);
    },
    [mutate, currentStyle, settings?.perStyleOverrides],
  );

  const handleReset = useCallback(() => {
    const profile = getStyleProfile(currentStyle);
    const perStyleOverrides = {
      ...((settings?.perStyleOverrides ?? {}) as Record<string, Record<string, unknown>>),
    };
    // Clear per-style overrides for current style
    const currentOverrides = { ...(perStyleOverrides[currentStyle] ?? {}) };
    delete currentOverrides.swingRatio;
    delete currentOverrides.bpm;
    if (Object.keys(currentOverrides).length > 0) {
      perStyleOverrides[currentStyle] = currentOverrides;
    } else {
      delete perStyleOverrides[currentStyle];
    }
    const drumVariant = profile.defaultVariants.drums ?? 'jazz-kit';
    const drumKit = drumVariant === 'drums' ? 'jazz-drum-kit' : drumVariant;
    const patch: Record<string, unknown> = {
      drumKit,
      perStyleOverrides,
    };
    const prefix = instruments.get(drumKit)?.settingsPrefix;
    if (prefix) {
      const drumId = drumVariant as InstrumentId;
      const profileDefaults = profile.instrumentDefaults[drumId];
      if (profileDefaults) {
        patch[`${prefix}Enabled`] = profileDefaults.enabled;
        patch[`${prefix}Volume`] = profileDefaults.volume;
      }
    }
    mutate(patch as Partial<UserSettingsDTO>);
  }, [currentStyle, mutate, settings?.perStyleOverrides, instruments]);

  // ── MIDI connection state (hooks BEFORE early return) ───────────────────
  const inputPort = getInputPort();
  const { connectionStatus, availableDevices, selectDevice, indicatorFlash } =
    useMidiConnection(inputPort);
  const [midiInitAttempted, setMidiInitAttempted] = useState(
    () => !!(window as unknown as Record<string, unknown>).__midiInitialized,
  );
  const [midiConnecting, setMidiConnecting] = useState(false);

  const handleEnableMidi = useCallback(async () => {
    setMidiConnecting(true);
    try {
      await initMidi();
    } catch {
      /* handled internally */
    } finally {
      setMidiInitAttempted(true);
      setMidiConnecting(false);
    }
  }, []);

  // ── Solo test sound state ──────────────────────────────────────────────
  const [audioLoading, setAudioLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const currentSoloToneId = settings?.soloToneId;
  const handleTestSound = useCallback(async () => {
    const timers = previewTimersRef.current;
    for (const t of timers) clearTimeout(t);
    timers.length = 0;
    setAudioLoading(true);
    setPreviewError(null);
    try {
      await ensureAudioReady();

      const host = getSoloHost();
      if (!host) {
        setAudioLoading(false);
        return;
      }

      const toneId = currentSoloToneId ?? 'rhodes-jrhodes3c';
      try {
        host.selectTone(toneId);
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Инструмент недоступен');
        host.selectTone('synth-default');
      }

      await new Promise((r) => setTimeout(r, 100));

      const notes = [60, 64, 67, 72];
      const stepMs = 150;
      const noteDurationMs = 600;
      const velocity = 80;

      notes.forEach((note, i) => {
        const t1 = setTimeout(() => host.handleNoteOn(note, velocity), i * stepMs);
        const t2 = setTimeout(() => host.handleNoteOff(note), i * stepMs + noteDurationMs);
        timers.push(t1, t2);
      });

      const lastNoteEnd = (notes.length - 1) * stepMs + noteDurationMs;
      timers.push(setTimeout(() => setAudioLoading(false), lastNoteEnd + 100));
    } catch {
      setAudioLoading(false);
    }
  }, [currentSoloToneId]);

  // ── Computer keyboard state ────────────────────────────────────────────
  const kbEnabled = useComputerKeyboardStore((s) => s.enabled);
  const kbOctave = useComputerKeyboardStore((s) => s.octave);
  const setKbEnabled = useComputerKeyboardStore((s) => s.setEnabled);
  const setKbOctave = useComputerKeyboardStore((s) => s.setOctave);
  const keyMap = useMemo(() => buildKeyMap(kbOctave), [kbOctave]);

  const keyboardEntries = useMemo(() => {
    return Object.entries(keyMap)
      .map(([key, midiNote]) => {
        const semitone = midiNote % 12;
        const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][
          semitone
        ]!;
        const oct = Math.floor(midiNote / 12) - 1;
        const isBlack = [1, 3, 6, 8, 10].includes(semitone);
        return { key, midiNote, label: `${noteName}${oct}`, isBlack };
      })
      .sort((a, b) => a.midiNote - b.midiNote);
  }, [keyMap]);

  const whiteKeys = keyboardEntries.filter((e) => !e.isBlack);
  const blackKeys = keyboardEntries.filter((e) => e.isBlack);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Загрузка настроек…
      </div>
    );
  }

  const perStyleOverridesObj = settings?.perStyleOverrides?.[currentStyle] as
    | Record<string, unknown>
    | undefined;
  const perStyleBpm = perStyleOverridesObj?.bpm as number | undefined;
  const currentBpm = perStyleBpm ?? styleProfile.defaultTempo;
  const perStyleSwing = perStyleOverridesObj?.swingRatio as number | undefined;
  const currentSwing = perStyleSwing ?? styleProfile.swingRatio;
  const metronomeOn = settings?.metronomeEnabled ?? true;
  const volumePct = Math.round((settings?.volume ?? 0.8) * 100);
  const metronomeVolumePct = Math.round((settings?.metronomeVolume ?? 0.8) * 100);
  const midiVolumePct = Math.round((settings?.soloVolume ?? 0.8) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">Стиль, инструменты, метроном и MIDI</p>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {/* ═══════════════════════════════════════════════════════════════════
          Tab: Основные
          ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'main' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Playback */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Воспроизведение
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Общая громкость</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">{volumePct}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[volumePct]}
                  onValueChange={(vals) => mutate({ volume: (vals[0] ?? 80) / 100 })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Metronome */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Метроном
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Включить метроном</Label>
                <Checkbox
                  checked={metronomeOn}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    mutate(
                      enabled
                        ? { metronomeEnabled: true }
                        : { metronomeEnabled: false, countIn: 0 },
                    );
                  }}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <Label className={`pt-2 text-sm ${metronomeOn ? '' : 'text-muted-foreground'}`}>
                  Затакт (тактов)
                </Label>
                <CountInControl
                  value={settings?.countIn ?? 1}
                  disabled={!metronomeOn}
                  onChange={(n) => mutate({ countIn: n })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={`text-sm ${metronomeOn ? '' : 'text-muted-foreground'}`}>
                    Громкость метронома
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {metronomeVolumePct}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  disabled={!metronomeOn}
                  value={[metronomeVolumePct]}
                  onValueChange={(vals) => mutate({ metronomeVolume: (vals[0] ?? 80) / 100 })}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label className={`text-sm ${metronomeOn ? '' : 'text-muted-foreground'}`}>
                  Режим
                </Label>
                <Select
                  value={settings?.metronomeMode ?? 'both'}
                  onValueChange={(v) => mutate({ metronomeMode: v as MetronomeMode })}
                  disabled={!metronomeOn}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRONOME_MODES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MODE_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {[
                {
                  name: 'clickStrong' as const,
                  label: 'Сильная доля (1)',
                  volKey: 'metronomeStrongVolume' as const,
                },
                {
                  name: 'clickStrong2' as const,
                  label: 'Вторая сильная (3)',
                  volKey: 'metronomeStrong2Volume' as const,
                },
                {
                  name: 'clickWeak' as const,
                  label: 'Слабая доля (2, 4)',
                  volKey: 'metronomeWeakVolume' as const,
                },
              ].map(({ name, label, volKey }) => {
                const beatVol = Math.round(((settings?.[volKey] as number) ?? 0.8) * 100);
                return (
                  <div key={name} className="space-y-2 border border-zinc-800 rounded-lg p-3">
                    <span
                      className={`text-sm font-medium ${metronomeOn ? '' : 'text-muted-foreground'}`}
                    >
                      {label}
                    </span>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">Звук</span>
                      <Select
                        value={settings?.[name] ?? NONE_VALUE}
                        onValueChange={(v) =>
                          mutate({
                            [name]: v === NONE_VALUE ? null : v,
                          } as Partial<UserSettingsDTO>)
                        }
                        disabled={!metronomeOn}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>—</SelectItem>
                          {METRONOME_SAMPLES.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Громкость</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {beatVol}%
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        disabled={!metronomeOn}
                        value={[beatVol]}
                        onValueChange={(vals) => mutate({ [volKey]: (vals[0] ?? 80) / 100 })}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Tab: Инструменты
          ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'instruments' && (
        <div className="flex flex-col gap-6">
          {/* Style toggles */}
          <section>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Стиль</h3>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((style) => (
                <Button
                  key={style}
                  variant={style === currentStyle ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStyleChange(style)}
                >
                  {STYLE_LABELS[style]}
                </Button>
              ))}
            </div>
          </section>

          {/* Style tile */}
          <Card>
            <CardContent className="space-y-5 pt-5">
              <div>
                <h3 className="text-lg font-semibold">{styleProfile.name}</h3>
                <p className="text-sm text-muted-foreground">{styleProfile.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Темп</span>
                <TempoControl value={currentBpm} onChange={handleBpmChange} />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-12">Свинг</span>
                <div className="flex-1">
                  <Slider
                    min={0.5}
                    max={0.75}
                    step={0.01}
                    value={[currentSwing]}
                    onValueChange={handleSwingChange}
                  />
                  <div className="flex justify-between mt-1 px-1">
                    {[
                      { v: 0.5, label: 'Straight' },
                      { v: 0.55, label: 'Лёгкий' },
                      { v: 0.6, label: 'Умеренный' },
                      { v: 0.65, label: 'Свинг' },
                      { v: 0.7, label: 'Глубокий' },
                      { v: 0.75, label: 'Шаффл' },
                    ].map(({ v, label }) => (
                      <span key={v} className="text-[10px] text-muted-foreground/50">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                  {currentSwing.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Сбросить
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instrument tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleInstruments.map((id) => (
              <InstrumentTile key={id} instrumentId={id} style={currentStyle} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Tab: Системные
          ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Аудио
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Формат сэмплов</Label>
                <Select
                  value={settings?.audioFormat ?? 'aac'}
                  onValueChange={(val) => mutate({ audioFormat: val as 'aac' | 'mp3' })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aac">AAC</SelectItem>
                    <SelectItem value="mp3">MP3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Интерфейс
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Тема</Label>
                <div className="flex overflow-hidden rounded-lg border border-border">
                  <Button
                    type="button"
                    variant={theme === 'light' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => theme !== 'light' && toggleTheme()}
                  >
                    Светлая
                  </Button>
                  <div className="w-px bg-border" />
                  <Button
                    type="button"
                    variant={theme === 'dark' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => theme !== 'dark' && toggleTheme()}
                  >
                    Тёмная
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Tab: MIDI
          ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'midi' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {/* MIDI-устройство */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                MIDI-устройство
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!midiInitAttempted && (
                <Button
                  type="button"
                  onClick={handleEnableMidi}
                  disabled={midiConnecting}
                  size="sm"
                  className="w-full"
                >
                  {midiConnecting ? 'Подключение…' : '🎹 Включить MIDI'}
                </Button>
              )}

              <MidiIndicator
                status={connectionStatus}
                flash={indicatorFlash}
                midiInitAttempted={midiInitAttempted}
              />

              {midiInitAttempted && availableDevices.length > 0 && (
                <MidiDeviceSelector
                  devices={availableDevices}
                  selectedDeviceId={settings?.midiDeviceId ?? null}
                  onSelectDevice={(deviceId) => {
                    selectDevice(deviceId);
                    mutate({ midiDeviceId: deviceId ?? undefined });
                  }}
                />
              )}
              {midiInitAttempted && availableDevices.length === 0 && (
                <p className="text-xs text-muted-foreground">MIDI-устройства не обнаружены.</p>
              )}
            </CardContent>
          </Card>

          {/* MIDI-канал */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                MIDI-канал
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={(settings?.midiChannel ?? 0).toString()}
                onValueChange={(v) => mutate({ midiChannel: parseInt(v, 10) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 16 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Канал {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">Фильтр MIDI-канала (0–15).</p>
            </CardContent>
          </Card>

          {/* Соло-тембр */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Соло-тембр
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={settings?.soloToneId ?? 'rhodes-jrhodes3c'}
                onValueChange={(v) => {
                  // Apply immediately for instant audio feedback
                  const host = getSoloHost();
                  try {
                    host?.selectTone(v);
                  } catch {
                    /* will sync via settings */
                  }
                  mutate({ soloToneId: v === 'rhodes-jrhodes3c' ? undefined : v });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLO_INSTRUMENT_MANIFESTS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                Тембр соло-инструмента по умолчанию.
              </p>
            </CardContent>
          </Card>

          {/* Громкость соло */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Громкость соло
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Громкость</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {midiVolumePct}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[midiVolumePct]}
                  onValueChange={(vals) => mutate({ soloVolume: (vals[0] ?? 80) / 100 })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ducking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Ducking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Приглушать аккомпанемент при соло</Label>
                <Checkbox
                  checked={settings?.duckingEnabled ?? false}
                  onChange={(e) => mutate({ duckingEnabled: e.target.checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Тест звука */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Тест звука
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                disabled={audioLoading}
                onClick={handleTestSound}
                size="sm"
                className="w-full"
              >
                {audioLoading ? 'Загрузка…' : '▶ Прослушать'}
              </Button>
              {previewError && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {previewError}. Использован синтезатор по умолчанию.
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Проиграть арпеджио Cmaj7 выбранным тембром.
              </p>
            </CardContent>
          </Card>

          {/* Клавиатура компьютера */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Клавиатура компьютера
                </CardTitle>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={kbEnabled} onChange={(e) => setKbEnabled(e.target.checked)} />
                  <span className="text-xs text-muted-foreground">
                    {kbEnabled ? 'Вкл' : 'Выкл'}
                  </span>
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs shrink-0">Октава:</span>
                <select
                  value={kbOctave}
                  onChange={(e) => setKbOctave(Number(e.target.value))}
                  disabled={!kbEnabled}
                  className="rounded border bg-background px-2 py-1 text-xs"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((o) => (
                    <option key={o} value={o}>
                      C{o} – C{o + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div
                  className="flex h-8 items-end"
                  style={{ paddingLeft: '1.05rem', paddingRight: '0.75rem' }}
                >
                  {blackKeys.map((e) => (
                    <div
                      key={e.key}
                      className="flex flex-1 flex-col items-center justify-end rounded-t bg-muted-foreground/30 pb-0.5 text-[10px] leading-tight"
                      style={{ marginLeft: 3, marginRight: 3, minWidth: 0 }}
                    >
                      <span className="font-medium text-muted-foreground">
                        {e.key.toUpperCase()}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">{e.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex h-12">
                  {whiteKeys.map((e) => (
                    <div
                      key={e.key}
                      className="flex flex-1 flex-col items-center justify-end rounded-b border border-border bg-background pb-1"
                    >
                      <span className="text-xs font-medium">{e.key.toUpperCase()}</span>
                      <span className="text-[10px] text-muted-foreground/60">{e.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Используйте клавиши на клавиатуре ноутбука для игры нот. Не работает, когда фокус в
                поле ввода.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
