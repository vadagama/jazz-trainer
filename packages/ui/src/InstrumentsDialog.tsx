import { useCallback, useMemo } from 'react';
import type { Style } from '@jazz/shared';
import { STYLES } from '@jazz/shared';
import { getStyleProfile, getVisibleInstrumentGroups, type DisplayGroup } from '@jazz/music-core';
import { useSettings, useUpdateSettings } from '@jazz/plugin-sdk';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Slider } from './slider';
import { cn } from './utils';
import { INSTRUMENT_ICONS } from './instrument-icons';

const STYLE_LABELS: Record<Style, string> = {
  swing: 'Swing',
  bossa: 'Bossa Nova',
  funk: 'Funk',
  latin: 'Latin',
  ballad: 'Ballad',
} as const;

export interface InstrumentsDialogProps {
  open: boolean;
  onClose: () => void;
  onStyleChange?: (style: Style) => void;
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
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const profile = useMemo(() => getStyleProfile(style), [style]);
  const defaults = profile.instrumentDefaults[group.activeInstrumentId];
  const prefix = group.settingsPrefix;

  const enabled =
    prefix && settings
      ? (settings as Record<string, unknown>)[`${prefix}Enabled`] !== false
      : defaults.enabled;

  const volume =
    prefix && settings
      ? (((settings as Record<string, unknown>)[`${prefix}Volume`] as number) ?? defaults.volume)
      : defaults.volume;

  const handleToggle = useCallback(() => {
    if (!prefix) return;
    updateSettings.mutate({
      [`${prefix}Enabled`]: !enabled,
    } as Parameters<typeof updateSettings.mutate>[0]);
  }, [prefix, enabled, updateSettings]);

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      if (!prefix) return;
      updateSettings.mutate({
        [`${prefix}Volume`]: value[0],
      } as Parameters<typeof updateSettings.mutate>[0]);
    },
    [prefix, updateSettings],
  );

  const Icon = INSTRUMENT_ICONS[group.activeInstrumentId];

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

export function InstrumentsDialog({ open, onClose, onStyleChange }: InstrumentsDialogProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const currentStyle: Style = (settings?.style as Style) ?? 'swing';

  const metronomeOn = settings?.metronomeEnabled ?? true;
  const metronomeVolume = (settings?.metronomeVolume as number) ?? 0.8;

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
