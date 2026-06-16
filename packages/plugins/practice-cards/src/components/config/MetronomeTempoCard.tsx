import { Card, CardContent, CardHeader, CardTitle, Checkbox, Label, Slider } from '@jazz/ui';

export interface MetronomeTempoCardProps {
  metronomeEnabled: boolean;
  metronomeVolume: number;
  tempo: number;
  onMetronomeEnabledChange: (v: boolean) => void;
  onMetronomeVolumeChange: (v: number) => void;
  onTempoChange: (v: number) => void;
}

export function MetronomeTempoCard({
  metronomeEnabled,
  metronomeVolume,
  tempo,
  onMetronomeEnabledChange,
  onMetronomeVolumeChange,
  onTempoChange,
}: MetronomeTempoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Метроном и темп</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={metronomeEnabled}
              onChange={(e) => onMetronomeEnabledChange(e.target.checked)}
            />
            Метроном
          </label>
          {metronomeEnabled && (
            <div className="flex flex-1 items-center gap-2">
              <Label className="text-xs text-muted-foreground">Громкость</Label>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[metronomeVolume]}
                onValueChange={(v) => onMetronomeVolumeChange(v[0] ?? 0.5)}
                className="w-24"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Темп</Label>
            <span className="text-sm font-medium tabular-nums text-foreground">{tempo} BPM</span>
          </div>
          <Slider
            min={40}
            max={300}
            step={1}
            value={[tempo]}
            onValueChange={(v) => onTempoChange(v[0] ?? 120)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
