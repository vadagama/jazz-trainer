import { useState } from 'react';
import { Search, Eraser, Trash2 } from 'lucide-react';
import { Input, cn } from '@jazz/ui';

const ROOT_NOTES = ['C', 'C#', 'D', 'Db', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
type RootNote = (typeof ROOT_NOTES)[number];

const CHORD_GROUPS = [
  {
    id: 'major',
    label: 'MAJOR',
    chords: [
      { suffix: 'maj7', label: 'Maj 7' },
      { suffix: '', label: 'Major' },
      { suffix: 'maj9', label: 'Maj 9' },
      { suffix: '6', label: '6th' },
    ],
  },
  {
    id: 'minor',
    label: 'MINOR',
    chords: [
      { suffix: 'm7', label: 'Min 7' },
      { suffix: 'm', label: 'Minor' },
      { suffix: 'm9', label: 'Min 9' },
      { suffix: 'm6', label: 'Min 6' },
    ],
  },
  {
    id: 'dominant',
    label: 'DOMINANT',
    chords: [
      { suffix: '7', label: 'Dom 7' },
      { suffix: '9', label: 'Dom 9' },
      { suffix: '13', label: 'Dom 13' },
      { suffix: '7#11', label: 'Lyd Dom' },
    ],
  },
  {
    id: 'altdim',
    label: 'ALT / DIM',
    chords: [
      { suffix: '7alt', label: 'Altered' },
      { suffix: 'm7b5', label: 'Half Dim' },
      { suffix: 'dim7', label: 'Dim 7' },
      { suffix: '7b9', label: 'Dom ♭9' },
    ],
  },
] as const;

interface ChordPaletteProps {
  selectedBarId: string | null;
  onAddChord: (symbol: string) => void;
  onDeleteBar: () => void;
  onClearBar: () => void;
}

export function ChordPalette({
  selectedBarId: _selectedBarId,
  onAddChord,
  onDeleteBar,
  onClearBar,
}: ChordPaletteProps) {
  const [search, setSearch] = useState('');
  const [root, setRoot] = useState<RootNote>('C');

  const searchLower = search.toLowerCase();
  const allChords = CHORD_GROUPS.flatMap((g) =>
    g.chords.map((c) => ({ ...c, group: g.label, full: `${root}${c.suffix}` })),
  );
  const searchResults = search
    ? allChords.filter(
        (c) =>
          c.full.toLowerCase().includes(searchLower) ||
          c.label.toLowerCase().includes(searchLower),
      )
    : null;

  return (
    <div className="flex h-full w-[220px] flex-shrink-0 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Chord Palette</p>
        <p className="text-xs text-muted-foreground">Harmony Tools</p>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Chords..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Root note selector — compact horizontal scroll */}
      <div className="border-b border-border px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {ROOT_NOTES.map((note) => (
            <button
              key={note}
              onClick={() => setRoot(note)}
              className={cn(
                'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                root === note
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {note}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {searchResults ? (
          /* Search results */
          <div className="p-2">
            {searchResults.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Нет совпадений</p>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {searchResults.map((c) => (
                  <button
                    key={c.suffix}
                    onClick={() => onAddChord(c.full)}
                    className="rounded-md border border-border bg-secondary px-2 py-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    <span className="block font-semibold text-foreground">{c.full}</span>
                    <span className="text-[10px] text-muted-foreground">{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Grouped view */
          CHORD_GROUPS.map((group) => (
              <div key={group.id} className="border-b border-border px-3 py-3">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.chords.map((chord) => {
                    const full = `${root}${chord.suffix}`;
                    return (
                      <button
                        key={chord.suffix}
                        onClick={() => onAddChord(full)}
                        className="rounded-md border border-border bg-secondary px-2 py-2 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                      >
                        <span className="block text-sm font-semibold leading-tight text-foreground">
                          {full}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
          ))
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex gap-1.5 border-t border-border p-3">
        <button
          onClick={onClearBar}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Eraser className="size-3" />
          Очистить
        </button>
        <button
          onClick={onDeleteBar}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <Trash2 className="size-3" />
          Удалить
        </button>
      </div>
    </div>
  );
}
