import type { CardMode } from '../../generators/types.js';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@jazz/ui';
import { CARD_MODES } from './configConstants.js';

export interface CardModeCardProps {
  value: CardMode;
  onChange: (v: CardMode) => void;
}

export function CardModeCard({ value, onChange }: CardModeCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Режим карточек</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {CARD_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange(m.value)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                value === m.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
