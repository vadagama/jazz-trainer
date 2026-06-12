import * as React from 'react';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserSettingsDTOSchema, type UserSettingsDTO } from '@jazz/shared';
import { METRONOME_SAMPLES } from '@jazz/music-core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
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

  const bpmField = form.register('bpm', { setValueAs: (v: string) => v === '' ? NaN : parseInt(v, 10) });
  const countInField = form.register('countIn', { setValueAs: (v: string) => v === '' ? NaN : parseInt(v, 10) });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="main">
        <TabsList>
          <TabsTrigger value="main" className="flex-1">Основные</TabsTrigger>
          <TabsTrigger value="instruments" className="flex-1">Инструменты</TabsTrigger>
          <TabsTrigger value="system" className="flex-1">Системные</TabsTrigger>
        </TabsList>

        {/* ── Основные ── */}
        <TabsContent value="main" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">

          {/* Воспроизведение */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Воспроизведение</CardTitle>
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
                      min={0} max={100} step={5}
                      value={[Math.round((field.value ?? 0.8) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 80) / 100)}
                    />
                  )}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <Label htmlFor="bpm" className="pt-2 text-sm text-foreground">BPM</Label>
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
                <Label htmlFor="countIn" className="pt-2 text-sm text-foreground">Count-in (тактов)</Label>
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
                    <p className="text-xs text-destructive">{form.formState.errors.countIn.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Метроном */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Метроном</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">Громкость метронома</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">{metronomeVolumePct}%</span>
                </div>
                <Controller
                  control={form.control}
                  name="metronomeVolume"
                  render={({ field }) => (
                    <Slider
                      min={0} max={100} step={5}
                      value={[Math.round((field.value ?? 0.8) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 80) / 100)}
                    />
                  )}
                />
              </div>

              {BEAT_ROWS.map(({ name, label }) => (
                <div key={name} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-foreground">{label}</span>
                  <Controller
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? NONE_VALUE}
                        onValueChange={(v) => field.onChange(v === NONE_VALUE ? null : v)}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>—</SelectItem>
                          {METRONOME_SAMPLES.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
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
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Groove</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">Swing feel</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {(() => {
                    const v = form.watch('swingRatio') ?? 0.50;
                    if (v <= 0.50) return 'Straight';
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
                    min={50} max={75} step={1}
                    value={[Math.round((field.value ?? 0.50) * 100)]}
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
        <TabsContent value="instruments" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">

          {/* Bass */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Bass</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="bassEnabled" className="text-sm text-foreground">Включить бас</Label>
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
                  <Label className="text-sm text-foreground">Громкость баса</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('bassVolume') ?? 0.7) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="bassVolume"
                  render={({ field }) => (
                    <Slider
                      min={0} max={100} step={5}
                      value={[Math.round((field.value ?? 0.7) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 70) / 100)}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm text-foreground">Сложность паттерна</Label>
                <Controller
                  control={form.control}
                  name="bassComplexity"
                  render={({ field }) => (
                    <Select
                      value={String(field.value ?? 1)}
                      onValueChange={(v) => field.onChange(Number(v))}
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
                <Label htmlFor="bassOctaveUp" className="text-sm text-foreground">+1 октава</Label>
                <Controller
                  control={form.control}
                  name="bassOctaveUp"
                  render={({ field }) => (
                    <input
                      id="bassOctaveUp"
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Rhodes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Rhodes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="rhodesEnabled" className="text-sm text-foreground">Включить Rhodes</Label>
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
                  <Label className="text-sm text-foreground">Громкость Rhodes</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('rhodesVolume') ?? 0.6) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="rhodesVolume"
                  render={({ field }) => (
                    <Slider
                      min={0} max={100} step={5}
                      value={[Math.round((field.value ?? 0.6) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 60) / 100)}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm text-foreground">Ритм</Label>
                <Controller
                  control={form.control}
                  name="rhodesMode"
                  render={({ field }) => (
                    <Select value={field.value ?? 'halfNotes'} onValueChange={field.onChange}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Базовые</SelectLabel>
                          <SelectItem value="wholeNotes">Целые ноты</SelectItem>
                          <SelectItem value="halfNotes">Половинки</SelectItem>
                          <SelectItem value="quarterNotes">Четверти</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Swing паттерны</SelectLabel>
                          <SelectItem value="charleston">Charleston</SelectItem>
                          <SelectItem value="reverse-charleston">Reverse Charleston</SelectItem>
                          <SelectItem value="basie-2-4">Basie 2 и 4</SelectItem>
                          <SelectItem value="offbeat-2-4">Offbeat 2&amp; / 4&amp;</SelectItem>
                          <SelectItem value="anticipation-4and">Антиципация 4&amp;</SelectItem>
                          <SelectItem value="one-twoand-four">1 + 2&amp; + 4</SelectItem>
                          <SelectItem value="oneand-three">1&amp; + 3</SelectItem>
                          <SelectItem value="twoand-only">2&amp; only</SelectItem>
                          <SelectItem value="four-and-sparse">4&amp; (редкий)</SelectItem>
                          <SelectItem value="two-threeand">2 + 3&amp;</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm text-foreground">Воисинг</Label>
                <Controller
                  control={form.control}
                  name="rhodesVoicingDensity"
                  render={({ field }) => (
                    <Select value={field.value ?? 'rootless3'} onValueChange={field.onChange}>
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
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Drums</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="drumsEnabled" className="text-sm text-foreground">Включить Drums</Label>
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
                  <Label className="text-sm text-foreground">Громкость Drums</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {Math.round((form.watch('drumsVolume') ?? 0.7) * 100)}%
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="drumsVolume"
                  render={({ field }) => (
                    <Slider min={0} max={100} step={5}
                      value={[Math.round((field.value ?? 0.7) * 100)]}
                      onValueChange={(vals) => field.onChange((vals[0] ?? 70) / 100)}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm text-foreground">Ride pattern</Label>
                <Controller
                  control={form.control}
                  name="drumsRidePattern"
                  render={({ field }) => (
                    <Select value={field.value ?? 'swingRide'} onValueChange={field.onChange}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="swingRide">Swing ride</SelectItem>
                        <SelectItem value="quarters">Четверти</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Ride */}
              <div className="space-y-2 pl-3 border-l border-border">
                <p className="text-xs text-muted-foreground">Ride cymbal</p>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="drumsRideEnabled" className="text-sm text-foreground">Включить</Label>
                  <Controller control={form.control} name="drumsRideEnabled" render={({ field }) => (
                    <input id="drumsRideEnabled" type="checkbox" checked={field.value ?? true}
                      onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 cursor-pointer accent-primary" />
                  )} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">Громкость</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">{Math.round((form.watch('drumsRideVolume') ?? 0.7) * 100)}%</span>
                </div>
                <Controller control={form.control} name="drumsRideVolume" render={({ field }) => (
                  <Slider min={0} max={100} step={5} value={[Math.round((field.value ?? 0.7) * 100)]}
                    onValueChange={(vals) => field.onChange((vals[0] ?? 70) / 100)} />
                )} />
              </div>

              {/* Stir */}
              <div className="space-y-2 pl-3 border-l border-border">
                <p className="text-xs text-muted-foreground">Stir (brushes)</p>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="drumsStirEnabled" className="text-sm text-foreground">Включить</Label>
                  <Controller control={form.control} name="drumsStirEnabled" render={({ field }) => (
                    <input id="drumsStirEnabled" type="checkbox" checked={field.value ?? true}
                      onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 cursor-pointer accent-primary" />
                  )} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">Громкость</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">{Math.round((form.watch('drumsStirVolume') ?? 0.6) * 100)}%</span>
                </div>
                <Controller control={form.control} name="drumsStirVolume" render={({ field }) => (
                  <Slider min={0} max={100} step={5} value={[Math.round((field.value ?? 0.6) * 100)]}
                    onValueChange={(vals) => field.onChange((vals[0] ?? 60) / 100)} />
                )} />
              </div>

              {/* Hi-hat */}
              <div className="space-y-2 pl-3 border-l border-border">
                <p className="text-xs text-muted-foreground">Hi-hat foot</p>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="drumsHihatEnabled" className="text-sm text-foreground">Включить</Label>
                  <Controller control={form.control} name="drumsHihatEnabled" render={({ field }) => (
                    <input id="drumsHihatEnabled" type="checkbox" checked={field.value ?? true}
                      onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 cursor-pointer accent-primary" />
                  )} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">Громкость</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">{Math.round((form.watch('drumsHihatVolume') ?? 0.55) * 100)}%</span>
                </div>
                <Controller control={form.control} name="drumsHihatVolume" render={({ field }) => (
                  <Slider min={0} max={100} step={5} value={[Math.round((field.value ?? 0.55) * 100)]}
                    onValueChange={(vals) => field.onChange((vals[0] ?? 55) / 100)} />
                )} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Системные ── */}
        <TabsContent value="system" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {themeControl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Тема</CardTitle>
              </CardHeader>
              <CardContent>{themeControl}</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

    </div>
  );
}
