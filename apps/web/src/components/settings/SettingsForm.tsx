import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserSettingsDTOSchema, type UserSettingsDTO, CLICK_SOUNDS } from '@jazz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface Props {
  defaultValues: UserSettingsDTO;
  onSave: (data: UserSettingsDTO) => void | Promise<void>;
  isSaving?: boolean;
}

const CLICK_LABELS: Record<string, string> = {
  'analog-metronome': 'Analog Metronome',
  'button-click': 'Button Click',
  'drum-stick': 'Drum Stick',
  'retro-stick': 'Retro Stick',
  'switch': 'Switch',
};

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
            <Label className="text-sm text-foreground">Громкость</Label>
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
                    {CLICK_SOUNDS.map((s) => (
                      <SelectItem key={s} value={s}>{CLICK_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Сохраняем...' : 'Сохранить'}
      </Button>
    </form>
  );
}
