import { Card, CardContent, CardHeader, CardTitle } from '@jazz/ui';
import { BackingSelector, type BackingKey } from '../BackingSelector.js';

export interface BackingCardProps {
  // Accept any record with boolean values — callers pass their full config
  // and BackingSelector picks backing fields by key.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: Record<string, any>;
  onChange: (patch: Partial<Record<BackingKey, boolean>>) => void;
}

export function BackingCard({ values, onChange }: BackingCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Аккомпанемент</CardTitle>
      </CardHeader>
      <CardContent>
        <BackingSelector values={values} onChange={onChange} />
      </CardContent>
    </Card>
  );
}
