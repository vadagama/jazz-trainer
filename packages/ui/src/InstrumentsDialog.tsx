import { useCallback, useMemo } from 'react';
import type { Style } from '@jazz/shared';
import { STYLES } from '@jazz/shared';
import {
  getStyleProfile,
  getVisibleInstrumentGroups,
  instrumentDefaultsFor,
  applyStyleDefaults,
  type DisplayGroup,
} from '@jazz/music-core';
import { useEffectiveSettings, useUpdateSettings } from '@jazz/plugin-sdk';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Slider } from './slider';
import { cn } from './utils';
import { INSTRUMENT_ICONS, DrumsIcon } from './instrument-icons';

const STYLE_LABELS: Record<Style, string> = {
  swing: 'Swing',
  bossa: 'Bossa Nova',
  funk: 'Funk',
  latin: 'Latin',
  ballad: 'Ballad',
  blues: 'Blues',
  soul: 'Soul',
} as const;

export interface InstrumentsDialogProps {
  open: boolean;
  onClose: () => void;
  onStyleChange?: (style: Style) => void;
  /** Active style override. When provided, used instead of settings.style for badge highlighting. */
  style?: Style;
}

const ROSTER_BADGE_LABEL: Record<string, string> = {
  required: 'Основной',
  recommended: 'Рекоменд.',
  optional: 'Дополнит.',
};

// ─── Metronome icon ──────────────────────────────────────────────────────────

function MetronomeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2v4" />
      <path d="m8 6 4 8 4-8" />
      <path d="M8 14h8" />
      <rect x="9" y="14" width="6" height="8" rx="1" />
      <line x1="10" y1="18" x2="14" y2="18" />
      <line x1="10" y1="20" x2="14" y2="20" />
    </svg>
  );
}

// ─── Group instrument row ──────────────────────────────────────────────────

interface GroupRowProps {
  group: DisplayGroup;
  style: Style;
  rosterBadge: string;
}

function GroupRow({ group, style, rosterBadge }: GroupRowProps) {
  const settings = useEffectiveSettings();
  const updateSettings = useUpdateSettings();

  const profile = useMemo(() => getStyleProfile(style), [style]);
  const defaults = instrumentDefaultsFor(profile, group.activeInstrumentId);
  const prefix = group.settingsPrefix;

  // Resolve enabled/volume for THIS style — not settings.style — so the toggles
  // match what the transport actually plays for the active style. Without this,
  // useEffectiveSettings resolves under the user's default style and the UI
  // drifts from the audio (e.g. funk shows Rhodes on while drums play).
  const resolved = useMemo(
    () => applyStyleDefaults({ ...settings, style }, style),
    [settings, style],
  );

  const enabled = prefix
    ? (resolved as Record<string, unknown>)[`${prefix}Enabled`] !== false
    : defaults.enabled;

  const volume = prefix
    ? (((resolved as Record<string, unknown>)[`${prefix}Volume`] as number) ?? defaults.volume)
    : defaults.volume;

  const handleToggle = useCallback(() => {
    if (!prefix) return;
    const key = `${prefix}Enabled`;
    const newValue = !enabled;

    // Merge with existing per-style overrides so other instrument
    // settings for this style are preserved (e.g. toggling piano doesn't
    // lose a previously-set bass override). Source from the server-backed
    // settings (useEffectiveSettings), NOT the local store — for logged-in
    // users the local store's perStyleOverrides is never populated from the
    // server, so it collapses to {} and the truncated payload would wipe
    // every previously-saved instrument override via the shallow optimistic
    // merge in useUpdateSettings.
    const existingPerStyle = {
      ...((settings.perStyleOverrides ?? {}) as Record<string, Record<string, unknown>>),
    } as Record<string, Record<string, unknown>>;
    const styleOverrides = { ...(existingPerStyle[style] ?? {}) };
    styleOverrides[key] = newValue;
    existingPerStyle[style] = styleOverrides;

    // Write both the scalar value (backwards compat) and the per-style
    // override so that applyStyleDefaults always respects the user's
    // explicit choice — even when the value matches the hardcoded
    // DEFAULT_SETTINGS (e.g. pianoEnabled: false) but differs from the
    // style profile (e.g. swing piano.enabled: true).
    updateSettings.mutate({
      [key]: newValue,
      perStyleOverrides: existingPerStyle,
    } as Parameters<typeof updateSettings.mutate>[0]);
  }, [prefix, enabled, updateSettings, style, settings]);

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      if (!prefix) return;
      const key = `${prefix}Volume`;
      const newValue = value[0];

      // Source per-style overrides from the server-backed settings, not the
      // local store (see handleToggle above) — otherwise moving a slider wipes
      // previously-saved instrument overrides for logged-in users.
      const existingPerStyle = {
        ...((settings.perStyleOverrides ?? {}) as Record<string, Record<string, unknown>>),
      } as Record<string, Record<string, unknown>>;
      const styleOverrides = { ...(existingPerStyle[style] ?? {}) };
      styleOverrides[key] = newValue;
      existingPerStyle[style] = styleOverrides;

      updateSettings.mutate({
        [key]: newValue,
        perStyleOverrides: existingPerStyle,
      } as Parameters<typeof updateSettings.mutate>[0]);
    },
    [prefix, updateSettings, style, settings],
  );

  const Icon = INSTRUMENT_ICONS[group.activeInstrumentId] ?? DrumsIcon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3',
        !enabled && 'opacity-50',
      )}
    >
      <Icon className="size-5 shrink-0 text-muted-foreground" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{group.name}</span>
          {rosterBadge in ROSTER_BADGE_LABEL && (
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {ROSTER_BADGE_LABEL[rosterBadge]}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[volume]}
            disabled={!enabled}
            onValueChange={handleVolumeChange}
            className="flex-1"
            aria-label={`Громкость ${group.name}`}
          />
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors',
          enabled ? 'bg-primary' : 'bg-secondary',
        )}
        aria-label={enabled ? `Выключить ${group.name}` : `Включить ${group.name}`}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
            enabled ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}

// ─── Dialog ─────────────────────────────────────────────────────────────────

export function InstrumentsDialog({
  open,
  onClose,
  onStyleChange,
  style: styleOverride,
}: InstrumentsDialogProps) {
  const settings = useEffectiveSettings();
  const updateSettings = useUpdateSettings();
  const currentStyle: Style = styleOverride ?? (settings.style as Style) ?? 'swing';

  const metronomeOn = settings.metronomeEnabled ?? true;
  const metronomeVolume = (settings.metronomeVolume as number) ?? 0.8;

  const roster = useMemo(() => getStyleProfile(currentStyle).instrumentRoster, [currentStyle]);
  const visibleGroups = useMemo(() => getVisibleInstrumentGroups(currentStyle), [currentStyle]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-sm overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Инструменты</DialogTitle>
          <DialogDescription>
            Настройка инструментов для стиля {getStyleProfile(currentStyle).name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 overflow-y-auto px-6 pb-6 pt-4">
          {/* Style selector row */}
          {onStyleChange && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => onStyleChange(s)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    s === currentStyle
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
                  )}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {/* Metronome */}
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3',
              !metronomeOn && 'opacity-50',
            )}
          >
            <MetronomeIcon className="size-5 shrink-0 text-muted-foreground" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">Метроном</span>
              </div>

              {metronomeOn && (
                <div className="mt-2 flex items-center gap-2">
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[metronomeVolume]}
                    onValueChange={(vals) =>
                      updateSettings.mutate({
                        metronomeVolume: vals[0],
                      } as Parameters<typeof updateSettings.mutate>[0])
                    }
                    className="flex-1"
                    aria-label="Громкость метронома"
                  />
                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                    {Math.round(metronomeVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                updateSettings.mutate({
                  metronomeEnabled: !metronomeOn,
                } as Parameters<typeof updateSettings.mutate>[0])
              }
              className={cn(
                'relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors',
                metronomeOn ? 'bg-primary' : 'bg-secondary',
              )}
              aria-label={metronomeOn ? 'Выключить метроном' : 'Включить метроном'}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                  metronomeOn ? 'left-[18px]' : 'left-0.5',
                )}
              />
            </button>
          </div>

          {visibleGroups.map((group) => {
            const isRequired = roster.required.includes(group.groupId);
            const isRecommended = roster.recommended.includes(group.groupId);
            const badge = isRequired ? 'required' : isRecommended ? 'recommended' : 'optional';

            return (
              <GroupRow
                key={group.groupId}
                group={group}
                style={currentStyle}
                rosterBadge={badge}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InstrumentsDialog;
