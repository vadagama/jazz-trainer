import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserSettingsDTOSchema, type UserSettingsDTO } from '@jazz/shared';
import { METRONOME_SAMPLES } from '@jazz/music-core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface Props {
  defaultValues: UserSettingsDTO;
  onSave: (data: UserSettingsDTO) => void | Promise<void>;
  isSaving?: boolean;
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

export function SettingsForm({ defaultValues, onSave, isSaving }: Props) {
  const form = useForm<UserSettingsDTO>({
    resolver: zodResolver(UserSettingsDTOSchema),
    defaultValues,
  });

  const volumePct = Math.round((form.watch('volume') ?? 0.8) * 100);
  const metronomeVolumePct = Math.round((form.watch('metronomeVolume') ?? 0.8) * 100);

  const bpmField = form.register('bpm', { setValueAs: (v: string) => v === '' ? NaN : parseInt(v, 10) });
  const countInField = form.register('countIn', { setValueAs: (v: string) => v === '' ? NaN : parseInt(v, 10) });

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-8">

      {/* Воспроизведение */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Воспроизведение</p>

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
      </div>

      {/* Метроном */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Метроном</p>
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
                min={0}
                max={100}
                step={5}
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
      </div>

      {/* Бас */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Бас</p>

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
                min={0}
                max={100}
                step={5}
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
      </div>

      {/* Rhodes */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rhodes</p>

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
                min={0}
                max={100}
                step={5}
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
              <Select
                value={field.value ?? 'halfNotes'}
                onValueChange={field.onChange}
              >
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
              <Select
                value={field.value ?? 'rootless3'}
                onValueChange={field.onChange}
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
      </div>

      {/* Drums */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Drums</p>

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
              <Slider
                min={0} max={100} step={5}
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
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Сохраняем...' : 'Сохранить'}
      </Button>
    </form>
  );
}
