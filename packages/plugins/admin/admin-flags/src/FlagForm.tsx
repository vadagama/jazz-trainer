import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider, Textarea } from '@jazz/ui';
import { Loader2 } from 'lucide-react';
import {
  ApiError,
} from '@jazz/plugin-sdk';
import {
  FLAG_CATEGORIES,
  FLAG_TARGET_ROLES,
  type FeatureFlagDTO,
  type FlagCategory,
  type CreateFlagInput,
  type UpdateFlagInput,
} from '@jazz/shared';

export interface FlagFormValues {
  key: string;
  description: string;
  category: FlagCategory | '';
  enabled: boolean;
  roles: string[];
  userIds: string[];
  rolloutEnabled: boolean;
  rolloutPercent: number;
  expiresEnabled: boolean;
  expiresAtLocal: string; // datetime-local string
}

const NONE = '__none__' as const;

export function flagToFormValues(flag: FeatureFlagDTO): FlagFormValues {
  const d = new Date(flag.expiresAt ?? 0);
  const expiresLocal =
    flag.expiresAt != null && flag.expiresAt > 0
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      : '';
  return {
    key: flag.key,
    description: flag.description ?? '',
    category: flag.category ?? '',
    enabled: flag.enabled,
    roles: flag.roles,
    userIds: flag.userIds,
    rolloutEnabled: flag.rolloutPercent != null,
    rolloutPercent: flag.rolloutPercent ?? 50,
    expiresEnabled: flag.expiresAt != null && flag.expiresAt > 0,
    expiresAtLocal: expiresLocal,
  };
}

export const emptyFlagFormValues: FlagFormValues = {
  key: '',
  description: '',
  category: '',
  enabled: false,
  roles: [],
  userIds: [],
  rolloutEnabled: false,
  rolloutPercent: 50,
  expiresEnabled: false,
  expiresAtLocal: '',
};

interface FlagFormProps {
  mode: 'create' | 'edit';
  initial: FlagFormValues;
  onSubmit: (values: FlagFormValues) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel?: string;
}

export function FlagForm({
  mode,
  initial,
  onSubmit,
  isSubmitting,
  onCancel,
  submitLabel,
}: FlagFormProps) {
  const [values, setValues] = useState<FlagFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = <K extends keyof FlagFormValues>(key: K, val: FlagFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: val }));

  const toggleRole = (role: string) => {
    setValues((v) => ({
      ...v,
      roles: v.roles.includes(role) ? v.roles.filter((r) => r !== role) : [...v.roles, role],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side key validation mirrors the server regex.
    if (mode === 'create' && values.key && !/^[a-z0-9._-]+$/.test(values.key)) {
      setFieldErrors({
        key: 'Только строчные буквы, цифры, точка, дефис и подчёркивание',
      });
      return;
    }

    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.code === 'VALIDATION_ERROR' && Array.isArray(err.issues)) {
          const byPath: Record<string, string> = {};
          for (const issue of err.issues as { path?: (string | number)[]; message?: string }[]) {
            const path = issue.path?.[0];
            if (typeof path === 'string' && issue.message) byPath[path] = issue.message;
          }
          setFieldErrors(byPath);
        }
      } else {
        setError('Не удалось сохранить флаг');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Key */}
      <div className="space-y-1.5">
        <Label htmlFor="flag-key">Ключ</Label>
        <Input
          id="flag-key"
          value={values.key}
          onChange={(e) => update('key', e.target.value)}
          disabled={mode === 'edit' || isSubmitting}
          placeholder="new-catalog-ui"
          className="font-mono"
          autoComplete="off"
          required
        />
        {fieldErrors.key && (
          <p className="text-xs text-destructive">{fieldErrors.key}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="flag-desc">Описание</Label>
        <Textarea
          id="flag-desc"
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          disabled={isSubmitting}
          placeholder="Что включает этот флаг и зачем"
          maxLength={500}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">{values.description.length}/500</p>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Категория</Label>
        <Select
          value={values.category || NONE}
          onValueChange={(v) => update('category', v === NONE ? '' : (v as FlagCategory))}
          disabled={isSubmitting}
        >

          <SelectTrigger>
            <SelectValue placeholder="Без категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Без категории</SelectItem>
            {FLAG_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Enabled */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Checkbox
          checked={values.enabled}
          onChange={(e) => update('enabled', e.target.checked)}
          disabled={isSubmitting}
        />
        <span className="text-sm">Включён</span>
      </label>

      {/* Roles */}
      <div className="space-y-1.5">
        <Label>Роли (таргетинг)</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {FLAG_TARGET_ROLES.map((role) => (
            <label
              key={role}
              className="flex items-center gap-1.5 cursor-pointer select-none text-sm"
            >
              <Checkbox
                checked={values.roles.includes(role)}
                onChange={() => toggleRole(role)}
                disabled={isSubmitting}
              />
              <span className="font-mono text-xs">{role}</span>
            </label>
          ))}
        </div>
      </div>

      {/* User IDs */}
      <div className="space-y-1.5">
        <Label htmlFor="flag-users">ID пользователей (через запятую или новую строку)</Label>
        <Textarea
          id="flag-users"
          value={values.userIds.join(', ')}
          onChange={(e) =>
            update(
              'userIds',
              e.target.value
                .split(/[\s,]+/)
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          disabled={isSubmitting}
          placeholder="user-a, user-b"
          rows={2}
        />
      </div>

      {/* Rollout percent */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={values.rolloutEnabled}
            onChange={(e) => update('rolloutEnabled', e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="text-sm">Процентный роллаут</span>
        </label>
        {values.rolloutEnabled && (
          <div className="pl-6 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>Доля пользователей</span>
              <span className="font-mono">{values.rolloutPercent}%</span>
            </div>
            <Slider
              value={[values.rolloutPercent]}
              min={0}
              max={100}
              step={1}
              onValueChange={(arr) => {
                const v = arr[0];
                if (typeof v === 'number') update('rolloutPercent', v);
              }}
              disabled={isSubmitting}
            />
          </div>
        )}
      </div>

      {/* Expires at */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={values.expiresEnabled}
            onChange={(e) => update('expiresEnabled', e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="text-sm">Срок действия</span>
        </label>
        {values.expiresEnabled && (
          <div className="pl-6">
            <Input
              type="datetime-local"
              value={values.expiresAtLocal}
              onChange={(e) => update('expiresAtLocal', e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          {submitLabel ?? (mode === 'create' ? 'Создать' : 'Сохранить')}
        </Button>
      </div>
    </form>
  );
}

/** Convert form values → CreateFlagInput / UpdateFlagInput payloads. */
export function formToPayload(
  values: FlagFormValues,
): CreateFlagInput | UpdateFlagInput {
  const payload: Record<string, unknown> = {
    description: values.description.trim() || undefined,
    category: values.category || undefined,
    enabled: values.enabled,
    roles: values.roles.length > 0 ? values.roles : undefined,
    userIds: values.userIds.length > 0 ? values.userIds : undefined,
  };

  if (values.rolloutEnabled) {
    payload.rolloutPercent = values.rolloutPercent;
  } else {
    payload.rolloutPercent = undefined;
  }

  if (values.expiresEnabled && values.expiresAtLocal) {
    const ts = new Date(values.expiresAtLocal).getTime();
    if (!Number.isNaN(ts)) payload.expiresAt = ts;
  } else {
    payload.expiresAt = undefined;
  }

  if (values.key) payload.key = values.key;

  return payload as CreateFlagInput | UpdateFlagInput;
}
