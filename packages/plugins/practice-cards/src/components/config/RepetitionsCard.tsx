import { Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label } from '@jazz/ui';

export interface RepetitionsCardProps {
  repetitions: number;
  infinite: boolean;
  onRepetitionsChange: (v: number) => void;
  onInfiniteChange: (v: boolean) => void;
  inputId?: string;
}

export function RepetitionsCard({
  repetitions,
  infinite,
  onRepetitionsChange,
  onInfiniteChange,
  inputId = 'reps-input',
}: RepetitionsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Повторы</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor={inputId} className="text-sm">
              Повторений
            </Label>
            <Input
              id={inputId}
              type="number"
              min={1}
              disabled={infinite}
              value={repetitions}
              onChange={(e) => onRepetitionsChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={infinite} onChange={(e) => onInfiniteChange(e.target.checked)} />
            Бесконечно
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
