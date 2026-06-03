import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ROOT_NOTES = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
type RootNote = (typeof ROOT_NOTES)[number];

const CHORD_TYPES = {
  Basic: [
    { symbol: '', label: 'Major' },
    { symbol: 'm', label: 'Minor' },
    { symbol: 'dim', label: 'Dim' },
    { symbol: 'aug', label: 'Aug' },
    { symbol: 'sus4', label: 'Sus4' },
    { symbol: 'sus2', label: 'Sus2' },
    { symbol: '6', label: '6th' },
    { symbol: 'm6', label: 'Min 6' },
  ],
  Jazz: [
    { symbol: 'maj7', label: 'Maj7' },
    { symbol: '7', label: 'Dom7' },
    { symbol: 'm7', label: 'Min7' },
    { symbol: 'm7b5', label: 'Half Dim' },
    { symbol: 'dim7', label: 'Dim7' },
    { symbol: 'maj9', label: 'Maj9' },
    { symbol: '9', label: 'Dom9' },
    { symbol: 'm9', label: 'Min9' },
  ],
  Extended: [
    { symbol: 'maj11', label: 'Maj11' },
    { symbol: '11', label: 'Dom11' },
    { symbol: 'm11', label: 'Min11' },
    { symbol: 'maj13', label: 'Maj13' },
    { symbol: '13', label: 'Dom13' },
    { symbol: '7#11', label: 'Lyd Dom' },
    { symbol: '7alt', label: 'Altered' },
    { symbol: '6/9', label: '6/9' },
  ],
} as const;

type Category = keyof typeof CHORD_TYPES;

interface ChordPaletteProps {
  selectedBarId: string | null;
  onAddChord: (symbol: string) => void;
}

export function ChordPalette({ selectedBarId, onAddChord }: ChordPaletteProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('Jazz');
  const [root, setRoot] = useState<RootNote>('C');
  const [collapsed, setCollapsed] = useState(false);

  const chords = CHORD_TYPES[category];
  const filtered = search
    ? chords.filter(
        (c) =>
          c.label.toLowerCase().includes(search.toLowerCase()) ||
          `${root}${c.symbol}`.toLowerCase().includes(search.toLowerCase()),
      )
    : chords;

  if (collapsed) {
    return (
      <div className="flex h-full w-8 flex-shrink-0 flex-col items-center border-r border-border bg-card pt-2">
        <button
          onClick={() => setCollapsed(false)}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Развернуть палитру"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-56 flex-shrink-0 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Chord Palette
          </p>
          <button
            onClick={() => setCollapsed(true)}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Свернуть палитру"
          >
            <ChevronLeft className="size-3" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-7 pl-6 text-xs"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 border-b border-border px-2 pt-1.5 pb-0">
        {(Object.keys(CHORD_TYPES) as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'flex-1 rounded-t-sm px-1.5 py-1 text-[11px] font-medium transition-colors',
              category === cat
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Root note selector */}
      <div className="border-b border-border px-3 py-2.5">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Root Note
        </p>
        <div className="grid grid-cols-4 gap-1">
          {ROOT_NOTES.slice(0, 12).map((note) => (
            <button
              key={note}
              onClick={() => setRoot(note)}
              className={cn(
                'rounded px-1 py-1 text-[11px] font-medium transition-colors',
                root === note
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {note}
            </button>
          ))}
        </div>
      </div>

      {/* Chord list */}
      <div className="flex-1 overflow-y-auto py-1">
        {!selectedBarId && (
          <p className="px-3 py-1.5 text-[10px] text-muted-foreground">
            Выберите такт, чтобы добавить аккорд
          </p>
        )}
        {filtered.map((chord) => {
          const full = `${root}${chord.symbol}`;
          return (
            <button
              key={chord.symbol}
              onClick={() => onAddChord(full)}
              disabled={!selectedBarId}
              className={cn(
                'flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors',
                selectedBarId
                  ? 'hover:bg-accent hover:text-accent-foreground cursor-pointer'
                  : 'opacity-50 cursor-not-allowed',
              )}
            >
              <span className="text-sm font-medium">{full}</span>
              <span className="text-[10px] text-muted-foreground">{chord.label}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">Нет совпадений</p>
        )}
      </div>
    </div>
  );
}
