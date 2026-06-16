import { useState, useEffect, useCallback } from 'react';
import { parseDegreeGrid } from '@jazz/music-core';
import type { ChordSource } from '../../generators/types.js';

/**
 * Build a source-change payload based on the new type.
 * `defaultPatternId` is used when switching to 'pattern'.
 */
export function buildSourcePayload(
  type: ChordSource['type'],
  opts: {
    currentSource?: ChordSource;
    dslText: string;
    defaultPatternId: string;
    defaultKey: string;
  },
): { source: ChordSource } & Record<string, unknown> {
  const backingAllOn = {
    backingBass: true,
    backingDrums: true,
    backingPiano: true,
    backingRhodes: true,
  };

  switch (type) {
    case 'unified':
      return {
        source: {
          type: 'unified',
          symbols: opts.currentSource?.type === 'unified' ? opts.currentSource.symbols : [],
        },
      };
    case 'pattern':
      return {
        source: { type: 'pattern', patternId: opts.defaultPatternId },
        ...backingAllOn,
      };
    case 'dsl':
      return {
        source: { type: 'dsl', dsl: opts.dslText },
        ...backingAllOn,
      };
    default:
      return { source: { type: 'unified', symbols: [] } };
  }
}

export function useSourceConfig(initialSource?: ChordSource) {
  const [sourceType, setSourceType] = useState<ChordSource['type']>(
    initialSource?.type ?? 'unified',
  );
  const [dslText, setDslText] = useState(initialSource?.type === 'dsl' ? initialSource.dsl : '');
  const [dslError, setDslError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<
    { symbol: string; degree: number; quality: string }[][] | null
  >(null);

  const handleDslChange = useCallback((text: string) => {
    setDslText(text);
    const trimmed = text.trim();
    if (!trimmed) {
      setDslError(null);
      setParsedPreview(null);
      return;
    }
    const result = parseDegreeGrid(text);
    if (result.ok && result.value) {
      setDslError(null);
      setParsedPreview(result.value.bars.map((b) => b.slots));
    } else {
      const msg = result.errors.map((e) => e.message).join('; ');
      setDslError(msg || 'Ошибка парсинга DSL');
      setParsedPreview(null);
    }
  }, []);

  // Reset DSL state when switching away from DSL
  useEffect(() => {
    if (sourceType !== 'dsl') {
      setDslError(null);
      setParsedPreview(null);
    }
  }, [sourceType]);

  return {
    sourceType,
    setSourceType,
    dslText,
    setDslText,
    dslError,
    parsedPreview,
    handleDslChange,
  };
}
