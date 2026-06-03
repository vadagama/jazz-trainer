import { useState } from 'react';
import { X, Plus, Trash2, ChevronRight } from 'lucide-react';
import { parseChord } from '@jazz/music-core';
import type { Bar } from '@jazz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface BarEditorProps {
  bar: Bar | null;
  barIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onAddChord: (symbol: string) => void;
  onRemoveChord: (index: number) => void;
  onUpdateChord: (index: number, symbol: string) => void;
  onUpdateBeats: (index: number, beats: number | null) => void;
  onRemoveBar: () => void;
  onClose: () => void;
}

export function BarEditor({
  bar,
  barIndex,
  isOpen,
  onToggle,
  onAddChord,
  onRemoveChord,
  onUpdateChord,
  onUpdateBeats,
  onRemoveBar,
  onClose,
}: BarEditorProps) {
  const [newChord, setNewChord] = useState('');
  const [newChordError, setNewChordError] = useState('');

  function validateChord(symbol: string): string {
    if (!symbol.trim()) return 'Введите символ аккорда';
    const res = parseChord(symbol.trim());
    if (!res.ok) return res.errors[0]?.message ?? 'Неизвестный аккорд';
    return '';
  }

  function handleAddChord() {
    const trimmed = newChord.trim();
    const err = validateChord(trimmed);
    if (err) {
      setNewChordError(err);
      return;
    }
    onAddChord(trimmed);
    setNewChord('');
    setNewChordError('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAddChord();
  }

  return (
    <div className="relative flex h-full flex-shrink-0">
      {/* Toggle button — always visible */}
      <button
        onClick={onToggle}
        title={isOpen ? 'Скрыть панель' : 'Показать панель'}
        className={cn(
          'absolute -left-3 top-6 z-10 flex size-6 items-center justify-center rounded-full',
          'border border-border bg-card shadow-sm text-muted-foreground',
          'transition-colors hover:text-foreground',
        )}
      >
        <ChevronRight
          className={cn('size-3.5 transition-transform', isOpen ? 'rotate-0' : 'rotate-180')}
        />
      </button>

      {/* Panel content */}
      <aside
        className={cn(
          'h-full overflow-hidden border-l border-border bg-card transition-all duration-200',
          isOpen ? 'w-64' : 'w-0 border-l-0',
        )}
        data-testid="bar-editor"
      >
        <div className="flex h-full w-64 flex-col gap-4 overflow-y-auto p-4">
          {bar ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Такт {barIndex + 1}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={onClose}
                  aria-label="Закрыть редактор"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Аккорды
                </p>

                {bar.chords.length === 0 && (
                  <p className="text-xs italic text-muted-foreground">Нет аккордов</p>
                )}

                {bar.chords.map((slot, i) => (
                  <ChordRow
                    key={i}
                    index={i}
                    slot={{ symbol: slot.symbol, beats: slot.beats ?? null }}
                    onUpdate={(sym) => onUpdateChord(i, sym)}
                    onUpdateBeats={(beats) => onUpdateBeats(i, beats)}
                    onRemove={() => onRemoveChord(i)}
                  />
                ))}
              </div>

              <div className="space-y-1">
                <Label htmlFor="new-chord" className="text-xs">
                  Добавить аккорд
                </Label>
                <div className="flex gap-1">
                  <Input
                    id="new-chord"
                    value={newChord}
                    onChange={(e) => {
                      setNewChord(e.target.value);
                      setNewChordError('');
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Cmaj7"
                    className="h-8 font-mono text-sm"
                    data-testid="new-chord-input"
                  />
                  <Button
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={handleAddChord}
                    aria-label="Добавить аккорд"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                {newChordError && (
                  <p className="text-xs text-destructive" data-testid="chord-error">
                    {newChordError}
                  </p>
                )}
              </div>

              <div className="mt-auto border-t border-border pt-3">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-1"
                  onClick={onRemoveBar}
                >
                  <Trash2 className="size-3.5" />
                  Удалить такт
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Свойства
              </p>
              <p className="text-xs text-muted-foreground">
                Выберите такт для редактирования
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

interface ChordRowProps {
  index: number;
  slot: { symbol: string; beats: number | null };
  onUpdate: (symbol: string) => void;
  onUpdateBeats: (beats: number | null) => void;
  onRemove: () => void;
}

function ChordRow({ index, slot, onUpdate, onUpdateBeats, onRemove }: ChordRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slot.symbol);
  const [error, setError] = useState('');

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(slot.symbol);
      setEditing(false);
      setError('');
      return;
    }
    const res = parseChord(trimmed);
    if (!res.ok) {
      setError(res.errors[0]?.message ?? 'Неизвестный аккорд');
      return;
    }
    onUpdate(trimmed);
    setEditing(false);
    setError('');
  }

  const isInvalid = slot.symbol && parseChord(slot.symbol).ok === false;

  return (
    <div className="flex items-center gap-1" data-testid={`chord-row-${index}`}>
      {editing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError('');
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(slot.symbol);
              setEditing(false);
              setError('');
            }
          }}
          className={cn('h-7 flex-1 font-mono text-xs', error && 'border-destructive')}
          title={error || undefined}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(slot.symbol);
            setEditing(true);
          }}
          className={cn(
            'flex-1 rounded border border-transparent px-2 py-1 text-left font-mono text-xs',
            'transition-colors hover:border-border hover:bg-accent/30',
            isInvalid && 'text-destructive',
          )}
          title="Нажмите для редактирования"
          data-testid={`chord-symbol-${index}`}
        >
          {slot.symbol}
        </button>
      )}

      <Input
        type="number"
        min={1}
        max={16}
        value={slot.beats ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onUpdateBeats(v === '' ? null : Math.max(1, parseInt(v, 10)));
        }}
        placeholder="—"
        className="h-7 w-12 p-1 text-center text-xs"
        title="Доли (пусто = авто)"
        aria-label={`Доли аккорда ${index + 1}`}
      />

      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 hover:text-destructive"
        onClick={onRemove}
        aria-label={`Удалить аккорд ${index + 1}`}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
