import { Card, CardContent, CardHeader, CardTitle, Slider, cn } from '@jazz/ui';

export interface BarsPerUnitCardProps {
  value: number;
  label: string;
  onChange: (v: number) => void;
}

export function BarsPerUnitCard({ value, label, onChange }: BarsPerUnitCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Количество тактов</span>
          <span className="text-sm font-medium tabular-nums">{value}</span>
        </div>
        <div className="px-2">
          <Slider
            min={1}
            max={8}
            step={1}
            value={[value]}
            onValueChange={(v) => onChange(v[0] ?? 1)}
          />
          <div className="mt-1.5 flex justify-between px-px">
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className="flex flex-col items-center gap-1"
              >
                <span className="h-1.5 w-px bg-border" />
                <span
                  className={cn(
                    'text-[10px] tabular-nums transition-colors',
                    value === n ? 'font-medium text-primary' : 'text-muted-foreground',
                  )}
                >
                  {n}
                </span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
