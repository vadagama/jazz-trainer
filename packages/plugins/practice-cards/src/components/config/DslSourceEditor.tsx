import type { Key } from '@jazz/shared';
import type { DegreeStep } from '@jazz/music-core';
import { Label, Textarea, cn } from '@jazz/ui';
import { expandDegree, prettyDegree } from '../degreeFunctions.js';
import { ChipSequence } from './ChipSequence.js';

export interface DslSourceEditorProps {
  dslText: string;
  dslError: string | null;
  parsedPreview: DegreeStep[][] | null;
  keys: Key[];
  onChange: (text: string) => void;
  textareaId?: string;
}

/** DSL-редактор с живым превью: ступени + раскрытие в первую тональность. */
export function DslSourceEditor({
  dslText,
  dslError,
  parsedPreview,
  keys,
  onChange,
  textareaId = 'dsl-input',
}: DslSourceEditorProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={textareaId}>Сетка (ступени)</Label>
      <Textarea
        id={textareaId}
        rows={4}
        value={dslText}
        onChange={(e) => onChange(e.target.value)}
        placeholder="| I6 | IIm7 V7 | Imaj7 |"
        className={cn(
          dslError && 'border-destructive focus-visible:ring-destructive',
          parsedPreview &&
            parsedPreview.length > 0 &&
            !dslError &&
            'border-green-500 focus-visible:ring-green-500',
        )}
      />
      {parsedPreview && parsedPreview.length > 0 && !dslError && (
        <div className="mt-2 space-y-2">
          <ChipSequence
            labels={parsedPreview.flatMap((bar) => bar.map((s) => prettyDegree(s.symbol)))}
            sep="|"
            variant="degree"
          />
          {keys.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
              <span className="mr-1 text-xs text-muted-foreground">В тональности {keys[0]}:</span>
              {parsedPreview.flatMap((bar) =>
                bar.map((step, ci) => (
                  <span key={`${ci}`} className="inline-flex items-center gap-0.5">
                    {ci > 0 && (
                      <span className="mx-0.5 select-none text-[10px] text-muted-foreground/50">
                        |
                      </span>
                    )}
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {expandDegree(step, keys[0]!)}
                    </span>
                  </span>
                )),
              )}
            </div>
          )}
        </div>
      )}
      {dslError && (
        <p className="text-xs text-destructive" role="alert">
          {dslError}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Формат:{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">| I6 | IIm7 V7 | Imaj7 |</code> —
        ступени римскими цифрами (I–VII), качество суффиксом (m7, maj7, 7, m7b5, 6). Хроматика — ♭/♯
        перед ступенью (♭II, ♯IV), вторичные доминанты — через слэш (V7/V). Такты разделены «|»,
        ступени внутри такта — пробелами или запятыми.
      </p>
    </div>
  );
}
