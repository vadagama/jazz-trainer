import type { ReactNode, ComponentType, SVGProps } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Slider } from './slider';
import { cn } from './utils';
import {
  SaxophoneIcon,
  PianoIcon,
  RhodesIcon,
  ClarinetIcon,
  VibraphoneIcon,
  GuitarIcon,
  FluteIcon,
  TrumpetIcon,
} from './instrument-icons';

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

// ─── Icon mapping ────────────────────────────────────────────────────────────

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const TONE_ICONS: Record<string, IconComponent> = {
  'synth-default': SaxophoneIcon,
  'synth-lead': SaxophoneIcon,
  'piano-upright': PianoIcon,
  'piano-salamander': PianoIcon,
  'rhodes-jrhodes3c': RhodesIcon,
  clarinet: ClarinetIcon,
  vibraphone: VibraphoneIcon,
  'guitar-nylon': GuitarIcon,
  flute: FluteIcon,
  'trumpet-muted': TrumpetIcon,
};

function getToneIcon(id: string): IconComponent {
  return TONE_ICONS[id] ?? SaxophoneIcon;
}

// ─── SoloSettingsDialog ─────────────────────────────────────────────────────

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SaxophoneIcon className="size-5 text-primary" />
            Соло-инструмент
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Tone selection — grid of icon buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Инструмент</p>
            <div className="grid grid-cols-3 gap-2">
              {tones.map((tone) => {
                const Icon = getToneIcon(tone.id);
                const isSelected = selectedToneId === tone.id;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => onToneSelect(tone.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-7" />
                    <span className="text-xs leading-tight">{tone.name}</span>
                  </button>
                );
              })}
            </div>
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

// ─── Trigger button ─────────────────────────────────────────────────────────

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
