import * as React from 'react';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserSettingsDTOSchema, type UserSettingsDTO } from '@jazz/shared';
import { METRONOME_SAMPLES } from '@jazz/music-core';
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

interface Props {
  defaultValues: UserSettingsDTO;
  onSave: (data: UserSettingsDTO) => void | Promise<void>;
  themeControl?: React.ReactNode;
}

const NONE_VALUE = '__none__';

function allowOnlyDigits(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (
    ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
      e.key,
    )
  )
    return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
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

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const { unsubscribe } = form.watch(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        form.handleSubmit(onSave)();
      }, 500);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [form, onSave]);

  const volumePct = Math.round((form.watch('volume') ?? 0.8) * 100);
  const metronomeVolumePct = Math.round((form.watch('metronomeVolume') ?? 0.8) * 100);
  const metronomeOn = form.watch('metronomeEnabled') ?? true;
  const bassOn = form.watch('bassEnabled') ?? true;
  const rhodesOn = form.watch('rhodesEnabled') ?? false;
  const pianoOn = form.watch('pianoEnabled') ?? false;
  const drumsOn = form.watch('drumsEnabled') ?? true;

  const bpmField = form.register('bpm', {
    setValueAs: (v: string) => (v === '' ? NaN : parseInt(v, 10)),
  });
  const countInField = form.register('countIn', {
    setValueAs: (v: string) => (v === '' ? NaN : parseInt(v, 10)),
  });

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
                  <Input
                    id="bpm"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onKeyDown={allowOnlyDigits}
                    {...bpmField}
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n > 400) e.target.value = '400';
                      bpmField.onChange(e);
                    }}
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
                  <Input
                    id="countIn"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onKeyDown={allowOnlyDigits}
                    {...countInField}
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n > 4) e.target.value = '4';
                      countInField.onChange(e);
                    }}
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
                      onChange={(e) => field.onChange(e.target.checked)}
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

              <div className="flex items-center justify-between gap-4">
                <Label
                  htmlFor="bassOctaveUp"
                  className={`text-sm ${bassOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  +1 октава
                </Label>
                <Controller
                  control={form.control}
                  name="bassOctaveUp"
                  render={({ field }) => (
                    <input
                      id="bassOctaveUp"
                      type="checkbox"
                      disabled={!bassOn}
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
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
                  Профиль компинга
                </Label>
                <Controller
                  control={form.control}
                  name="pianoProfile"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'swing-sparse'}
                      onValueChange={field.onChange}
                      disabled={!pianoOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="swing-sparse">Swing Sparse</SelectItem>
                        <SelectItem value="swing-medium">Swing Medium</SelectItem>
                        <SelectItem value="basie-light">Basie Light</SelectItem>
                        <SelectItem value="offbeat-push">Offbeat Push</SelectItem>
                        <SelectItem value="beginner-safe">Beginner Safe</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="upright-kw">Upright KW</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label
                  className={`text-sm ${pianoOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Рандомизация
                </Label>
                <Controller
                  control={form.control}
                  name="pianoRandomizationLevel"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'off'}
                      onValueChange={field.onChange}
                      disabled={!pianoOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Выкл</SelectItem>
                        <SelectItem value="subtle">Лёгкая</SelectItem>
                        <SelectItem value="moderate">Умеренная</SelectItem>
                        <SelectItem value="high">Высокая</SelectItem>
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
              <p className="text-xs text-muted-foreground">
                Rhodes теперь работает как дополнительный слой поверх Piano
              </p>

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
                  Режим слоя
                </Label>
                <Controller
                  control={form.control}
                  name="rhodesLayerMode"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'none'}
                      onValueChange={field.onChange}
                      disabled={!rhodesOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Выкл</SelectItem>
                        <SelectItem value="pads">Pads</SelectItem>
                        <SelectItem value="subtle-offbeats">Subtle Offbeats</SelectItem>
                        <SelectItem value="high-comping">High Comping</SelectItem>
                        <SelectItem value="ambient-swells">Ambient Swells</SelectItem>
                        <SelectItem value="stab-accents">Stab Accents</SelectItem>
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
                Drums
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="drumsEnabled" className="text-sm text-foreground">
                  Включить Drums
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
                    Громкость Drums
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
                  Паттерн
                </Label>
                <Controller
                  control={form.control}
                  name="drumsPattern"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'swing'}
                      onValueChange={field.onChange}
                      disabled={!drumsOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="swing">Swing</SelectItem>
                        <SelectItem value="bossa">Bossa Nova</SelectItem>
                        <SelectItem value="funk">Funk</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label
                  className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Humanize
                </Label>
                <Controller
                  control={form.control}
                  name="drumsHumanizeIntensity"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'med'}
                      onValueChange={field.onChange}
                      disabled={!drumsOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Выкл</SelectItem>
                        <SelectItem value="low">Низкая</SelectItem>
                        <SelectItem value="med">Средняя</SelectItem>
                        <SelectItem value="high">Высокая</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Funk settings — only shown when pattern is funk */}
              {(form.watch('drumsPattern') ?? 'swing') === 'funk' && (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      Сложность
                    </Label>
                    <Controller
                      control={form.control}
                      name="drumsFunkComplexity"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? 'medium'}
                          onValueChange={field.onChange}
                          disabled={!drumsOn}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">Простой</SelectItem>
                            <SelectItem value="medium">Средний</SelectItem>
                            <SelectItem value="complex">Сложный</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      Fill частота
                    </Label>
                    <Controller
                      control={form.control}
                      name="drumsFillFrequency"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? 'rare'}
                          onValueChange={field.onChange}
                          disabled={!drumsOn}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Без fills</SelectItem>
                            <SelectItem value="16bars">Редко (16т)</SelectItem>
                            <SelectItem value="8bars">Умеренно (8т)</SelectItem>
                            <SelectItem value="4bars">Часто (4т)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Randomization level — always visible */}
              <div className="flex items-center justify-between gap-4">
                <Label
                  className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Рандомизация
                </Label>
                <Controller
                  control={form.control}
                  name="drumsRandomizationLevel"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'off'}
                      onValueChange={field.onChange}
                      disabled={!drumsOn}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Выкл</SelectItem>
                        <SelectItem value="subtle">Тонкая</SelectItem>
                        <SelectItem value="moderate">Умеренная</SelectItem>
                        <SelectItem value="high">Высокая</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Randomization sub-settings — only shown when level > off */}
              {(form.watch('drumsRandomizationLevel') ?? 'off') !== 'off' && (
                <div className="space-y-3 pl-3 border-l-2 border-primary/30">
                  <p className="text-xs font-semibold text-primary/70">Колонки рандомизации</p>
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      Сложность fills
                    </Label>
                    <Controller
                      control={form.control}
                      name="drumsFillComplexity"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? 'medium'}
                          onValueChange={field.onChange}
                          disabled={!drumsOn}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">Простая</SelectItem>
                            <SelectItem value="medium">Средняя</SelectItem>
                            <SelectItem value="complex">Сложная</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      htmlFor="drumsRideVariation"
                      className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      Вариация ride
                    </Label>
                    <Controller
                      control={form.control}
                      name="drumsRideVariation"
                      render={({ field }) => (
                        <input
                          id="drumsRideVariation"
                          type="checkbox"
                          disabled={!drumsOn}
                          checked={field.value ?? true}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      htmlFor="drumsSnareGhosts"
                      className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      Ghost notes (snare)
                    </Label>
                    <Controller
                      control={form.control}
                      name="drumsSnareGhosts"
                      render={({ field }) => (
                        <input
                          id="drumsSnareGhosts"
                          type="checkbox"
                          disabled={!drumsOn}
                          checked={field.value ?? true}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      htmlFor="drumsBassDrumVariation"
                      className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      Вариация bass drum
                    </Label>
                    <Controller
                      control={form.control}
                      name="drumsBassDrumVariation"
                      render={({ field }) => (
                        <input
                          id="drumsBassDrumVariation"
                          type="checkbox"
                          disabled={!drumsOn}
                          checked={field.value ?? true}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Bass Drum */}
              <div className="space-y-2 pl-3 border-l border-border">
                <p className="text-xs text-muted-foreground">Bass Drum</p>
                <div className="flex items-center justify-between gap-4">
                  <Label
                    htmlFor="drumsBassDrumEnabled"
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Включить
                  </Label>
                  <Controller
                    control={form.control}
                    name="drumsBassDrumEnabled"
                    render={({ field }) => (
                      <input
                        id="drumsBassDrumEnabled"
                        type="checkbox"
                        disabled={!drumsOn}
                        checked={field.value ?? true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    )}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('drumsBassDrumVolume') ?? 0.7) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="drumsBassDrumVolume"
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

              {/* Snare */}
              <div className="space-y-2 pl-3 border-l border-border">
                <p className="text-xs text-muted-foreground">Snare</p>
                <div className="flex items-center justify-between gap-4">
                  <Label
                    htmlFor="drumsSnareEnabled"
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Включить
                  </Label>
                  <Controller
                    control={form.control}
                    name="drumsSnareEnabled"
                    render={({ field }) => (
                      <input
                        id="drumsSnareEnabled"
                        type="checkbox"
                        disabled={!drumsOn}
                        checked={field.value ?? true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    )}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('drumsSnareVolume') ?? 0.8) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="drumsSnareVolume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      disabled={!drumsOn}
                      value={[Math.round((field.value ?? 0.8) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 80) / 100)}
                    />
                  )}
                />
              </div>

              {/* Hi-hat */}
              <div className="space-y-2 pl-3 border-l border-border">
                <p className="text-xs text-muted-foreground">Hi-hat</p>
                <div className="flex items-center justify-between gap-4">
                  <Label
                    htmlFor="drumsHihatEnabled"
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Включить
                  </Label>
                  <Controller
                    control={form.control}
                    name="drumsHihatEnabled"
                    render={({ field }) => (
                      <input
                        id="drumsHihatEnabled"
                        type="checkbox"
                        disabled={!drumsOn}
                        checked={field.value ?? true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    )}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('drumsHihatVolume') ?? 0.65) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="drumsHihatVolume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      disabled={!drumsOn}
                      value={[Math.round((field.value ?? 0.65) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 65) / 100)}
                    />
                  )}
                />
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Открытость
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {form.watch('drumsHihatOpenness') ?? 0}
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="drumsHihatOpenness"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={5}
                      step={1}
                      disabled={!drumsOn}
                      value={[field.value ?? 0]}
                      onValueChange={(vals) => field.onChange(vals[0] ?? 0)}
                    />
                  )}
                />
              </div>

              {/* Ride */}
              <div className="space-y-2 pl-3 border-l border-border">
                <p className="text-xs text-muted-foreground">Ride cymbal</p>
                <div className="flex items-center justify-between gap-4">
                  <Label
                    htmlFor="drumsRideEnabled"
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Включить
                  </Label>
                  <Controller
                    control={form.control}
                    name="drumsRideEnabled"
                    render={({ field }) => (
                      <input
                        id="drumsRideEnabled"
                        type="checkbox"
                        disabled={!drumsOn}
                        checked={field.value ?? true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    )}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('drumsRideVolume') ?? 0.7) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="drumsRideVolume"
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

              {/* Crash */}
              <div className="space-y-2 pl-3 border-l border-border">
                <p className="text-xs text-muted-foreground">Crash cymbal</p>
                <div className="flex items-center justify-between gap-4">
                  <Label
                    htmlFor="drumsCrashEnabled"
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Включить
                  </Label>
                  <Controller
                    control={form.control}
                    name="drumsCrashEnabled"
                    render={({ field }) => (
                      <input
                        id="drumsCrashEnabled"
                        type="checkbox"
                        disabled={!drumsOn}
                        checked={field.value ?? true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    )}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('drumsCrashVolume') ?? 0.8) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="drumsCrashVolume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      disabled={!drumsOn}
                      value={[Math.round((field.value ?? 0.8) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 80) / 100)}
                    />
                  )}
                />
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Каждые N тактов
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {form.watch('drumsCrashFrequency') ?? 4}
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="drumsCrashFrequency"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={32}
                      step={1}
                      disabled={!drumsOn}
                      value={[field.value ?? 4]}
                      onValueChange={(vals) => field.onChange(vals[0] ?? 4)}
                    />
                  )}
                />
              </div>

              {/* Rim */}
              <div className="space-y-2 pl-3 border-l border-border">
                <p className="text-xs text-muted-foreground">Rim click</p>
                <div className="flex items-center justify-between gap-4">
                  <Label
                    htmlFor="drumsRimEnabled"
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Включить
                  </Label>
                  <Controller
                    control={form.control}
                    name="drumsRimEnabled"
                    render={({ field }) => (
                      <input
                        id="drumsRimEnabled"
                        type="checkbox"
                        disabled={!drumsOn}
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    )}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className={`text-sm ${drumsOn ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    Громкость
                  </Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('drumsRimVolume') ?? 0.6) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="drumsRimVolume"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      disabled={!drumsOn}
                      value={[Math.round((field.value ?? 0.6) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 60) / 100)}
                    />
                  )}
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
      </Tabs>
    </div>
  );
}
