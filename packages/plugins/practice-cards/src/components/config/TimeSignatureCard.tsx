import { TIME_SIGNATURES } from '@jazz/shared';
import type { TimeSignatureString } from '@jazz/shared';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@jazz/ui';

export interface TimeSignatureCardProps {
  value: TimeSignatureString;
  onChange: (v: TimeSignatureString) => void;
}

export function TimeSignatureCard({ value, onChange }: TimeSignatureCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Размер</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {TIME_SIGNATURES.map((sig) => (
            <button
              key={sig}
              type="button"
              onClick={() => onChange(sig)}
              className={cn(
                'min-w-[3rem] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                value === sig
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
              )}
            >
              {sig}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
