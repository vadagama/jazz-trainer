import { useComputerKeyboardStore } from '@jazz/plugin-sdk';
import { buildKeyMap } from '@jazz/music-core/audio';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const OCTAVE_RANGE = [1, 2, 3, 4, 5, 6, 7] as const;

export function ComputerKeyboardSettings() {
  const enabled = useComputerKeyboardStore((s) => s.enabled);
  const octave = useComputerKeyboardStore((s) => s.octave);
  const setEnabled = useComputerKeyboardStore((s) => s.setEnabled);
  const setOctave = useComputerKeyboardStore((s) => s.setOctave);

  const keyMap = buildKeyMap(octave);

  // Build a sorted list for display: white keys on bottom row, black keys above
  const entries = Object.entries(keyMap)
    .map(([key, midiNote]) => {
      const semitone = midiNote % 12;
      const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][semitone]!;
      const oct = Math.floor(midiNote / 12) - 1;
      const isBlack = [1, 3, 6, 8, 10].includes(semitone);
      return { key, midiNote, label: `${noteName}${oct}`, isBlack };
    })
    .sort((a, b) => a.midiNote - b.midiNote);

  // Group by white/black for layout
  const whiteKeys = entries.filter((e) => !e.isBlack);
  const blackKeys = entries.filter((e) => e.isBlack);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Клавиатура компьютера
          </CardTitle>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              {enabled ? 'Вкл' : 'Выкл'}
            </span>
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Octave selector */}
        <div className="flex items-center gap-3">
          <Label className="text-xs shrink-0">Октава:</Label>
          <select
            value={octave}
            onChange={(e) => setOctave(Number(e.target.value))}
            disabled={!enabled}
            className="rounded border bg-background px-2 py-1 text-xs"
          >
            {OCTAVE_RANGE.map((o) => (
              <option key={o} value={o}>
                C{o} – C{o + 1}
              </option>
            ))}
          </select>
        </div>

        {/* Key map visual */}
        <div className="space-y-1">
          {/* Black keys row */}
          <div className="flex h-8 items-end" style={{ paddingLeft: '1.05rem', paddingRight: '0.75rem' }}>
            {blackKeys.map((e) => (
              <div
                key={e.key}
                className="flex flex-1 flex-col items-center justify-end rounded-t bg-muted-foreground/30 pb-0.5 text-[10px] leading-tight"
                style={{ marginLeft: 3, marginRight: 3, minWidth: 0 }}
              >
                <span className="font-medium text-muted-foreground">{e.key.toUpperCase()}</span>
                <span className="text-[9px] text-muted-foreground/60">{e.label}</span>
              </div>
            ))}
          </div>

          {/* White keys row */}
          <div className="flex h-12">
            {whiteKeys.map((e) => (
              <div
                key={e.key}
                className="flex flex-1 flex-col items-center justify-end rounded-b border border-border bg-background pb-1"
              >
                <span className="text-xs font-medium">{e.key.toUpperCase()}</span>
                <span className="text-[10px] text-muted-foreground/60">{e.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Используйте клавиши на клавиатуре ноутбука для игры нот.
          Не работает, когда фокус в поле ввода.
        </p>
      </CardContent>
    </Card>
  );
}

// Simple inline label component to avoid importing from ui folder
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-medium ${className ?? ''}`}>{children}</span>;
}
