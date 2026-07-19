import { STYLES, TIME_SIGNATURES, KEYS, CATALOG_DIFFICULTIES, CATALOG_TAGS } from '@jazz/shared';
import type { CatalogDifficulty, CatalogTagCategory } from '@jazz/shared';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export interface CatalogFilterState {
  style: string[];
  timeSignature: string[];
  difficulty: string[];
  key: string[];
  tags: string[];
  author: string;
  tempoMin?: number;
  tempoMax?: number;
}

interface Props {
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
}

const DIFFICULTY_LABEL: Record<CatalogDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const STYLE_LABEL: Record<string, string> = {
  swing: 'Swing',
  bossa: 'Bossa',
  funk: 'Funk',
  latin: 'Latin',
  ballad: 'Ballad',
};

/** Group tag defs by category for display. */
const TAGS_BY_CATEGORY = CATALOG_TAGS.reduce(
  (acc, t) => {
    (acc[t.category] ??= []).push(t.value);
    return acc;
  },
  {} as Record<CatalogTagCategory, string[]>,
);

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
  renderLabel?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const isActive = selected.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
          isActive
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-muted-foreground hover:bg-accent'
        }`}
      >
        {label}
        {isActive && (
          <span className="rounded-full bg-primary/20 px-1.5 text-[10px]">{selected.length}</span>
        )}
        <ChevronDown className="size-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-48 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onToggle(opt)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent ${
                    checked ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  <span
                    className={`size-3.5 shrink-0 rounded border ${
                      checked ? 'border-primary bg-primary' : 'border-muted'
                    }`}
                  />
                  {renderLabel ? renderLabel(opt) : opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function CatalogFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelect
        label="Стиль"
        options={STYLES}
        selected={value.style}
        onToggle={(v) => onChange({ ...value, style: toggle(value.style, v) })}
        renderLabel={(v) => STYLE_LABEL[v] ?? v}
      />
      <MultiSelect
        label="Размер"
        options={TIME_SIGNATURES}
        selected={value.timeSignature}
        onToggle={(v) => onChange({ ...value, timeSignature: toggle(value.timeSignature, v) })}
      />
      <MultiSelect
        label="Уровень"
        options={CATALOG_DIFFICULTIES}
        selected={value.difficulty}
        onToggle={(v) => onChange({ ...value, difficulty: toggle(value.difficulty, v) })}
        renderLabel={(v) => DIFFICULTY_LABEL[v as CatalogDifficulty] ?? v}
      />
      <MultiSelect
        label="Тональность"
        options={KEYS}
        selected={value.key}
        onToggle={(v) => onChange({ ...value, key: toggle(value.key, v) })}
      />
      <MultiSelect
        label="Теги"
        options={Object.values(TAGS_BY_CATEGORY).flat()}
        selected={value.tags}
        onToggle={(v) => onChange({ ...value, tags: toggle(value.tags, v) })}
      />
      <input
        type="text"
        placeholder="Автор..."
        value={value.author}
        onChange={(e) => onChange({ ...value, author: e.target.value })}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}
