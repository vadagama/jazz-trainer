import * as React from 'react';
import { useEffect, useState } from 'react';
import { useForm, Controller, useController, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserSettingsDTOSchema, type UserSettingsDTO } from '@jazz/shared';
import { METRONOME_SAMPLES, INSTRUMENT_GROUPS } from '@jazz/music-core';
import { useClampedNumberInput } from '@jazz/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LiveMidiControls } from '@/components/midi/LiveMidiControls';
import { ComputerKeyboardSettings } from '@/components/settings/ComputerKeyboardSettings';

interface Props {
  defaultValues: UserSettingsDTO;
  onSave: (data: UserSettingsDTO) => void | Promise<void>;
  themeControl?: React.ReactNode;
}

const NONE_VALUE = '__none__';

interface ClampedNumberFieldProps {
  control: Control<UserSettingsDTO>;
  name: 'bpm' | 'countIn';
  min: number;
  max: number;
  id: string;
  className?: string;
}

function ClampedNumberField({ control, name, min, max, id, className }: ClampedNumberFieldProps) {
  const { field } = useController({ control, name });
  const { text, onChange, onBlur, onKeyDown } = useClampedNumberInput({
    value: field.value ?? min,
    onCommit: field.onChange,
    min,
    max,
  });

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={text}
      onChange={onChange}
      onBlur={() => {
        onBlur();
        field.onBlur();
      }}
      onKeyDown={onKeyDown}
      className={className}
    />
  );
}

const BEAT_ROWS = [
  { name: 'clickStrong' as const, label: 'Первая сильная доля' },
  { name: 'clickStrong2' as const, label: 'Вторая сильная доля' },
  { name: 'clickWeak' as const, label: 'Слабая доля' },
];

export function SettingsForm({ defaultValues, onSave, themeControl }: Props) {
  const form = useForm<UserSettingsDTO>({
    resolver: zodResolver(UserSettingsDTOSchema),
    defaultValues,
  });

  const savedRef = React.useRef(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const previewTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  function clearPreviewTimers() {
    for (const t of previewTimersRef.current) clearTimeout(t);
    previewTimersRef.current = [];
  }

  const doSave = React.useCallback(
    (data: UserSettingsDTO) => {
      savedRef.current = true;
      onSave(data);
    },
    [onSave],
  );

  // Cleanup preview timers on unmount
  useEffect(() => {
    return () => clearPreviewTimers();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    savedRef.current = false;
    const { unsubscribe } = form.watch(() => {
      clearTimeout(timer);
      savedRef.current = false;
      timer = setTimeout(() => {
        form.handleSubmit(doSave, (errors) => {
          console.warn('[SettingsForm] validation failed:', errors);
        })();
      }, 300);
    });
    return () => {
      clearTimeout(timer);
      // Flush pending save on unmount if form is dirty and not already saved
      if (form.formState.isDirty && !savedRef.current) {
        form.handleSubmit(doSave, (errors) => {
          console.warn('[SettingsForm] validation failed on unmount:', errors);
        })();
      }
      unsubscribe();
    };
  }, [form, onSave, doSave]);

  const volumePct = Math.round((form.watch('volume') ?? 0.8) * 100);
  const metronomeVolumePct = Math.round((form.watch('metronomeVolume') ?? 0.8) * 100);
  const metronomeOn = form.watch('metronomeEnabled') ?? true;
  const bassOn = form.watch('bassEnabled') ?? true;
  const rhodesOn = form.watch('rhodesEnabled') ?? false;
  const pianoOn = form.watch('pianoEnabled') ?? false;
  const drumsOn = form.watch('drumsEnabled') ?? true;
  const drumKitName =
    INSTRUMENT_GROUPS.find((g) => g.id === 'drums')?.variants.find(
      (v) => v.instrumentId === (form.watch('drumKit') ?? 'jazz-drum-kit'),
    )?.name ?? 'Drum Kit';

  return (
    <div className="space-y-6">
      <Tabs defaultValue="main">
        <TabsList>
          <TabsTrigger value="main" className="flex-1">
            Основные
          </TabsTrigger>
          <TabsTrigger value="instruments" className="flex-1">
            Инструменты
          </TabsTrigger>
          <TabsTrigger value="system" className="flex-1">
            Системные
          </TabsTrigger>
          <TabsTrigger value="midi" className="flex-1">
            MIDI
          </TabsTrigger>
        </TabsList>

        {/* ── Основные ── */}
        <TabsContent
          value="main"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
        >
          {/* Воспроизведение */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Воспроизведение
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">Общая громкость</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">{volumePct}%</span>
                </div>
                <Controller
                  control={form.control}
                  name="volume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[Math.round((field.value ?? 0.8) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 80) / 100)}
                    />
                  )}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <Label htmlFor="bpm" className="pt-2 text-sm text-foreground">
                  BPM
                </Label>
                <div className="flex flex-col items-end gap-1">
                  <ClampedNumberField
                    control={form.control}
                    name="bpm"
                    min={20}
                    max={400}
                    id="bpm"
                    className="w-24 text-right"
                  />
                  {form.formState.errors.bpm && (
                    <p className="text-xs text-destructive">{form.formState.errors.bpm.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <Label htmlFor="countIn" className="pt-2 text-sm text-foreground">
                  Count-in (тактов)
                </Label>
                <div className="flex flex-col items-end gap-1">
                  <ClampedNumberField
                    control={form.control}
                    name="countIn"
                    min={0}
                    max={4}
                    id="countIn"
                    className="w-24 text-right"
                  />
                  {form.formState.errors.countIn && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.countIn.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Метроном */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Метроном
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="metronomeEnabled" className="text-sm text-foreground">
                  Включить метроном
                </Label>
                <Controller
                  control={form.control}
                  name="metronomeEnabled"
                  render={({ field }) => (
                    <input
                      id="metronomeEnabled"
                      type="checkbox"
                      checked={field.value ?? true}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        field.onChange(enabled);
                        if (!enabled) form.setValue('countIn', 0);
                      }}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${metronomeOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость метронома
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {metronomeVolumePct}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="metronomeVolume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      disabled={!metronomeOn}
                      value={[Math.round((field.value ?? 0.8) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 80) / 100)}
                    />
                  )}
                />
              </div>

              {BEAT_ROWS.map(({ name, label }) => (
                <div key={name} className="flex items-center justify-between gap-4">
                  <span
                    className={`text-sm ${metronomeOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {label}
                  </span>
                  <Controller
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? NONE_VALUE}
                        onValueChange={(v) => field.onChange(v === NONE_VALUE ? null : v)}
                        disabled={!metronomeOn}
                      >
                        <SelectTrigger className="w-44">
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
                    )}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Groove */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Groove
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">Swing feel</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {(() => {
                    const v = form.watch('swingRatio') ?? 0.5;
                    if (v <= 0.5) return 'Straight';
                    if (v <= 0.57) return 'Light';
                    if (v <= 0.66) return 'Classic';
                    return 'Shuffle';
                  })()}
                </span>
              </div>
              <Controller
                control={form.control}
                name="swingRatio"
                render={({ field }) => (
                  <Slider
                    min={50}
                    max={75}
                    step={1}
                    value={[Math.round((field.value ?? 0.5) * 100)]}
                    onValueChange={(vals) => field.onChange((vals[0] ?? 50) / 100)}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Straight (0.50) → Classic swing (0.66) → Heavy shuffle (0.75)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Инструменты ── */}
        <TabsContent
          value="instruments"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
        >
          {/* Bass */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Bass
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="bassEnabled" className="text-sm text-foreground">
                  Включить бас
                </Label>
                <Controller
                  control={form.control}
                  name="bassEnabled"
                  render={({ field }) => (
                    <input
                      id="bassEnabled"
                      type="checkbox"
                      checked={field.value ?? true}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${bassOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость баса
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('bassVolume') ?? 0.7) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="bassVolume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      disabled={!bassOn}
                      value={[Math.round((field.value ?? 0.7) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 70) / 100)}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label
                  className={`text-sm ${bassOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Сложность паттерна
                </Label>
                <Controller
                  control={form.control}
                  name="bassComplexity"
                  render={({ field }) => (
                    <Select
                      value={String(field.value ?? 1)}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={!bassOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 — Корень на доле 1</SelectItem>
                        <SelectItem value="2">2 — Корень на каждой доле</SelectItem>
                        <SelectItem value="3">3 — Корень + квинта</SelectItem>
                        <SelectItem value="4">4 — Звуки аккорда</SelectItem>
                        <SelectItem value="5">5 — Walking + хроматика</SelectItem>
                        <SelectItem value="6">6 — Аккорд (1 2 3 4, pluck)</SelectItem>
                        <SelectItem value="7">7 — Аккорд (1 3, pluck)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>


            </CardContent>
          </Card>

          {/* Piano */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Piano
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="pianoEnabled" className="text-sm text-foreground">
                  Включить Piano
                </Label>
                <Controller
                  control={form.control}
                  name="pianoEnabled"
                  render={({ field }) => (
                    <input
                      id="pianoEnabled"
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${pianoOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость Piano
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('pianoVolume') ?? 0.7) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="pianoVolume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      disabled={!pianoOn}
                      value={[Math.round((field.value ?? 0.7) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 70) / 100)}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label
                  className={`text-sm ${pianoOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Воисинг
                </Label>
                <Controller
                  control={form.control}
                  name="pianoVoicingDensity"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'rootless3'}
                      onValueChange={field.onChange}
                      disabled={!pianoOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shell2">Shell (3 + 7)</SelectItem>
                        <SelectItem value="rootless3">Rootless 3 ноты</SelectItem>
                        <SelectItem value="rootless4">Rootless 4 ноты</SelectItem>
                        <SelectItem value="quartal">Quartal</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label
                  className={`text-sm ${pianoOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Библиотека сэмплов
                </Label>
                <Controller
                  control={form.control}
                  name="pianoSampleLibrary"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'salamander'}
                      onValueChange={field.onChange}
                      disabled={!pianoOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salamander">Salamander Grand</SelectItem>
                        <SelectItem value="upright">Upright Piano</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Rhodes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Rhodes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="rhodesEnabled" className="text-sm text-foreground">
                  Включить Rhodes
                </Label>
                <Controller
                  control={form.control}
                  name="rhodesEnabled"
                  render={({ field }) => (
                    <input
                      id="rhodesEnabled"
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${rhodesOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость слоя
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('rhodesLayerVolume') ?? 0.5) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="rhodesLayerVolume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      disabled={!rhodesOn}
                      value={[Math.round((field.value ?? 0.5) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 50) / 100)}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label
                  className={`text-sm ${rhodesOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Форма
                </Label>
                <Controller
                  control={form.control}
                  name="rhodesPattern"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'rhodes-swing-form'}
                      onValueChange={field.onChange}
                      disabled={!rhodesOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rhodes-swing-form">Swing Complement</SelectItem>
                        <SelectItem value="rhodes-swing-sparse-form">Swing Sparse</SelectItem>
                        <SelectItem value="rhodes-bossa-form">Bossa Gentle</SelectItem>
                        <SelectItem value="rhodes-funk-form">Funk Mellow</SelectItem>
                        <SelectItem value="rhodes-latin-form">Latin Cascade</SelectItem>
                        <SelectItem value="rhodes-ballad-form">Ballad Gentle</SelectItem>
                        <SelectItem value="rhodes-ballad-ambient-form">Ballad Ambient</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${rhodesOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость Rhodes
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('rhodesVolume') ?? 0.6) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="rhodesVolume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      disabled={!rhodesOn}
                      value={[Math.round((field.value ?? 0.6) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 60) / 100)}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label
                  className={`text-sm ${rhodesOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Воисинг
                </Label>
                <Controller
                  control={form.control}
                  name="rhodesVoicingDensity"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'rootless3'}
                      onValueChange={field.onChange}
                      disabled={!rhodesOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shell2">Shell (3 + 7)</SelectItem>
                        <SelectItem value="rootless3">Rootless 3 ноты</SelectItem>
                        <SelectItem value="rootless4">Rootless 4 ноты</SelectItem>
                        <SelectItem value="quartal">Квартовый</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Drums */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                {drumKitName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="drumsEnabled" className="text-sm text-foreground">
                  Включить ударные
                </Label>
                <Controller
                  control={form.control}
                  name="drumsEnabled"
                  render={({ field }) => (
                    <input
                      id="drumsEnabled"
                      type="checkbox"
                      checked={field.value ?? true}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость ударных
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('drumsVolume') ?? 0.7) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="drumsVolume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      disabled={!drumsOn}
                      value={[Math.round((field.value ?? 0.7) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 70) / 100)}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label
                  className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Набор сэмплов
                </Label>
                <Controller
                  control={form.control}
                  name="drumKit"
                  render={({ field }) => {
                    const drumKitVariants =
                      INSTRUMENT_GROUPS.find((g) => g.id === 'drums')?.variants ?? [];
                    return (
                      <Select
                        value={field.value ?? 'jazz-drum-kit'}
                        onValueChange={field.onChange}
                        disabled={!drumsOn}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {drumKitVariants.map((v) => (
                            <SelectItem key={v.instrumentId} value={v.instrumentId}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Системные ── */}
        <TabsContent
          value="system"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
        >
          {themeControl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Тема
                </CardTitle>
              </CardHeader>
              <CardContent>{themeControl}</CardContent>
            </Card>
          )}

          {/* ── Аудио формат ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Аудио формат
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="audioFormat"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? 'aac'}
                    onValueChange={(v) =>
                      field.onChange(v === 'aac' ? undefined : (v as 'aac' | 'mp3'))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aac">AAC (авто) — качество</SelectItem>
                      <SelectItem value="mp3">MP3 — совместимость</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                AAC — современный кодек, лучше качество при меньшем размере. MP3 — для старых
                браузеров.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MIDI ── */}
        <TabsContent
          value="midi"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
        >
          {/* MIDI-устройство (live) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                MIDI-устройство
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="midiDeviceId"
                control={form.control}
                render={({ field }) => (
                  <LiveMidiControls
                    midiDeviceId={field.value}
                    onDeviceChange={(id) => field.onChange(id)}
                  />
                )}
              />
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
              <Controller
                name="midiChannel"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() ?? 'all'}
                    onValueChange={(v) => {
                      field.onChange(v === 'all' ? undefined : parseInt(v, 10));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все каналы</SelectItem>
                      {Array.from({ length: 16 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          Канал {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Фильтр MIDI-канала (0–15) или «все».
              </p>
            </CardContent>
          </Card>

          {/* Соло-тембр по умолчанию */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Соло-тембр
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="soloToneId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? 'rhodes-jrhodes3c'}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="synth-default">Synth</SelectItem>
                      <SelectItem value="piano-upright">Upright Piano</SelectItem>
                      <SelectItem value="piano-salamander">Grand Piano</SelectItem>
                      <SelectItem value="rhodes-jrhodes3c">Rhodes</SelectItem>
                      <SelectItem value="clarinet">Clarinet</SelectItem>
                      <SelectItem value="vibraphone">Vibraphone</SelectItem>
                      <SelectItem value="guitar-nylon">Acoustic Guitar</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
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
              <Controller
                name="soloVolume"
                control={form.control}
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[Math.round((field.value ?? 0.8) * 100)]}
                      onValueChange={([v]) => field.onChange(v !== undefined ? v / 100 : undefined)}
                      min={0}
                      max={100}
                      step={1}
                    />
                    <span className="w-10 text-right text-sm tabular-nums">
                      {Math.round((field.value ?? 0.8) * 100)}%
                    </span>
                  </div>
                )}
              />
            </CardContent>
          </Card>

          {/* Auto-duck */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Auto-duck
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="duckingEnabled"
                control={form.control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="size-4 rounded accent-primary"
                    />
                    <span className="text-sm">
                      Автоматически приглушать аккомпанемент при игре соло
                    </span>
                  </label>
                )}
              />
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
              <button
                type="button"
                disabled={audioLoading}
                onClick={async () => {
                  clearPreviewTimers();
                  setAudioLoading(true);
                  setPreviewError(null);
                  try {
                    const w = window as unknown as Record<string, unknown>;

                    // Ensure audio infra is ready (creates adapter + host on first call)
                    const ensureAudio = w.__ensureAudioReady as (() => Promise<void>) | undefined;
                    if (ensureAudio) await ensureAudio();

                    const host = w.__soloInstrumentHost as {
                      selectTone: (id: string) => void;
                      handleNoteOn: (n: number, v: number) => void;
                      handleNoteOff: (n: number) => void;
                    } | null;
                    if (!host) return;

                    const toneId = form.getValues('soloToneId') ?? 'rhodes-jrhodes3c';
                    try {
                      host.selectTone(toneId);
                    } catch (err) {
                      setPreviewError(err instanceof Error ? err.message : 'Инструмент недоступен');
                      // Fall back to synth-default which always works
                      host.selectTone('synth-default');
                    }

                    // Give sampled instruments a moment to load
                    await new Promise((r) => setTimeout(r, 100));

                    // C4-E4-G4-C5 arpeggio (MIDI velocity 80 ≈ mezzoforte)
                    const notes = [60, 64, 67, 72];
                    const stepMs = 150;
                    const noteDurationMs = 600;
                    const velocity = 80;

                    notes.forEach((note, i) => {
                      const t1 = setTimeout(() => host.handleNoteOn(note, velocity), i * stepMs);
                      const t2 = setTimeout(
                        () => host.handleNoteOff(note),
                        i * stepMs + noteDurationMs,
                      );
                      previewTimersRef.current.push(t1, t2);
                    });

                    // Keep button disabled while arpeggio plays
                    const lastNoteEnd = (notes.length - 1) * stepMs + noteDurationMs;
                    previewTimersRef.current.push(
                      setTimeout(() => setAudioLoading(false), lastNoteEnd + 100),
                    );
                  } catch {
                    setAudioLoading(false);
                  }
                }}
                className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {audioLoading ? 'Загрузка…' : '▶ Прослушать'}
              </button>
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
          <ComputerKeyboardSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
