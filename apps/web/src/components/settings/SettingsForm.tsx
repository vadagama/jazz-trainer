import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserSettingsDTOSchema, type UserSettingsDTO, CLICK_SOUNDS } from '@jazz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  defaultValues: UserSettingsDTO;
  onSave: (data: UserSettingsDTO) => void | Promise<void>;
  isSaving?: boolean;
}

const CLICK_LABELS: Record<string, string> = {
  click_hi: 'Click Hi',
  click_lo: 'Click Lo',
  wood: 'Wood',
  beep: 'Beep',
};

export function SettingsForm({ defaultValues, onSave, isSaving }: Props) {
  const form = useForm<UserSettingsDTO>({
    resolver: zodResolver(UserSettingsDTOSchema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-5">
      <div className="space-y-1">
        <Label htmlFor="bpm">BPM</Label>
        <Input
          id="bpm"
          type="number"
          min={20}
          max={400}
          {...form.register('bpm', { valueAsNumber: true })}
          className="max-w-[120px]"
        />
        {form.formState.errors.bpm && (
          <p className="text-xs text-destructive">{form.formState.errors.bpm.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="volume">Громкость ({Math.round((form.watch('volume') ?? 0.8) * 100)}%)</Label>
        <input
          id="volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          {...form.register('volume', { valueAsNumber: true })}
          className="w-full max-w-xs"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="clickStrong">Сильная доля</Label>
        <Controller
          control={form.control}
          name="clickStrong"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="clickStrong" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLICK_SOUNDS.map((s) => (
                  <SelectItem key={s} value={s}>{CLICK_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="clickWeak">Слабая доля</Label>
        <Controller
          control={form.control}
          name="clickWeak"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="clickWeak" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLICK_SOUNDS.map((s) => (
                  <SelectItem key={s} value={s}>{CLICK_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="countIn">Count-in (тактов)</Label>
        <Input
          id="countIn"
          type="number"
          min={0}
          {...form.register('countIn', { valueAsNumber: true })}
          className="max-w-[100px]"
        />
        {form.formState.errors.countIn && (
          <p className="text-xs text-destructive">{form.formState.errors.countIn.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Сохраняем...' : 'Сохранить'}
      </Button>
    </form>
  );
}
