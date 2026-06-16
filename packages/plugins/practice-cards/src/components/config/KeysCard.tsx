import type { Key } from '@jazz/shared';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@jazz/ui';
import { FLAT_KEYS } from './configConstants.js';

export interface KeysCardProps {
  keys: Key[];
  onToggle: (key: Key) => void;
}

export function KeysCard({ keys, onToggle }: KeysCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Тональности</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {FLAT_KEYS.map((key) => {
            const active = keys.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggle(key)}
                className={cn(
                  'min-w-[2.5rem] rounded-md border px-2 py-1 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                {key}
              </button>
            );
          })}
        </div>
        {keys.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">Выберите хотя бы одну тональность</p>
        )}
      </CardContent>
    </Card>
  );
}
