import { Card, CardContent, CardHeader, CardTitle } from '@jazz/ui';
import { SourceTypeTabs } from './SourceTypeTabs.js';
import type { ChordSource } from '../../generators/types.js';
import type { ReactNode } from 'react';

export interface SourceCardProps {
  title: string;
  sourceType: ChordSource['type'];
  onSourceTypeChange: (type: ChordSource['type']) => void;
  children: ReactNode;
}

export function SourceCard({
  title,
  sourceType,
  onSourceTypeChange,
  children,
}: SourceCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SourceTypeTabs value={sourceType} onChange={onSourceTypeChange} />
        {children}
      </CardContent>
    </Card>
  );
}
