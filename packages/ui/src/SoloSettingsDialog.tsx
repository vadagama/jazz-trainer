import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Slider } from './slider';
import { cn } from './utils';

/** Minimal shape for solo instrument manifest — only what this component needs. */
export interface SoloSettingsTone {
  id: string;
  name: string;
  category: 'synth' | 'sampled' | 'reuse';
}

export interface SoloSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tones: SoloSettingsTone[];
  selectedToneId: string | null;
  onToneSelect: (manifestId: string) => void;
  soloVolume: number;
  onSoloVolumeChange: (value: number) => void;
}

// ---------------------------------------------------------------------------
// Saxophone SVG icon
// ---------------------------------------------------------------------------

function SaxophoneIcon({ className }: { className?: string }) {
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
      {/* Bell (bottom-right, wider section) */}
      <path d="M18 8c0 4-2 7-4 7h-1c-2 0-4-3-4-7V4" />
      {/* Neck (curved top) */}
      <path d="M9 4C9 1 7 1 6 3l-1 3c-1 2 0 4 2 4h1" />
      {/* Mouthpiece */}
      <line x1="5" y1="2" x2="4" y2="1" />
      {/* Keys */}
      <circle cx="14" cy="11" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="9" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14" cy="7" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SoloSettingsDialog
// ---------------------------------------------------------------------------

const CATEGORIES: Array<{ key: SoloSettingsTone['category']; label: string }> = [
  { key: 'synth', label: 'Synth' },
  { key: 'reuse', label: 'Accomp. Reuse' },
  { key: 'sampled', label: 'Sampled' },
];

export function SoloSettingsDialog({
  open,
  onOpenChange,
  tones,
  selectedToneId,
  onToneSelect,
  soloVolume,
  onSoloVolumeChange,
}: SoloSettingsDialogProps): ReactNode {
  const volumePct = Math.round(soloVolume * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SaxophoneIcon className="size-5 text-primary" />
            Соло-инструмент
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Tone selection */}
          <div className="space-y-2">
            <label htmlFor="solo-tone-dialog" className="text-sm font-medium text-foreground">
              Инструмент
            </label>
            <select
              id="solo-tone-dialog"
              value={selectedToneId ?? ''}
              onChange={(e) => {
                const id = e.target.value;
                if (id) onToneSelect(id);
              }}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>
                Выберите тембр…
              </option>
              {CATEGORIES.map((cat) => {
                const catTones = tones.filter((t) => t.category === cat.key);
                if (catTones.length === 0) return null;
                return (
                  <optgroup key={cat.key} label={cat.label}>
                    {catTones.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Volume slider */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Громкость</label>
            <div className="flex items-center gap-3">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[volumePct]}
                onValueChange={(vals) => onSoloVolumeChange((vals[0] ?? volumePct) / 100)}
                className="flex-1"
                aria-label="Громкость соло"
              />
              <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                {volumePct}%
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Trigger button (saxophone icon, to be used in PlayerToolbar children)
// ---------------------------------------------------------------------------

export function SoloSettingsTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'rounded p-1.5 transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary',
        className,
      )}
      title="Настройки соло-инструмента"
      {...props}
    >
      <SaxophoneIcon className="size-5" />
    </button>
  );
}
