import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RotateCcw, Plus, Minus } from 'lucide-react';
import type { Style, MetronomeMode, DefaultSettingsDTO } from '@jazz/shared';
import { STYLES, METRONOME_MODES } from '@jazz/shared';
import { apiClient, usePermission } from '@jazz/plugin-sdk';
import {
  METRONOME_SAMPLES,
  getStyleProfile,
  getBassOrganismsForStyle,
  getPianoOrganismsForStyle,
  getRhodesOrganismsForStyle,
  getOrganismsForStyle,
  getPercussionOrganismsForStyle,
} from '@jazz/music-core';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  useClampedNumberInput,
  clampNumber,
} from '@jazz/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLE_LABELS: Record<Style, string> = {
  swing: 'Swing',
  bossa: 'Bossa Nova',
  funk: 'Funk',
  latin: 'Latin',
  ballad: 'Ballad',
  blues: 'Blues',
  soul: 'Soul',
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
] as const;

type TabId = (typeof TABS)[number]['id'];

const ADMIN_DEFAULTS_KEY = ['admin', 'default-settings'] as const;
const VOICING_DENSITIES = ['shell2', 'rootless3', 'rootless4', 'quartal'] as const;
const TENSION_OPTIONS = ['clean', 'moderate', 'altered', 'max'] as const;
const HUMANIZE_LEVELS = ['none', 'low', 'medium', 'high'] as const;
const HUMANIZE_VELOCITY = ['off', 'light', 'medium', 'strong'] as const;
const HUMANIZE_PHRASING = ['flat', 'gentle', 'expressive'] as const;
const HUMANIZE_INTENSITY = ['off', 'low', 'med', 'high'] as const;
const BASS_RANGE_OPTIONS = ['narrow', 'medium', 'wide'] as const;
const RHODES_MODES = [
  'wholeNotes', 'halfNotes', 'quarterNotes', 'charleston', 'reverse-charleston',
  'basie-2-4', 'offbeat-2-4', 'anticipation-4and', 'one-twoand-four',
  'oneand-three', 'twoand-only', 'four-and-sparse', 'two-threeand',
] as const;
const RHODES_LAYER_MODES = [
  'pads', 'subtle-offbeats', 'high-comping', 'ambient-swells', 'stab-accents', 'none',
] as const;
const NONE_VALUE = '__none__';
const BASS_COMPLEXITY_OPTIONS = [
  { value: 1, label: '1 — Минимальная' },
  { value: 2, label: '2 — Очень простая' },
  { value: 3, label: '3 — Простая' },
  { value: 4, label: '4 — Средняя' },
  { value: 5, label: '5 — Умеренная' },
  { value: 6, label: '6 — Сложная' },
  { value: 7, label: '7 — Максимальная' },
] as const;
const DRUM_KIT_OPTIONS = ['jazz-drum-kit', 'funk-drum-kit'] as const;

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

function TempoControl({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (v: number) => void }) {
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
        disabled={disabled}
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
        disabled={disabled}
        className="w-[72px] text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        variant="outline"
        size="icon"
        className="size-7"
        disabled={disabled}
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
  disabled: boolean;
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



// ─── Shared controls ───────────────────────────────────────────────────────────

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function SettingSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm">{label}</Label>
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function VolSlider({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Громкость</Label>
        <span className="text-sm tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        value={[pct]}
        onValueChange={(v) => onChange((v[0] ?? 70) / 100)}
      />
    </div>
  );
}

// ─── Per-style override helpers ────────────────────────────────────────────────

type StyleOverrides = Record<string, Record<string, unknown>>;

function readPerStyle(
  settings: DefaultSettingsDTO,
  style: Style,
  key: string,
  fallback: unknown,
): unknown {
  const overrides = settings.perStyleOverrides?.[style] as Record<string, unknown> | undefined;
  if (overrides && key in overrides) return overrides[key];
  return (settings as Record<string, unknown>)[key] ?? fallback;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function DefaultsPage() {
  const canWrite = usePermission('system:settings:write');
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('main');
  const [previewStyle, setPreviewStyle] = useState<Style>('swing');

  const { data: settings, isLoading } = useQuery({
    queryKey: ADMIN_DEFAULTS_KEY,
    queryFn: () => apiClient.get<DefaultSettingsDTO>('/api/admin/default-settings'),
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<DefaultSettingsDTO>) =>
      apiClient.put<DefaultSettingsDTO>('/api/admin/default-settings', patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ADMIN_DEFAULTS_KEY });
      const previous = qc.getQueryData<DefaultSettingsDTO>(ADMIN_DEFAULTS_KEY);
      if (previous) {
        qc.setQueryData<DefaultSettingsDTO>(ADMIN_DEFAULTS_KEY, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(ADMIN_DEFAULTS_KEY, ctx.previous);
    },
    onSuccess: (data) => {
      qc.setQueryData<DefaultSettingsDTO>(ADMIN_DEFAULTS_KEY, data);
      // Invalidate public cache so guests pick up changes immediately
      qc.invalidateQueries({ queryKey: ['default-settings'] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => apiClient.post<DefaultSettingsDTO>('/api/admin/default-settings/reset'),
    onSuccess: (data) => {
      qc.setQueryData<DefaultSettingsDTO>(ADMIN_DEFAULTS_KEY, data);
      qc.invalidateQueries({ queryKey: ['default-settings'] });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      const mySettings = await apiClient.get<Record<string, unknown>>('/api/settings');
      // Strip personal fields: practiceCards, midiDeviceId, midiChannel
      const { practiceCards: _pc, midiDeviceId: _md, midiChannel: _mc, ...defaults } = mySettings;
      return apiClient.put<DefaultSettingsDTO>('/api/admin/default-settings', defaults as Partial<DefaultSettingsDTO>);
    },
    onSuccess: (data) => {
      qc.setQueryData<DefaultSettingsDTO>(ADMIN_DEFAULTS_KEY, data);
      qc.invalidateQueries({ queryKey: ['default-settings'] });
    },
  });

  const mutate = useCallback(
    (patch: Partial<DefaultSettingsDTO>) => {
      if (!canWrite) return;
      updateMutation.mutate(patch);
    },
    [canWrite, updateMutation],
  );

  const mutatePerStyle = useCallback(
    (key: string, value: unknown) => {
      if (!settings) return;
      const overrides: StyleOverrides = {
        ...((settings.perStyleOverrides ?? {}) as StyleOverrides),
      };
      const styleOverrides = { ...(overrides[previewStyle] ?? {}) };
      styleOverrides[key] = value;
      overrides[previewStyle] = styleOverrides;
      mutate({ perStyleOverrides: overrides } as Partial<DefaultSettingsDTO>);
    },
    [settings, previewStyle, mutate],
  );

  const mutatePerStyleHumanize = useCallback(
    (key: string, subPatch: Record<string, string>) => {
      if (!settings) return;
      const overrides: StyleOverrides = {
        ...((settings.perStyleOverrides ?? {}) as StyleOverrides),
      };
      const styleOverrides = { ...(overrides[previewStyle] ?? {}) };
      const current = (styleOverrides[key] as Record<string, string> | undefined) ?? {};
      styleOverrides[key] = { ...current, ...subPatch };
      overrides[previewStyle] = styleOverrides;
      mutate({ perStyleOverrides: overrides } as Partial<DefaultSettingsDTO>);
    },
    [settings, previewStyle, mutate],
  );

  if (isLoading || !settings) {
    return (
      <div className="flex h-full items-center justify-center gap-2 bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Загрузка настроек по умолчанию…
      </div>
    );
  }

  const volumePct = Math.round((settings.volume ?? 0.8) * 100);
  const metronomeOn = settings.metronomeEnabled ?? true;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Настройки по умолчанию</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Заводские значения для новых и гостевых пользователей
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canWrite || copyMutation.isPending}
            onClick={() => copyMutation.mutate()}
          >
            {copyMutation.isPending ? 'Копирование…' : 'Скопировать из моих настроек'}
          </Button>

          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!canWrite || resetMutation.isPending}>
              <RotateCcw className="size-4 mr-2" />
              Сбросить к заводским
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Сбросить к заводским настройкам?</AlertDialogTitle>
              <AlertDialogDescription>
                Все переопределения будут удалены. Значения вернутся к профилям стилей. Существующих
                пользователей это не затронет.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
              >
                Сбросить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </div>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="py-3 text-sm text-amber-700 dark:text-amber-300">
          Эти настройки будут применяться для всех новых пользователей. Существующих пользователей
          изменения не затронут.
        </CardContent>
      </Card>

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
                  disabled={!canWrite}
                  value={[volumePct]}
                  onValueChange={(v) => mutate({ volume: (v[0] ?? 80) / 100 })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Отсчёт (тактов)</Label>
                <CountInControl
                  value={settings.countIn ?? 1}
                  disabled={!canWrite}
                  onChange={(v) => mutate({ countIn: v })}
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
                  disabled={!canWrite}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    if (enabled && (settings.countIn ?? 1) === 0) {
                      mutate({ metronomeEnabled: enabled, countIn: 1 });
                    } else if (!enabled) {
                      mutate({ metronomeEnabled: enabled, countIn: 0 });
                    } else {
                      mutate({ metronomeEnabled: enabled });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={`text-sm ${metronomeOn ? '' : 'text-muted-foreground'}`}>
                    Громкость метронома
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((settings.metronomeVolume ?? 0.8) * 100)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  disabled={!canWrite || !metronomeOn}
                  value={[Math.round((settings.metronomeVolume ?? 0.8) * 100)]}
                  onValueChange={(v) => mutate({ metronomeVolume: (v[0] ?? 80) / 100 })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label className={`text-sm ${metronomeOn ? '' : 'text-muted-foreground'}`}>
                  Режим
                </Label>
                <Select
                  value={settings.metronomeMode ?? 'both'}
                  disabled={!canWrite || !metronomeOn}
                  onValueChange={(v) => mutate({ metronomeMode: v as MetronomeMode })}
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

              {/* Per-beat metronome settings */}
              {([
                { key: 'clickStrong', label: 'Сильная доля (1)', volKey: 'metronomeStrongVolume' as const, enKey: 'metronomeStrongEnabled' as const },
                { key: 'clickStrong2', label: 'Вторая сильная (3)', volKey: 'metronomeStrong2Volume' as const, enKey: 'metronomeStrong2Enabled' as const },
                { key: 'clickWeak', label: 'Слабая доля (2, 4)', volKey: 'metronomeWeakVolume' as const, enKey: 'metronomeWeakEnabled' as const },
              ]).map(({ key, label, volKey, enKey }) => {
                const beatVol = Math.round(((settings[volKey as keyof DefaultSettingsDTO] as number) ?? 0.8) * 100);
                const soundValue = (settings[key as keyof DefaultSettingsDTO] as string | undefined) ?? NONE_VALUE;
                const beatEnabled = (settings[enKey as keyof DefaultSettingsDTO] as boolean) ?? true;
                return (
                  <div key={key} className="space-y-2 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${metronomeOn ? '' : 'text-muted-foreground'}`}>
                        {label}
                      </span>
                      <Checkbox
                        checked={beatEnabled}
                        disabled={!canWrite || !metronomeOn}
                        onChange={(e) =>
                          mutate({ [enKey]: e.target.checked } as Partial<DefaultSettingsDTO>)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">Звук</span>
                      <Select
                        value={soundValue}
                        disabled={!canWrite || !metronomeOn || !beatEnabled}
                        onValueChange={(v) =>
                          mutate({ [key]: v === NONE_VALUE ? null : v } as Partial<DefaultSettingsDTO>)
                        }
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
                        <span className="text-xs tabular-nums text-muted-foreground">{beatVol}%</span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        disabled={!canWrite || !metronomeOn || !beatEnabled}
                        value={[beatVol]}
                        onValueChange={(vals) =>
                          mutate({ [volKey]: (vals[0] ?? 80) / 100 } as Partial<DefaultSettingsDTO>)
                        }
                      />
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Аудио формат</Label>
                <Select
                  value={settings.audioFormat ?? 'aac'}
                  disabled={!canWrite}
                  onValueChange={(v) => mutate({ audioFormat: v as 'aac' | 'mp3' })}
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
              {STYLES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={previewStyle === s ? 'default' : 'outline'}
                  onClick={() => setPreviewStyle(s)}
                >
                  {STYLE_LABELS[s]}
                </Button>
              ))}
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            Все настройки ниже — per-style. При переключении стиля значения меняются.
          </p>

          {/* Per-style tempo & swing card */}
          <Card>
            <CardContent className="space-y-5 pt-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Темп</span>
                <TempoControl
                  value={(readPerStyle(settings, previewStyle, 'bpm', getStyleProfile(previewStyle).defaultTempo) as number)}
                  disabled={!canWrite}
                  onChange={(v) => mutatePerStyle('bpm', v)}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-12">Свинг</span>
                <div className="flex-1">
                  <Slider
                    min={0.5}
                    max={0.75}
                    step={0.01}
                    disabled={!canWrite}
                    value={[(readPerStyle(settings, previewStyle, 'swingRatio', settings.swingRatio ?? 0.5) as number)]}
                    onValueChange={(v) => mutatePerStyle('swingRatio', v[0])}
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
                      <span key={v} className="text-[10px] text-muted-foreground/50">{label}</span>
                    ))}
                  </div>
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                  {(readPerStyle(settings, previewStyle, 'swingRatio', settings.swingRatio ?? 0.5) as number).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BassCard
              settings={settings}
              style={previewStyle}
              disabled={!canWrite}
              onMutate={mutatePerStyle}
              onMutateHumanize={mutatePerStyleHumanize}
            />
            <PianoCard
              settings={settings}
              style={previewStyle}
              disabled={!canWrite}
              onMutate={mutatePerStyle}
              onMutateHumanize={mutatePerStyleHumanize}
            />
            <RhodesCard
              settings={settings}
              style={previewStyle}
              disabled={!canWrite}
              onMutate={mutatePerStyle}
            />
            <DrumsCard
              settings={settings}
              style={previewStyle}
              disabled={!canWrite}
              onMutate={mutatePerStyle}
            />
            <PercussionCard
              settings={settings}
              style={previewStyle}
              disabled={!canWrite}
              onMutate={mutatePerStyle}
            />
            <GuitarCard
              settings={settings}
              style={previewStyle}
              disabled={!canWrite}
              onMutate={mutatePerStyle}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Tab: Системные
          ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'system' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Соло-инструмент
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="ID соло-тембра">
              <Input
                type="text"
                value={settings.soloToneId ?? ''}
                disabled={!canWrite}
                onChange={(e) => mutate({ soloToneId: e.target.value || undefined })}
                className="w-64 text-right"
              />
            </SettingRow>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Громкость соло</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {Math.round((settings.soloVolume ?? 0.8) * 100)}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                disabled={!canWrite}
                value={[Math.round((settings.soloVolume ?? 0.8) * 100)]}
                onValueChange={(v) => mutate({ soloVolume: (v[0] ?? 80) / 100 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Ducking (приглушение под соло)</Label>
              <Checkbox
                checked={settings.duckingEnabled ?? false}
                disabled={!canWrite}
                onChange={(e) => mutate({ duckingEnabled: e.target.checked })}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════
// Instrument cards (compact, matching user settings InstrumentTile style)
// ═══════════════════════════════════════════════════════════════════════════════════


// ─── Pattern select dropdown ──────────────────────────────────────────────────

function PatternSelect({
  value,
  disabled,
  organisms,
  onChange,
}: {
  value: string | null;
  disabled: boolean;
  organisms: { value: string; label: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <Select
      value={value ?? '__auto__'}
      disabled={disabled}
      onValueChange={(v) => onChange(v === '__auto__' ? null : v)}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__auto__">Авто</SelectItem>
        {organisms.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BassCard({
  settings,
  style,
  disabled,
  onMutate,
  onMutateHumanize,
}: {
  settings: DefaultSettingsDTO;
  style: Style;
  disabled: boolean;
  onMutate: (key: string, value: unknown) => void;
  onMutateHumanize: (key: string, subPatch: Record<string, string>) => void;
}) {
  const $ = (k: string, fb: unknown) => readPerStyle(settings, style, k, fb);
  const h = ($('bassHumanize', {}) ?? {}) as Record<string, string>;
  const enabled = ($('bassEnabled', true) as boolean);

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Бас</CardTitle>
          <Button
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            onClick={() => onMutate('bassEnabled', !enabled)}
            className="h-7 text-xs"
          >
            {enabled ? 'Вкл' : 'Выкл'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <VolSlider
          value={($('bassVolume', 0.7) as number) ?? 0.7}
          disabled={disabled}
          onChange={(v) => onMutate('bassVolume', v)}
        />
        <SettingRow label="Сложность">
          <Select
            value={String(($('bassComplexity', 1) as number) ?? 1)}
            disabled={disabled}
            onValueChange={(v) => onMutate('bassComplexity', Number(v))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BASS_COMPLEXITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingSelect label="Tension" value={($('bassTension', 'clean') as string) ?? 'clean'} options={TENSION_OPTIONS} disabled={disabled} onChange={(v) => onMutate('bassTension', v)} />
        <SettingSelect label="Вариант" value={($('bassVariant', 'upright') as string) ?? 'upright'} options={['upright', 'electric']} disabled={disabled} onChange={(v) => onMutate('bassVariant', v)} />
        <SettingSelect label="Диапазон" value={($('bassRange', 'medium') as string) ?? 'medium'} options={BASS_RANGE_OPTIONS} disabled={disabled} onChange={(v) => onMutate('bassRange', v)} />
        <SettingRow label="Паттерн">
          <PatternSelect
            value={($('bassPattern', null) as string | null)}
            disabled={disabled}
            organisms={useMemo(() => getBassOrganismsForStyle(style).map(o => ({ value: o.id, label: o.label })), [style])}
            onChange={(v) => onMutate('bassPattern', v)}
          />
        </SettingRow>
        <SettingRow label="Muted notes">
          <Checkbox checked={($('bassUseMutedNotes', true) as boolean)} disabled={disabled} onChange={(e) => onMutate('bassUseMutedNotes', e.target.checked)} />
        </SettingRow>
        <div className="border-t border-border pt-3">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Humanize</Label>
          <div className="mt-2 space-y-2">
            <SettingSelect label="Timing" value={h.timingJitterMs ?? 'none'} options={HUMANIZE_LEVELS} disabled={disabled} onChange={(v) => onMutateHumanize('bassHumanize', { timingJitterMs: v })} />
            <SettingSelect label="Velocity" value={h.velocityVariation ?? 'off'} options={HUMANIZE_VELOCITY} disabled={disabled} onChange={(v) => onMutateHumanize('bassHumanize', { velocityVariation: v })} />
            <SettingSelect label="Phrasing" value={h.phrasing ?? 'flat'} options={HUMANIZE_PHRASING} disabled={disabled} onChange={(v) => onMutateHumanize('bassHumanize', { phrasing: v })} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PianoCard({
  settings,
  style,
  disabled,
  onMutate,
  onMutateHumanize,
}: {
  settings: DefaultSettingsDTO;
  style: Style;
  disabled: boolean;
  onMutate: (key: string, value: unknown) => void;
  onMutateHumanize: (key: string, subPatch: Record<string, string>) => void;
}) {
  const $ = (k: string, fb: unknown) => readPerStyle(settings, style, k, fb);
  const h = ($('pianoHumanize', {}) ?? {}) as Record<string, string>;
  const enabled = ($('pianoEnabled', false) as boolean);

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Фортепиано</CardTitle>
          <Button
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            onClick={() => onMutate('pianoEnabled', !enabled)}
            className="h-7 text-xs"
          >
            {enabled ? 'Вкл' : 'Выкл'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <VolSlider
          value={($('pianoVolume', 0.7) as number) ?? 0.7}
          disabled={disabled}
          onChange={(v) => onMutate('pianoVolume', v)}
        />
        <SettingRow label="Паттерн">
          <PatternSelect
            value={($('pianoPattern', null) as string | null)}
            disabled={disabled}
            organisms={useMemo(() => getPianoOrganismsForStyle(style).map(o => ({ value: o.id, label: o.label })), [style])}
            onChange={(v) => onMutate('pianoPattern', v)}
          />
        </SettingRow>
        <SettingSelect label="Voicing" value={($('pianoVoicingDensity', 'rootless3') as string) ?? 'rootless3'} options={VOICING_DENSITIES} disabled={disabled} onChange={(v) => onMutate('pianoVoicingDensity', v)} />
        <SettingSelect label="Сэмплы" value={($('pianoSampleLibrary', 'salamander') as string) ?? 'salamander'} options={['salamander', 'upright']} disabled={disabled} onChange={(v) => onMutate('pianoSampleLibrary', v)} />
        <SettingSelect label="Tension" value={($('pianoTension', 'clean') as string) ?? 'clean'} options={TENSION_OPTIONS} disabled={disabled} onChange={(v) => onMutate('pianoTension', v)} />
        <SettingSelect label="Randomize" value={($('pianoRandomizationLevel', 'off') as string) ?? 'off'} options={['off', 'subtle', 'moderate', 'high']} disabled={disabled} onChange={(v) => onMutate('pianoRandomizationLevel', v)} />
        <div className="border-t border-border pt-3">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Humanize</Label>
          <div className="mt-2 space-y-2">
            <SettingSelect label="Timing" value={h.timingJitterMs ?? 'none'} options={HUMANIZE_LEVELS} disabled={disabled} onChange={(v) => onMutateHumanize('pianoHumanize', { timingJitterMs: v })} />
            <SettingSelect label="Velocity" value={h.velocityVariation ?? 'off'} options={HUMANIZE_VELOCITY} disabled={disabled} onChange={(v) => onMutateHumanize('pianoHumanize', { velocityVariation: v })} />
            <SettingSelect label="Chord spread" value={h.chordSpreadMs ?? 'none'} options={HUMANIZE_LEVELS} disabled={disabled} onChange={(v) => onMutateHumanize('pianoHumanize', { chordSpreadMs: v })} />
            <SettingSelect label="Phrasing" value={h.phrasing ?? 'flat'} options={HUMANIZE_PHRASING} disabled={disabled} onChange={(v) => onMutateHumanize('pianoHumanize', { phrasing: v })} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RhodesCard({
  settings,
  style,
  disabled,
  onMutate,
}: {
  settings: DefaultSettingsDTO;
  style: Style;
  disabled: boolean;
  onMutate: (key: string, value: unknown) => void;
}) {
  const $ = (k: string, fb: unknown) => readPerStyle(settings, style, k, fb);
  const enabled = ($('rhodesEnabled', false) as boolean);

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Rhodes</CardTitle>
          <Button
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            onClick={() => onMutate('rhodesEnabled', !enabled)}
            className="h-7 text-xs"
          >
            {enabled ? 'Вкл' : 'Выкл'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <VolSlider
          value={($('rhodesVolume', 0.6) as number) ?? 0.6}
          disabled={disabled}
          onChange={(v) => onMutate('rhodesVolume', v)}
        />
        <SettingRow label="Паттерн">
          <PatternSelect
            value={($('rhodesPattern', null) as string | null)}
            disabled={disabled}
            organisms={useMemo(() => getRhodesOrganismsForStyle(style).map(o => ({ value: o.id, label: o.label })), [style])}
            onChange={(v) => onMutate('rhodesPattern', v)}
          />
        </SettingRow>
        <SettingSelect label="Voicing" value={($('rhodesVoicingDensity', 'rootless3') as string) ?? 'rootless3'} options={VOICING_DENSITIES} disabled={disabled} onChange={(v) => onMutate('rhodesVoicingDensity', v)} />
        <SettingSelect label="Режим" value={($('rhodesMode', 'halfNotes') as string) ?? 'halfNotes'} options={RHODES_MODES} disabled={disabled} onChange={(v) => onMutate('rhodesMode', v)} />
        <SettingSelect label="Layer" value={($('rhodesLayerMode', 'none') as string) ?? 'none'} options={RHODES_LAYER_MODES} disabled={disabled} onChange={(v) => onMutate('rhodesLayerMode', v)} />
        <VolSlider
          value={($('rhodesLayerVolume', 0.5) as number) ?? 0.5}
          disabled={disabled}
          onChange={(v) => onMutate('rhodesLayerVolume', v)}
        />
      </CardContent>
    </Card>
  );
}

function DrumsCard({
  settings,
  style,
  disabled,
  onMutate,
}: {
  settings: DefaultSettingsDTO;
  style: Style;
  disabled: boolean;
  onMutate: (key: string, value: unknown) => void;
}) {
  const $ = (k: string, fb: unknown) => readPerStyle(settings, style, k, fb);
  const enabled = ($('drumsEnabled', true) as boolean);

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Ударные</CardTitle>
          <Button
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            onClick={() => onMutate('drumsEnabled', !enabled)}
            className="h-7 text-xs"
          >
            {enabled ? 'Вкл' : 'Выкл'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <VolSlider
          value={($('drumsVolume', 0.7) as number) ?? 0.7}
          disabled={disabled}
          onChange={(v) => onMutate('drumsVolume', v)}
        />
        <SettingSelect label="Кит" value={($('drumKit', 'jazz-drum-kit') as string) ?? 'jazz-drum-kit'} options={DRUM_KIT_OPTIONS} disabled={disabled} onChange={(v) => onMutate('drumKit', v)} />
        <SettingRow label="Паттерн">
          <PatternSelect
            value={($('drumsPattern', null) as string | null)}
            disabled={disabled}
            organisms={useMemo(() => getOrganismsForStyle(style).map(o => ({ value: o.id, label: o.label })), [style])}
            onChange={(v) => onMutate('drumsPattern', v)}
          />
        </SettingRow>
        <SettingSelect label="Humanize" value={($('drumsHumanizeIntensity', 'off') as string) ?? 'off'} options={HUMANIZE_INTENSITY} disabled={disabled} onChange={(v) => onMutate('drumsHumanizeIntensity', v)} />
      </CardContent>
    </Card>
  );
}

function PercussionCard({
  settings,
  style,
  disabled,
  onMutate,
}: {
  settings: DefaultSettingsDTO;
  style: Style;
  disabled: boolean;
  onMutate: (key: string, value: unknown) => void;
}) {
  const $ = (k: string, fb: unknown) => readPerStyle(settings, style, k, fb);
  const enabled = ($('percussionEnabled', false) as boolean);

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Перкуссия</CardTitle>
          <Button
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            onClick={() => onMutate('percussionEnabled', !enabled)}
            className="h-7 text-xs"
          >
            {enabled ? 'Вкл' : 'Выкл'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <VolSlider
          value={($('percussionVolume', 0.7) as number) ?? 0.7}
          disabled={disabled}
          onChange={(v) => onMutate('percussionVolume', v)}
        />
        <SettingRow label="Паттерн">
          <PatternSelect
            value={($('percussionPattern', null) as string | null)}
            disabled={disabled}
            organisms={useMemo(() => getPercussionOrganismsForStyle(style).map(o => ({ value: o.id, label: o.label })), [style])}
            onChange={(v) => onMutate('percussionPattern', v)}
          />
        </SettingRow>
        <SettingSelect label="Humanize" value={($('percussionHumanizeIntensity', 'off') as string) ?? 'off'} options={HUMANIZE_INTENSITY} disabled={disabled} onChange={(v) => onMutate('percussionHumanizeIntensity', v)} />
      </CardContent>
    </Card>
  );
}

function GuitarCard({
  settings,
  style,
  disabled,
  onMutate,
}: {
  settings: DefaultSettingsDTO;
  style: Style;
  disabled: boolean;
  onMutate: (key: string, value: unknown) => void;
}) {
  const $ = (k: string, fb: unknown) => readPerStyle(settings, style, k, fb);
  const enabled = ($('guitarEnabled', false) as boolean);

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Гитара</CardTitle>
          <Button
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            onClick={() => onMutate('guitarEnabled', !enabled)}
            className="h-7 text-xs"
          >
            {enabled ? 'Вкл' : 'Выкл'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <VolSlider
          value={($('guitarVolume', 0.7) as number) ?? 0.7}
          disabled={disabled}
          onChange={(v) => onMutate('guitarVolume', v)}
        />
      </CardContent>
    </Card>
  );
}

export default DefaultsPage;
