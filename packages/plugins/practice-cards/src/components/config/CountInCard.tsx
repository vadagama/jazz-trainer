import { Card, CardContent, CardHeader, CardTitle, cn } from '@jazz/ui';
import { COUNT_IN_OPTS } from './configConstants.js';

export interface CountInCardProps {
  value: number;
  onChange: (v: number) => void;
}

export function CountInCard({ value, onChange }: CountInCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Затактов</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {COUNT_IN_OPTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                'min-w-[2.5rem] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                value === n
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
